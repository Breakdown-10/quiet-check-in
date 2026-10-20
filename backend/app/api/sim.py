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

    elif scenario == "morning_routine":
        # Simulate Frank's complete morning rhythm across multiple Ring sensors
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
        midnight_utc = (local_midnight - timedelta(hours=offset)).replace(tzinfo=timezone.utc)

        # 07:10 AM: Kitchen motion
        t0 = midnight_utc + timedelta(hours=7, minutes=10)
        raw_b0, _ = simulator.build_signed_webhook("motion_detected", "motion_kitchen", t0, sub_type="human")

        # 07:35 AM: Back patio door open/close
        t1 = midnight_utc + timedelta(hours=7, minutes=35)
        raw_b1, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_backdoor", t1)

        # 08:15 AM: Medicine cabinet open/close
        t_med = midnight_utc + timedelta(hours=8, minutes=15)
        raw_b_med, _ = simulator.build_signed_webhook("contact_sensor_faulted", "sensor_medicine", t_med)

        # 08:45 AM: Front doorbell motion
        t2 = midnight_utc + timedelta(hours=8, minutes=45)
        raw_b2, _ = simulator.build_signed_webhook("motion_detected", "doorbell_front", t2, sub_type="human")

        for raw_b in [raw_b0, raw_b1, raw_b_med, raw_b2]:
            payload = RingWebhookPayload.model_validate_json(raw_b.decode("utf-8"))
            sig = normalize_ring_payload(payload, circle_id=circle_id, timezone_offset_hours=offset)
            repo.store_signal(sig)

        return {"status": "morning_routine_emitted", "signals_added": 4}

    elif scenario == "skip_routine":
        # Fast forward virtual clock to 10:00 AM (past morning routines + 30m grace) without activity
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        target_local = datetime(local_now.year, local_now.month, local_now.day, 10, 0, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {
            "status": "fast_forwarded_past_deadline",
            "new_local_time": "10:00 AM",
            "note": "Morning routine deadlines passed without activity. Evaluator triggers gentle L1 check-in alert."
        }

    elif scenario == "escalate_l2":
        # Fast forward virtual clock to 11:15 AM (past deadline + 60m) to trigger L2 escalation
        now_utc = global_clock.now()
        local_now = now_utc + timedelta(hours=offset)
        target_local = datetime(local_now.year, local_now.month, local_now.day, 11, 15, 0)
        target_utc = (target_local - timedelta(hours=offset)).replace(tzinfo=timezone.utc)
        global_clock.set_time(target_utc)

        return {
            "status": "fast_forwarded_to_l2_escalation",
            "new_local_time": "11:15 AM",
            "note": "60+ minutes past deadline without ack. Escalator triggers L2 caregiver dispatch."
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

        # Set clock to 7:30 AM Phoenix time today
        today = datetime.now(timezone.utc).date()
        target_local = datetime(today.year, today.month, today.day, 7, 30, 0)
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

        return {"status": "reset_complete", "virtual_local_time": "07:30 AM"}


    return {"error": f"Unknown scenario: {scenario}"}
