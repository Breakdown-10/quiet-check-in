from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field
from backend.app.engine.models import Signal, SignalKind
from backend.app.engine.baseline import Anchor
from backend.app.clock import Clock


class DeviationType(str, Enum):
    NORMAL = "normal"
    OVERDUE_EARLY = "overdue_early"      # Past window end, but still within grace (L0)
    MISSED_ANCHOR = "missed_anchor"      # Past window end + grace (L1)
    LONG_SILENCE = "long_silence"        # No signals for 8+ hours during waking hours
    UNUSUAL_NIGHT = "unusual_night"      # Multiple signals in sleep window (00:00 - 05:00)
    DEVICE_HEALTH = "device_health"      # Device offline or silent


class Severity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Observation(BaseModel):
    """
    Evaluator observation record containing structured evidence facts.
    These facts are consumed by the AI narrator to write calm, factual messages.
    """
    deviation_type: DeviationType
    severity: Severity
    anchor_id: Optional[str] = None
    title: str
    message_draft: str
    evidence_facts: dict[str, Any]
    suppressed: bool = False
    suppression_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EvaluationResult(BaseModel):
    circle_id: str
    evaluated_at_utc: datetime
    local_time_str: str
    overall_status: str  # "green" | "amber" | "red"
    observations: list[Observation]
    active_anchors: list[dict[str, Any]]
    suppressed: bool = False


