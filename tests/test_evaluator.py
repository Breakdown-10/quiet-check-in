from datetime import datetime, timezone, timedelta
import pytest
from backend.app.clock import VirtualClock
from backend.app.engine.models import Signal, SignalKind
from backend.app.engine.baseline import Anchor
from backend.app.engine.evaluator import (
    evaluate_circle_status,
    DeviationType,
    Severity
)


@pytest.fixture
def sample_circle():
    return {
        "circle_id": "circle_frank",
        "elder_name": "Frank",
        "timezone": "America/Phoenix",
        "offset_hours": -7.0,
        "away_until": None
    }


@pytest.fixture
def sample_anchor():
    # Frank usually gets the paper between 7:30 AM (450m) and 8:50 AM (530m)
    # Grace: 30 min -> Deadline: 9:20 AM (560m)
    return Anchor(
        anchor_id="anchor_paper",
        circle_id="circle_frank",
        device_id="doorbell_front",
        signal_kind=SignalKind.HUMAN_MOTION,
        name="Morning Paper Pickup",
        window_start_min=450,
        window_end_min=530,
        grace_min=30,
        reliability=0.90,
        support_days=18,
        total_days=20
    )


def test_normal_routine_completed(sample_circle, sample_anchor):
    # Virtual clock at 8:30 AM local time (15:30 UTC for UTC-7)
    sim_time_utc = datetime(2026, 10, 7, 15, 30, tzinfo=timezone.utc)
    clock = VirtualClock(sim_time_utc)

    # Signal occurred at 8:05 AM local time (485 minutes)
    signal = Signal(
        circle_id="circle_frank",
        device_id="doorbell_front",
        kind=SignalKind.HUMAN_MOTION,
        sub_type="human",
        ts_utc=datetime(2026, 10, 7, 15, 5, tzinfo=timezone.utc),
        local_minutes=485,
        request_id="req-today-1"
    )

    result = evaluate_circle_status(
        circle=sample_circle,
        anchors=[sample_anchor],
        signals_today=[signal],
        clock=clock
    )

    assert result.overall_status == "green"
    assert len([o for o in result.observations if not o.suppressed]) == 0
    assert result.active_anchors[0]["status"] == "completed"
    assert result.active_anchors[0]["has_occurred"] is True


def test_missed_anchor_past_deadline(sample_circle, sample_anchor):
    # Virtual clock at 9:30 AM local time (16:30 UTC), past deadline (9:20 AM / 560m)
    sim_time_utc = datetime(2026, 10, 7, 16, 30, tzinfo=timezone.utc)
    clock = VirtualClock(sim_time_utc)

    result = evaluate_circle_status(
        circle=sample_circle,
        anchors=[sample_anchor],
        signals_today=[],  # No signal today!
        clock=clock
    )

    assert result.overall_status == "amber"
    unsuppressed = [o for o in result.observations if not o.suppressed]
    assert len(unsuppressed) == 1
    obs = unsuppressed[0]
    assert obs.deviation_type == DeviationType.MISSED_ANCHOR
    assert obs.severity == Severity.MEDIUM
    assert "seen on 18 of 20 days" in obs.evidence_facts["support_text"]


def test_away_mode_suppresses_alerts(sample_circle, sample_anchor):
    # Set Away mode until next week
    sample_circle["away_until"] = "2026-10-14T00:00:00+00:00"
    sim_time_utc = datetime(2026, 10, 7, 16, 30, tzinfo=timezone.utc)
    clock = VirtualClock(sim_time_utc)

    result = evaluate_circle_status(
        circle=sample_circle,
        anchors=[sample_anchor],
        signals_today=[],
        clock=clock
    )

    # Away mode should suppress alerts, keeping status green
    assert result.overall_status == "green"
    unsuppressed = [o for o in result.observations if not o.suppressed]
    assert len(unsuppressed) == 0


def test_device_offline_suppresses_inactivity_alerts(sample_circle, sample_anchor):
    # Fast forward to 9:30 AM with device offline signal received earlier
    sim_time_utc = datetime(2026, 10, 7, 16, 30, tzinfo=timezone.utc)
    clock = VirtualClock(sim_time_utc)

    offline_signal = Signal(
        circle_id="circle_frank",
        device_id="doorbell_front",
        kind=SignalKind.DEVICE_OFFLINE,
        ts_utc=datetime(2026, 10, 7, 14, 0, tzinfo=timezone.utc),
        local_minutes=420,
        request_id="req-offline-1"
    )

    result = evaluate_circle_status(
        circle=sample_circle,
        anchors=[sample_anchor],
        signals_today=[],
        recent_signals_24h=[offline_signal],
        clock=clock
    )

    # Deviation for missed anchor must be marked suppressed due to offline device
    missed_obs = next((o for o in result.observations if o.deviation_type == DeviationType.MISSED_ANCHOR), None)
    assert missed_obs is not None
    assert missed_obs.suppressed is True
    assert "offline" in missed_obs.suppression_reason.lower()


def test_long_silence_detection(sample_circle, sample_anchor):
    # Fast forward to 17:00 PM local time (next day 00:00 UTC for UTC-7) with no signals since 7 AM (10 hours of silence)
    sim_time_utc = datetime(2026, 10, 8, 0, 0, tzinfo=timezone.utc)
    clock = VirtualClock(sim_time_utc)

    result = evaluate_circle_status(
        circle=sample_circle,
        anchors=[sample_anchor],
        signals_today=[],
        clock=clock
    )

    assert result.overall_status == "red"
    silence_obs = next((o for o in result.observations if o.deviation_type == DeviationType.LONG_SILENCE), None)
    assert silence_obs is not None
    assert silence_obs.severity == Severity.HIGH
    assert silence_obs.evidence_facts["hours_silent"] >= 8.0
