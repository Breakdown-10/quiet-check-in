from datetime import datetime, timezone, timedelta
import pytest
from backend.app.clock import VirtualClock
from backend.app.engine.evaluator import Observation, DeviationType, Severity
from backend.app.engine.escalation import (
    EscalationManager,
    EscalationLevel,
    AlertStatus,
    Alert
)


@pytest.fixture
def manager_and_clock():
    sim_time_utc = datetime(2026, 10, 7, 16, 30, tzinfo=timezone.utc)  # 9:30 AM Phoenix
    clock = VirtualClock(sim_time_utc)
    manager = EscalationManager(clock)
    return manager, clock


@pytest.fixture
def missed_anchor_observation():
    return Observation(
        deviation_type=DeviationType.MISSED_ANCHOR,
        severity=Severity.MEDIUM,
        anchor_id="anchor_paper",
        title="Missed Routine: Morning Paper",
        message_draft="Frank usually picks up the paper by 8:50. Nothing yet today.",
        evidence_facts={"elder_name": "Frank", "anchor_name": "Paper"}
    )


def test_initial_l1_escalation(manager_and_clock, missed_anchor_observation):
    manager, clock = manager_and_clock
    circle = {"circle_id": "c1", "offset_hours": -7.0}

    alert = manager.determine_escalation(
        observation=missed_anchor_observation,
        circle=circle,
        existing_alerts=[],
        primary_contact_name="Maya",
        secondary_contact_name="Sam"
    )

    assert alert is not None
    assert alert.level == EscalationLevel.L1_PRIMARY
    assert alert.recipient_name == "Maya"
    assert alert.status == AlertStatus.ACTIVE


def test_timeout_escalation_from_l1_to_l2(manager_and_clock, missed_anchor_observation):
    manager, clock = manager_and_clock
    circle = {"circle_id": "c1", "offset_hours": -7.0}

    # Initial L1 alert created at 9:30 AM
    initial_alert = manager.determine_escalation(
        observation=missed_anchor_observation,
        circle=circle,
        existing_alerts=[]
    )
    assert initial_alert.level == EscalationLevel.L1_PRIMARY

    # Fast-forward virtual clock by 50 minutes (past 45-minute timeout)
    clock.advance_minutes(50)

    escalated = manager.determine_escalation(
        observation=missed_anchor_observation,
        circle=circle,
        existing_alerts=[initial_alert],
        secondary_contact_name="Sam"
    )

    assert escalated is not None
    assert escalated.level == EscalationLevel.L2_SECONDARY
    assert escalated.recipient_name == "Sam"
    assert "Sam, could you look out next door" in escalated.message


def test_acknowledgment_safe_feedback(manager_and_clock, missed_anchor_observation):
    manager, clock = manager_and_clock
    circle = {"circle_id": "c1", "offset_hours": -7.0}

    alert = manager.determine_escalation(
        observation=missed_anchor_observation,
        circle=circle,
        existing_alerts=[]
    )

    # Maya taps "I called, all good"
    updated_alert, widening = manager.process_acknowledgment(alert, action="ok", ack_by="Maya")

    assert updated_alert.status == AlertStatus.ACKNOWLEDGED_SAFE
    assert updated_alert.acknowledged_by == "Maya"
    assert widening == 15  # Recommends widening anchor window by 15 min


def test_acknowledgment_cant_reach_escalation(manager_and_clock, missed_anchor_observation):
    manager, clock = manager_and_clock
    circle = {"circle_id": "c1", "offset_hours": -7.0}

    alert = manager.determine_escalation(
        observation=missed_anchor_observation,
        circle=circle,
        existing_alerts=[]
    )

    # Maya taps "Can't reach him" -> Immediate escalation
    updated_alert, widening = manager.process_acknowledgment(alert, action="cant_reach", ack_by="Maya")

    assert updated_alert.status == AlertStatus.ACKNOWLEDGED_ESCALATE
    assert updated_alert.level == EscalationLevel.L2_SECONDARY
    assert widening == 0


def test_quiet_hours_suppression(manager_and_clock, missed_anchor_observation):
    manager, clock = manager_and_clock
    circle = {"circle_id": "c1", "offset_hours": -7.0}

    # Set clock to 11:30 PM local time (06:30 UTC next day)
    night_time_utc = datetime(2026, 10, 8, 6, 30, tzinfo=timezone.utc)
    clock.set_time(night_time_utc)

    # L1 alert should be held until morning
    alert = manager.determine_escalation(
        observation=missed_anchor_observation,
        circle=circle,
        existing_alerts=[]
    )
    assert alert is None

    # High severity long silence breaks through quiet hours
    high_obs = Observation(
        deviation_type=DeviationType.LONG_SILENCE,
        severity=Severity.HIGH,
        title="High Severity",
        message_draft="Urgent check needed.",
        evidence_facts={"elder_name": "Frank"}
    )
    high_alert = manager.determine_escalation(
        observation=high_obs,
        circle=circle,
        existing_alerts=[]
    )
    assert high_alert is not None
    assert high_alert.level == EscalationLevel.L3_FAMILY_ACTION