def evaluate_circle_status(
    circle: dict,
    anchors: list[Anchor],
    signals_today: list[Signal],
    clock: Clock,
    recent_signals_24h: Optional[list[Signal]] = None,
    snoozed_anchors: Optional[set[str]] = None,
    acknowledged_anchors: Optional[set[str]] = None
) -> EvaluationResult:
    """
    Pure evaluation function over (circle, anchors, signals_today, clock).
    Determines normal routine progress or detects deviations with full suppression logic.
    """
    now_utc = clock.now()
    offset_hours = circle.get("offset_hours", -7.0)
    local_dt = now_utc + timedelta(hours=offset_hours)
    local_minutes = local_dt.hour * 60 + local_dt.minute
    local_time_str = local_dt.strftime("%I:%M %p")

    snoozed_anchors = snoozed_anchors or set()
    acknowledged_anchors = acknowledged_anchors or set()
    recent_signals = recent_signals_24h or signals_today

    observations: list[Observation] = []
    elder_name = circle.get("elder_name", "Elder")

    # 1. Check Global Suppressors: Away Mode
    away_until = circle.get("away_until")
    is_away = False
    if away_until:
        try:
            away_dt = datetime.fromisoformat(away_until)
            if away_dt > now_utc:
                is_away = True
        except Exception:
            pass

    # 2. Check Global Suppressors: Device Offline in Lookback
    # If a device is offline, we cannot reliably detect inactivity ("can't tell" rule)
    offline_device_ids = {
        s.device_id for s in recent_signals if s.kind == SignalKind.DEVICE_OFFLINE
    }
    has_offline_device = len(offline_device_ids) > 0

    if has_offline_device:
        observations.append(Observation(
            deviation_type=DeviationType.DEVICE_HEALTH,
            severity=Severity.INFO,
            title="Device Offline Notice",
            message_draft=f"A Ring sensor is currently offline. Inactivity alerts are paused until connectivity is restored.",
            evidence_facts={
                "offline_devices": list(offline_device_ids),
                "elder_name": elder_name
            }
        ))

    # 3. Evaluate Each Anchor
    active_anchors_status = []
    
    for anchor in anchors:
        # Check if qualifying event has occurred today within or leading up to anchor
        matching_signals = [
            s for s in signals_today
            if s.device_id == anchor.device_id and s.kind == anchor.signal_kind
            and s.local_minutes >= (anchor.window_start_min - 30)
            and s.local_minutes <= anchor.deadline_min
        ]
        has_occurred = len(matching_signals) > 0

        anchor_info = {
            "anchor_id": anchor.anchor_id,
            "name": anchor.name,
            "window": anchor.format_window(),
            "has_occurred": has_occurred,
            "reliability": anchor.reliability,
            "support_days": anchor.support_days,
            "total_days": anchor.total_days
        }

        if has_occurred:
            anchor_info["status"] = "completed"
            active_anchors_status.append(anchor_info)
            continue

        # Check if anchor is overdue
        is_snoozed = anchor.anchor_id in snoozed_anchors
        is_ack = anchor.anchor_id in acknowledged_anchors

        if local_minutes > anchor.deadline_min:
            # Overdue past window end + grace -> Missed Anchor (L1 candidate)
            anchor_info["status"] = "missed"
            suppressed = is_away or has_offline_device or is_snoozed or is_ack
            reason = None
            if is_away:
                reason = "Elder is in Away mode"
            elif has_offline_device:
                reason = "Suppressed due to offline device"
            elif is_snoozed or is_ack:
                reason = "Already acknowledged by family"

            observations.append(Observation(
                deviation_type=DeviationType.MISSED_ANCHOR,
                severity=Severity.MEDIUM,
                anchor_id=anchor.anchor_id,
                title=f"Missed Routine: {anchor.name}",
                message_draft=f"{elder_name} usually completes {anchor.name} between {anchor.format_window()}. No event observed yet today.",
                evidence_facts={
                    "elder_name": elder_name,
                    "anchor_name": anchor.name,
                    "usual_window": anchor.format_window(),
                    "support_text": f"seen on {anchor.support_days} of {anchor.total_days} days",
                    "reliability_pct": int(anchor.reliability * 100),
                    "current_time": local_time_str,
                    "minutes_overdue": local_minutes - anchor.effective_end_min
                },
                suppressed=suppressed,
                suppression_reason=reason
            ))
        elif local_minutes > anchor.effective_end_min:
            # Inside grace window -> Still early (L0)
            anchor_info["status"] = "in_grace"
            suppressed = is_away or has_offline_device or is_snoozed or is_ack
            reason = None
            if is_away:
                reason = "Elder is in Away mode"
            elif has_offline_device:
                reason = "Suppressed due to offline device"
            elif is_snoozed or is_ack:
                reason = "Already acknowledged by family"

            observations.append(Observation(
                deviation_type=DeviationType.OVERDUE_EARLY,
                severity=Severity.LOW,
                anchor_id=anchor.anchor_id,
                title=f"Grace Window: {anchor.name}",
                message_draft=f"{elder_name}'s usual window ended, currently in {anchor.grace_min}-minute grace period.",
                evidence_facts={
                    "elder_name": elder_name,
                    "anchor_name": anchor.name,
                    "window": anchor.format_window(),
                    "grace_remaining": anchor.deadline_min - local_minutes
                },
                suppressed=suppressed,
                suppression_reason=reason
            ))
        else:
            anchor_info["status"] = "pending"

        active_anchors_status.append(anchor_info)

    # 4. Check for Long Silence during waking hours (07:00 - 22:00 = 420 - 1320 min)
    if not is_away and not has_offline_device:
        if 420 <= local_minutes <= 1320:
            waking_minutes_today = local_minutes - 420
            daytime_signals_today = [s for s in signals_today if s.local_minutes >= 420]
            if daytime_signals_today:
                last_day_sig = max(daytime_signals_today, key=lambda s: s.ts_utc)
                waking_silence_hours = (now_utc - last_day_sig.ts_utc).total_seconds() / 3600.0
            else:
                waking_silence_hours = waking_minutes_today / 60.0

            if waking_silence_hours >= 8.0:
                observations.append(Observation(
                    deviation_type=DeviationType.LONG_SILENCE,
                    severity=Severity.HIGH,
                    title="Extended Inactivity Detected",
                    message_draft=f"No motion or door activity detected for over {int(waking_silence_hours)} hours during daytime.",
                    evidence_facts={
                        "elder_name": elder_name,
                        "hours_silent": round(waking_silence_hours, 1),
                        "last_signal_time": last_day_sig.ts_utc.isoformat() if daytime_signals_today else "None today"
                    }
                ))

    # 5. Check for Unusual Night Activity (00:00 - 05:00 = 0 - 300 min)
    night_signals = [s for s in signals_today if 0 <= s.local_minutes <= 300]
    if len(night_signals) >= 3 and not is_away:
        observations.append(Observation(
            deviation_type=DeviationType.UNUSUAL_NIGHT,
            severity=Severity.MEDIUM,
            title="Unusual Night Activity",
            message_draft=f"Multiple events detected during usual sleeping hours ({len(night_signals)} events between 12 AM and 5 AM).",
            evidence_facts={
                "elder_name": elder_name,
                "night_events_count": len(night_signals),
                "times": [s.local_minutes for s in night_signals]
            }
        ))

    # Determine overall status badge
    active_unsuppressed = [o for o in observations if not o.suppressed]
    if any(o.severity == Severity.HIGH for o in active_unsuppressed):
        overall_status = "red"
    elif any(o.severity in (Severity.MEDIUM, Severity.LOW) for o in active_unsuppressed):
        overall_status = "amber"
    else:
        overall_status = "green"

    return EvaluationResult(
        circle_id=circle.get("circle_id", ""),
        evaluated_at_utc=now_utc,
        local_time_str=local_time_str,
        overall_status=overall_status,
        observations=observations,
        active_anchors=active_anchors_status,
        suppressed=is_away
    )
