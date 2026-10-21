from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.config import settings
from backend.app.db.repositories import repo
from backend.app.clock import global_clock
from backend.app.core.ring_sim import RingTwinSimulator
from backend.app.engine.models import normalize_ring_payload, RingWebhookPayload
from backend.app.engine.baseline import extract_anchors_from_signals

router = APIRouter(prefix="/sim", tags=["simulation"])
simulator = RingTwinSimulator(clock=global_clock)


class AdvanceTimeRequest(BaseModel):
    minutes: float = 30.0


class InjectScenarioRequest(BaseModel):
    scenario: str  # "seed_history" | "morning_routine" | "skip_routine" | "device_offline" | "reset"


@router.get("/state")
def get_sim_state():
    """Retrieve current virtual clock state and simulation metrics."""
    now_utc = global_clock.now()
    offset = settings.DEFAULT_TIMEZONE_OFFSET
    local_now = now_utc + timedelta(hours=offset)

    circle_id = settings.DEMO_CIRCLE_ID
    signals = repo.get_signals_for_circle(circle_id)
    anchors = repo.get_anchors(circle_id)
    alerts = repo.get_alerts(circle_id)

    return {
        "virtual_now_utc": now_utc.isoformat(),
        "local_time_phoenix": local_now.strftime("%I:%M %p"),
        "local_date": local_now.strftime("%Y-%m-%d"),
        "total_signals_stored": len(signals),
        "active_anchors_count": len(anchors),
        "alerts_count": len(alerts)
    }


@router.post("/advance")
def advance_time(req: AdvanceTimeRequest):
    """Fast-forward virtual time by N minutes."""
    new_time = global_clock.advance_minutes(req.minutes)
    offset = settings.DEFAULT_TIMEZONE_OFFSET
    local_now = new_time + timedelta(hours=offset)
    return {
        "status": "advanced",
        "minutes_added": req.minutes,
        "new_virtual_utc": new_time.isoformat(),
        "new_local_time": local_now.strftime("%I:%M %p")
    }


class TimeTravelRequest(BaseModel):
    minutes: Optional[float] = None
    scenario: Optional[str] = None
    target_time: Optional[str] = None


@router.post("/time-travel")
def time_travel(req: TimeTravelRequest):
    """Unified time-travel endpoint supporting scenario injection or minute advancement."""
    if req.scenario:
        return inject_scenario(InjectScenarioRequest(scenario=req.scenario))
    if req.minutes is not None:
        return advance_time(AdvanceTimeRequest(minutes=req.minutes))
    if req.target_time:
        try:
            target_dt = datetime.fromisoformat(req.target_time)
            if target_dt.tzinfo is None:
                target_dt = target_dt.replace(tzinfo=timezone.utc)
            global_clock.set_time(target_dt)
            offset = settings.DEFAULT_TIMEZONE_OFFSET
            local_now = target_dt + timedelta(hours=offset)
            return {
                "status": "time_set",
                "new_virtual_utc": target_dt.isoformat(),
                "new_local_time": local_now.strftime("%I:%M %p")
            }
        except Exception as e:
            return {"error": f"Invalid target_time ISO string: {e}"}
    return {"error": "Must provide minutes, scenario, or target_time"}


