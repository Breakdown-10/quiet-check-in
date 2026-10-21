import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field
from backend.app.engine.evaluator import Observation, Severity, DeviationType
from backend.app.clock import Clock


class EscalationLevel(str, Enum):
    L0_IN_APP = "L0"        # In-app feed only ("Still early / grace")
    L1_PRIMARY = "L1"       # Primary family contact (Maya) gentle nudge
    L2_SECONDARY = "L2"     # Secondary contact / neighbor (Sam) check
    L3_FAMILY_ACTION = "L3" # Call / visit recommendation for all circle members


class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED_SAFE = "acknowledged_safe"      # "I called, all good"
    ACKNOWLEDGED_ESCALATE = "acknowledged_escalate" # "Can't reach him"
    AUTO_RESOLVED = "auto_resolved"              # "Routine resumed (activity detected)"
    EXPIRED = "expired"


class Alert(BaseModel):
    alert_id: str
    circle_id: str
    observation_id: Optional[str] = None
    level: EscalationLevel
    status: AlertStatus = AlertStatus.ACTIVE
    anchor_id: Optional[str] = None
    recipient_role: str
    recipient_name: str
    title: str
    message: str
    evidence_facts: dict[str, Any]
    created_at_utc: datetime
    last_escalated_at_utc: datetime
    acknowledged_by: Optional[str] = None
    acknowledged_at_utc: Optional[datetime] = None
    feedback: Optional[str] = None


class EscalationManager:
    """
    Deterministic escalation engine governing notification levels and timing.
    Strict architectural boundary: The LLM NEVER decides when or whether to escalate.
    """

    def __init__(self, clock: Clock):
        self.clock = clock

    def determine_escalation(
        self,
        observation: Observation,
        circle: dict,
        existing_alerts: list[Alert],
        primary_contact_name: Optional[str] = None,
        secondary_contact_name: Optional[str] = None,
        quiet_hours_start_min: int = 22 * 60,  # 10:00 PM
        quiet_hours_end_min: int = 7 * 60       # 7:00 AM
    ) -> Optional[Alert]:
        """
        Evaluate whether an observation triggers a new alert or escalates an existing one.
        Enforces quiet hours, suppression, and escalation timeouts.
        """
        if observation.suppressed:
            return None

        primary_contact_name = primary_contact_name or circle.get("primary_contact_name", "Maya")
        secondary_contact_name = secondary_contact_name or circle.get("secondary_contact_name", "Sam")

        now_utc = self.clock.now()
        offset_hours = circle.get("offset_hours", -7.0)
        local_dt = now_utc + timedelta(hours=offset_hours)
        local_minutes = local_dt.hour * 60 + local_dt.minute

        # Check quiet hours (10:00 PM - 07:00 AM)
        is_quiet_hours = (local_minutes >= quiet_hours_start_min) or (local_minutes < quiet_hours_end_min)

        # Look for existing active alert for this anchor or deviation
        matching_alert = next(
            (a for a in existing_alerts if a.anchor_id == observation.anchor_id and a.status == AlertStatus.ACTIVE),
            None
        )

        if matching_alert:
            # Check timeout escalation ladder
            elapsed_minutes = (now_utc - matching_alert.last_escalated_at_utc).total_seconds() / 60.0

            if matching_alert.level == EscalationLevel.L1_PRIMARY and elapsed_minutes >= 45.0:
                # Escalate L1 -> L2 after 45 minutes of silence
                matching_alert.level = EscalationLevel.L2_SECONDARY
                matching_alert.recipient_role = "secondary"
                matching_alert.recipient_name = secondary_contact_name
                matching_alert.last_escalated_at_utc = now_utc
                matching_alert.message = (
                    f"{primary_contact_name} hasn't responded to the check-in yet. {secondary_contact_name}, could you look out next door or check on {observation.evidence_facts.get('elder_name', 'him')}?"
                )
                return matching_alert

            elif matching_alert.level == EscalationLevel.L2_SECONDARY and elapsed_minutes >= 60.0:
                # Escalate L2 -> L3 after 60 more minutes
                matching_alert.level = EscalationLevel.L3_FAMILY_ACTION
                matching_alert.recipient_role = "all"
                matching_alert.recipient_name = "Family Circle"
                matching_alert.last_escalated_at_utc = now_utc
                matching_alert.message = (
                    f"Routine break unacknowledged. Consider calling or visiting {observation.evidence_facts.get('elder_name', 'him')}."
                )
                return matching_alert

            return None  # No state change yet

        # Create New Alert based on deviation type & severity
        if observation.deviation_type == DeviationType.OVERDUE_EARLY:
            level = EscalationLevel.L0_IN_APP
            recipient_role = "in_app"
            recipient_name = "Dashboard"
        elif observation.severity == Severity.HIGH:  # e.g., Long Silence
            level = EscalationLevel.L3_FAMILY_ACTION
            recipient_role = "all"
            recipient_name = "Family Circle"
        elif observation.deviation_type == DeviationType.MISSED_ANCHOR:
            level = EscalationLevel.L1_PRIMARY
            recipient_role = "primary"
            recipient_name = primary_contact_name
        else:
            level = EscalationLevel.L0_IN_APP
            recipient_role = "in_app"
            recipient_name = "Dashboard"

        # Quiet hours suppression for L0/L1
        if is_quiet_hours and level in (EscalationLevel.L0_IN_APP, EscalationLevel.L1_PRIMARY):
            # Held until morning
            return None

        new_alert = Alert(
            alert_id=f"alert_{uuid.uuid4().hex[:12]}",
            circle_id=circle.get("circle_id", ""),
            anchor_id=observation.anchor_id,
            level=level,
            recipient_role=recipient_role,
            recipient_name=recipient_name,
            title=observation.title,
            message=observation.message_draft,
            evidence_facts=observation.evidence_facts,
            created_at_utc=now_utc,
            last_escalated_at_utc=now_utc
        )
        return new_alert

    def process_acknowledgment(self, alert: Alert, action: str, ack_by: str) -> tuple[Alert, int]:
        """
        Handle user feedback on an alert.
        
        Returns:
            (updated_alert, window_widening_minutes)
        """
        now_utc = self.clock.now()
        alert.acknowledged_by = ack_by
        alert.acknowledged_at_utc = now_utc

        if action == "ok":
            # "I called, all good" -> False positive!
            # Mutes alert and returns +15 min window widening (bounded in caller)
            alert.status = AlertStatus.ACKNOWLEDGED_SAFE
            alert.feedback = "false_positive_routine_ok"
            widening_minutes = 15
        elif action == "cant_reach":
            # "Can't reach him" -> Valid alarm, escalate immediately!
            alert.status = AlertStatus.ACKNOWLEDGED_ESCALATE
            alert.feedback = "confirmed_deviation"
            alert.level = EscalationLevel.L2_SECONDARY
            alert.last_escalated_at_utc = now_utc
            alert.recipient_role = "secondary"
            widening_minutes = 0
        else:
            alert.status = AlertStatus.ACKNOWLEDGED_SAFE
            widening_minutes = 0

        return alert, widening_minutes
