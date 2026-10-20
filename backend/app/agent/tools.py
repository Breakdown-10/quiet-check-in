from datetime import datetime, timezone, timedelta
from typing import Any
from backend.app.db.repositories import repo
from backend.app.clock import global_clock
from backend.app.engine.evaluator import evaluate_circle_status


def get_today_status(circle_id: str) -> dict[str, Any]:
    """Retrieve today's routine progress, completed anchors, and current status for an elder."""
    circle = repo.get_circle(circle_id)
    if not circle:
        return {"error": "Circle not found"}

    anchors = repo.get_anchors(circle_id)
    offset_hours = circle.get("offset_hours", -7.0)
    now_utc = global_clock.now()
    local_now = now_utc + timedelta(hours=offset_hours)
    local_midnight = datetime(local_now.year, local_now.month, local_now.day, 0, 0, 0)
    start_today_utc = (local_midnight - timedelta(hours=offset_hours)).replace(tzinfo=timezone.utc)

    signals_today = repo.get_signals_for_circle(circle_id, start_utc=start_today_utc, end_utc=now_utc)
    recent_signals = repo.get_recent_signals(circle_id, hours=24.0, as_of=now_utc)
    ack_anchors = repo.get_acknowledged_anchors(circle_id)

    eval_result = evaluate_circle_status(
        circle=circle,
        anchors=anchors,
        signals_today=signals_today,
        clock=global_clock,
        recent_signals_24h=recent_signals,
        acknowledged_anchors=ack_anchors
    )

    return {
        "elder_name": circle.get("elder_name"),
        "overall_status": eval_result.overall_status,
        "local_time": eval_result.local_time_str,
        "away_mode": circle.get("away_until") is not None,
        "active_anchors": eval_result.active_anchors,
        "events_count_today": len(signals_today)
    }


def get_anchor_explanation(circle_id: str, anchor_id: str) -> dict[str, Any]:
    """Look up historical statistical baseline evidence for a specific routine anchor."""
    anchors = repo.get_anchors(circle_id)
    anchor = next((a for a in anchors if a.anchor_id == anchor_id), None)
    if not anchor:
        return {"error": f"Anchor '{anchor_id}' not found"}

    return {
        "name": anchor.name,
        "device_id": anchor.device_id,
        "window": anchor.format_window(),
        "reliability_percentage": int(anchor.reliability * 100),
        "support_days": anchor.support_days,
        "total_days_analyzed": anchor.total_days,
        "evidence_summary": f"Observed on {anchor.support_days} of {anchor.total_days} comparable days"
    }


def get_recent_signals(circle_id: str, hours: float = 24.0) -> list[dict[str, Any]]:
    """Retrieve recent event timestamps and device labels."""
    circle = repo.get_circle(circle_id)
    offset = circle.get("offset_hours", -7.0) if circle else -7.0
    signals = repo.get_recent_signals(circle_id, hours=hours, as_of=global_clock.now())
    results = []
    for s in signals:
        loc_time = s.ts_utc + timedelta(hours=offset)
        results.append({
            "device": s.device_id,
            "kind": s.kind.value,
            "sub_type": s.sub_type,
            "local_time": loc_time.strftime("%I:%M %p")
        })
    return results


def acknowledge_alert(alert_id: str, action: str = "ok") -> dict[str, Any]:
    """Acknowledge an alert with feedback."""
    alert = repo.get_alert(alert_id)
    if not alert:
        return {"error": "Alert not found"}
    from backend.app.engine.escalation import EscalationManager
    mgr = EscalationManager(global_clock)
    updated, widening = mgr.process_acknowledgment(alert, action=action, ack_by="Family Chat")
    repo.store_alert(updated)
    return {"status": "acknowledged", "new_alert_status": updated.status.value}


def set_snooze(circle_id: str, anchor_id: str, minutes: int = 60) -> dict[str, Any]:
    """Snooze an anchor for a number of minutes."""
    repo.mark_anchor_acknowledged(circle_id, anchor_id)
    return {"status": "snoozed", "anchor_id": anchor_id, "minutes": minutes}


# Tool definitions catalog for Bedrock Converse API ToolSpec
AGENT_TOOL_SPECS = [
    {
        "toolSpec": {
            "name": "get_today_status",
            "description": "Check current daily routine status, completed anchors, and alerts for the elder.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "circle_id": {"type": "string", "description": "The care circle ID (e.g., 'circle_frank_phoenix')"}
                    },
                    "required": ["circle_id"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "get_recent_signals",
            "description": "Get the list of recent physical events (motions, door open/close) for the elder.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "circle_id": {"type": "string", "description": "The care circle ID"},
                        "hours": {"type": "number", "description": "Hours of history to retrieve (default: 24)"}
                    },
                    "required": ["circle_id"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "get_anchor_explanation",
            "description": "Get statistical evidence and normal window for an anchor.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "circle_id": {"type": "string", "description": "The care circle ID"},
                        "anchor_id": {"type": "string", "description": "The anchor ID"}
                    },
                    "required": ["circle_id", "anchor_id"]
                }
            }
        }
    }
]