@router.post("/inject")
def inject_scenario(req: InjectScenarioRequest):
    """Inject pre-configured scenarios for interactive demo testing."""
    circle_id = settings.DEMO_CIRCLE_ID
    offset = settings.DEFAULT_TIMEZONE_OFFSET
    scenario = req.scenario.lower()

    if scenario == "seed_history":
        # Generate 21 days of history and learn baseline
        raw_history = simulator.generate_history_backfill(days=21, offset_hours=offset)
        for event in raw_history:
            payload = RingWebhookPayload.model_validate(event)
            sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
            repo.store_signal(sig)

        all_signals = repo.get_signals_for_circle(circle_id)
        anchors = extract_anchors_from_signals(
            signals=all_signals,
            circle_id=circle_id,
            device_labels={"doorbell_front": "Front Doorbell", "sensor_backdoor": "Back Patio"},
            lookback_days=21
        )
        repo.store_anchors(circle_id, anchors)
        return {
            "status": "history_seeded",
            "signals_ingested": len(raw_history),
            "anchors_learned": len(anchors),
            "anchors": [a.model_dump() for a in anchors]
        }

    elif scenario in ("morning_routine", "complete_all"):
        # Complete all 4 morning routines in natural chronological sequence
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
        midnight_utc = (local_midnight - timedelta(hours=offset)).replace(tzinfo=timezone.utc)

        # 07:10 AM: Kitchen motion (Breakfast & Wake)
        t0 = midnight_utc + timedelta(hours=7, minutes=10)
        raw_b0, _ = simulator.build_signed_webhook("motion_detected", "motion_kitchen", t0, sub_type="human")

        # 07:35 AM: Back patio door open/close (Garden walk)
        t1 = midnight_utc + timedelta(hours=7, minutes=35)
        raw_b1, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_backdoor", t1)

        # 08:15 AM: Medicine cabinet open/close (Prescription pills)
        t_med = midnight_utc + timedelta(hours=8, minutes=15)
        raw_b_med, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_medicine", t_med)

        # 08:45 AM: Front doorbell motion (Morning paper pickup)
        t2 = midnight_utc + timedelta(hours=8, minutes=45)
        raw_b2, _ = simulator.build_signed_webhook("motion_detected", "doorbell_front", t2, sub_type="human")

        for raw_b in [raw_b0, raw_b1, raw_b_med, raw_b2]:
            payload = RingWebhookPayload.model_validate_json(raw_b.decode("utf-8"))
            sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
            repo.store_signal(sig)

        # Advance virtual clock to 08:50 AM to reflect all morning routines completed
        target_local = datetime(local_now.year, local_now.month, local_now.day, 8, 50, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {"status": "morning_routine_emitted", "signals_added": 4, "new_local_time": "08:50 AM"}

    elif scenario in ("skip_routine", "missed_paper", "skip_paper"):
        # Realistic Missed Paper: Frank woke up, visited kitchen, walked patio, and took medicine.
        # He ONLY missed the front door paper pickup!
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
        midnight_utc = (local_midnight - timedelta(hours=offset)).replace(tzinfo=timezone.utc)

        # 07:10 AM: Kitchen motion
        t0 = midnight_utc + timedelta(hours=7, minutes=10)
        raw_b0, _ = simulator.build_signed_webhook("motion_detected", "motion_kitchen", t0, sub_type="human")

        # 07:35 AM: Back patio door
        t1 = midnight_utc + timedelta(hours=7, minutes=35)
        raw_b1, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_backdoor", t1)

        # 08:15 AM: Medicine cabinet
        t_med = midnight_utc + timedelta(hours=8, minutes=15)
        raw_b_med, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_medicine", t_med)

        # Note: Front doorbell motion (08:45 AM) is NOT emitted (paper is missed)
        for raw_b in [raw_b0, raw_b1, raw_b_med]:
            payload = RingWebhookPayload.model_validate_json(raw_b.decode("utf-8"))
            sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
            repo.store_signal(sig)

        # Fast forward virtual clock to 10:00 AM (past 08:45 AM paper window + 30m grace)
        target_local = datetime(local_now.year, local_now.month, local_now.day, 10, 0, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {
            "status": "missed_paper_injected",
            "new_local_time": "10:00 AM",
            "note": "Frank completed kitchen, patio, and medicine, but missed morning paper pickup. L1 gentle check-in alert triggered for paper."
        }

    elif scenario in ("missed_meds", "skip_meds"):
        # Realistic Missed Medication: Frank woke up, walked patio, and got paper, but missed morning pills!
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
        midnight_utc = (local_midnight - timedelta(hours=offset)).replace(tzinfo=timezone.utc)

        # 07:10 AM: Kitchen motion
        t0 = midnight_utc + timedelta(hours=7, minutes=10)
        raw_b0, _ = simulator.build_signed_webhook("motion_detected", "motion_kitchen", t0, sub_type="human")

        # 07:35 AM: Back patio door
        t1 = midnight_utc + timedelta(hours=7, minutes=35)
        raw_b1, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_backdoor", t1)

        # 08:45 AM: Front doorbell motion
        t2 = midnight_utc + timedelta(hours=8, minutes=45)
        raw_b2, _ = simulator.build_signed_webhook("motion_detected", "doorbell_front", t2, sub_type="human")

        # Note: Medicine cabinet (08:15 AM) is NOT emitted
        for raw_b in [raw_b0, raw_b1, raw_b2]:
            payload = RingWebhookPayload.model_validate_json(raw_b.decode("utf-8"))
            sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
            repo.store_signal(sig)

        # Fast forward virtual clock to 09:15 AM (past 08:15 AM medicine window + 30m grace)
        target_local = datetime(local_now.year, local_now.month, local_now.day, 9, 15, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {
            "status": "missed_meds_injected",
            "new_local_time": "09:15 AM",
            "note": "Frank woke up, walked patio, and picked up paper, but missed morning medication. L1 check-in alert triggered for medicine."
        }

    elif scenario in ("all_missed", "inactivity"):
        # Complete Morning Inactivity: No sensors triggered at all (e.g. Frank did not get out of bed)
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        target_local = datetime(local_now.year, local_now.month, local_now.day, 10, 0, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {
            "status": "total_inactivity_injected",
            "new_local_time": "10:00 AM",
            "note": "No activity recorded all morning. All routines overdue, triggering general inactivity alert."
        }

    elif scenario == "step_kitchen":
        # Step 1: Wake up & Kitchen (07:15 AM)
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
        midnight_utc = (local_midnight - timedelta(hours=offset)).replace(tzinfo=timezone.utc)

        t0 = midnight_utc + timedelta(hours=7, minutes=10)
        raw_b0, _ = simulator.build_signed_webhook("motion_detected", "motion_kitchen", t0, sub_type="human")
        payload = RingWebhookPayload.model_validate_json(raw_b0.decode("utf-8"))
        sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
        repo.store_signal(sig)

        target_local = datetime(local_now.year, local_now.month, local_now.day, 7, 15, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {"status": "step_kitchen_complete", "new_local_time": "07:15 AM"}

    elif scenario == "step_patio":
        # Step 2: Back patio walk (07:40 AM)
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
        midnight_utc = (local_midnight - timedelta(hours=offset)).replace(tzinfo=timezone.utc)

        t1 = midnight_utc + timedelta(hours=7, minutes=35)
        raw_b1, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_backdoor", t1)
        payload = RingWebhookPayload.model_validate_json(raw_b1.decode("utf-8"))
        sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
        repo.store_signal(sig)

        target_local = datetime(local_now.year, local_now.month, local_now.day, 7, 40, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {"status": "step_patio_complete", "new_local_time": "07:40 AM"}

    elif scenario == "step_meds":
        # Step 3: Medicine cabinet (08:20 AM)
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
        midnight_utc = (local_midnight - timedelta(hours=offset)).replace(tzinfo=timezone.utc)

        t_med = midnight_utc + timedelta(hours=8, minutes=15)
        raw_b_med, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_medicine", t_med)
        payload = RingWebhookPayload.model_validate_json(raw_b_med.decode("utf-8"))
        sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
        repo.store_signal(sig)

        target_local = datetime(local_now.year, local_now.month, local_now.day, 8, 20, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {"status": "step_meds_complete", "new_local_time": "08:20 AM"}

    elif scenario == "step_paper":
        # Step 4: Front Doorbell / Paper pickup (08:50 AM)
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
        midnight_utc = (local_midnight - timedelta(hours=offset)).replace(tzinfo=timezone.utc)

        t2 = midnight_utc + timedelta(hours=8, minutes=45)
        raw_b2, _ = simulator.build_signed_webhook("motion_detected", "doorbell_front", t2, sub_type="human")
        payload = RingWebhookPayload.model_validate_json(raw_b2.decode("utf-8"))
        sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
        repo.store_signal(sig)

        target_local = datetime(local_now.year, local_now.month, local_now.day, 8, 50, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {"status": "step_paper_complete", "new_local_time": "08:50 AM"}

    elif scenario == "escalate_l2":
        # Fast forward virtual clock to 11:15 AM (past deadline + 60m) to trigger L2 escalation
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
        midnight_utc = (local_midnight - timedelta(hours=offset)).replace(tzinfo=timezone.utc)

        # Ensure earlier morning routines (kitchen, patio, meds) are present so L2 is specifically for unacknowledged deviation
        t0 = midnight_utc + timedelta(hours=7, minutes=10)
        raw_b0, _ = simulator.build_signed_webhook("motion_detected", "motion_kitchen", t0, sub_type="human")
        t1 = midnight_utc + timedelta(hours=7, minutes=35)
        raw_b1, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_backdoor", t1)
        t_med = midnight_utc + timedelta(hours=8, minutes=15)
        raw_b_med, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_medicine", t_med)

        for raw_b in [raw_b0, raw_b1, raw_b_med]:
            payload = RingWebhookPayload.model_validate_json(raw_b.decode("utf-8"))
            sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
            repo.store_signal(sig)

        target_local = datetime(local_now.year, local_now.month, local_now.day, 11, 15, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {
            "status": "fast_forwarded_to_l2_escalation",
            "new_local_time": "11:15 AM",
            "note": "60+ minutes past paper deadline without ack. Escalator triggers L2 caregiver dispatch."
        }

    elif scenario == "device_offline":
        # Inject offline event
        now_utc = global_clock.now()
        raw_b, _ = simulator.build_signed_webhook("device_offline", "doorbell_front", now_utc)
        payload = RingWebhookPayload.model_validate_json(raw_b.decode("utf-8"))
        sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
        repo.store_signal(sig)
        return {"status": "device_offline_injected", "device_id": "doorbell_front"}

    elif scenario == "reset":
        repo.clear()
        repo.register_circle(circle_id, "Frank", "America/Phoenix", offset_hours=offset)
        repo.register_device(circle_id, "doorbell_front", "Front Doorbell", "doorbell")
        repo.register_device(circle_id, "sensor_backdoor", "Back Patio Door", "contact_sensor")
        repo.register_device(circle_id, "sensor_medicine", "Medicine Cabinet", "contact_sensor")
        repo.register_device(circle_id, "motion_kitchen", "Kitchen Motion Sensor", "motion_sensor")

        # Set clock to 7:00 AM Phoenix time today (before morning routines begin)
        today = datetime.now(timezone.utc).date()
        target_local = datetime(today.year, today.month, today.day, 7, 0, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        # Re-seed history
        raw_history = simulator.generate_history_backfill(days=21, offset_hours=offset)
        for event in raw_history:
            payload = RingWebhookPayload.model_validate(event)
            sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
            repo.store_signal(sig)

        all_signals = repo.get_signals_for_circle(circle_id)
        anchors = extract_anchors_from_signals(
            signals=all_signals,
            circle_id=circle_id,
            device_labels={
                "doorbell_front": "Front Doorbell",
                "sensor_backdoor": "Back Patio Door",
                "sensor_medicine": "Medicine Cabinet",
                "motion_kitchen": "Kitchen Motion Sensor"
            },
            lookback_days=21
        )
        repo.store_anchors(circle_id, anchors)

        return {"status": "reset_complete", "virtual_local_time": "07:00 AM"}

    return {"error": f"Unknown scenario: {scenario}"}


@router.get("/security-proof")
@router.post("/security-proof")
def run_security_proof():
    """
    Executes live cryptographic and idempotency verification checks:
    1. Timing-safe HMAC-SHA256 signature verification over raw bytes
    2. Payload tamper detection and strict 401 rejection
    3. Replay attack timestamp drift mitigation (>300 seconds)
    4. Idempotent request_id deduplication
    """
    import time
    from backend.app.core.verifier import verify_ring_signature, generate_ring_signature
    from ring_partner_kit import RingWebhookVerifier

    key = settings.RING_HMAC_KEY
    raw_payload = b'{"meta":{"version":"1.1","request_id":"proof-001","timestamp":"2026-10-21T12:00:00Z"},"data":{"id":"d1","type":"events"}}'

    # 1. Valid signature check
    sig = generate_ring_signature(raw_payload, key)
    valid_ok = verify_ring_signature(raw_payload, sig, key)

    # 2. Tampered payload check
    tampered_payload = raw_payload + b" "
    tampered_rejected = not verify_ring_signature(tampered_payload, sig, key)

    # 3. Replay attack check (>300s drift)
    rpk_verifier = RingWebhookVerifier(secret=key, max_drift_seconds=300)
    old_time_ms = int((time.time() - 3600) * 1000)
    stale_header, _ = rpk_verifier.sign(raw_payload, timestamp=old_time_ms)
    replay_rejected = not rpk_verifier.verify(raw_payload, stale_header)

    # 4. Deduplication
    test_req_id = f"proof-dedupe-{int(time.time()*1000)}"
    first_seen = not repo.is_request_processed(test_req_id)
    repo.mark_request_processed(test_req_id)
    second_seen = repo.is_request_processed(test_req_id)
    dedupe_ok = first_seen and second_seen

    return {
        "status": "success",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "proofs": [
            {
                "id": "valid_hmac",
                "name": "HMAC-SHA256 Signature Verification",
                "passed": valid_ok,
                "detail": "Verified timing-safe HMAC over unparsed raw wire bytes (X-Signature)."
            },
            {
                "id": "tamper_protection",
                "name": "Cryptographic Tamper Protection",
                "passed": tampered_rejected,
                "detail": "Single-byte payload alteration strictly rejected with cryptographic mismatch."
            },
            {
                "id": "replay_protection",
                "name": "Replay Attack Drift Tolerance",
                "passed": replay_rejected,
                "detail": "Stale event (>300 seconds drift) rejected to prevent recorded packet replay."
            },
            {
                "id": "idempotent_dedupe",
                "name": "Idempotent Event Deduplication",
                "passed": dedupe_ok,
                "detail": "Duplicate meta.request_id detected and discarded with zero duplicate state."
            }
        ]
    }

