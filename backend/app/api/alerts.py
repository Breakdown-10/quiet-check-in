from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.db.repositories import repo
from backend.app.clock import global_clock
from backend.app.engine.escalation import EscalationManager

router = APIRouter(prefix="/alerts", tags=["alerts"])
escalation_mgr = EscalationManager(global_clock)


class AcknowledgeRequest(BaseModel):
    action: str  # "ok" ("I called, all good") | "cant_reach" ("Can't reach him")
    ack_by: str = "Maya"


@router.get("/{circle_id}")
def list_alerts(circle_id: str):
    """List all alerts for a circle."""
    alerts = repo.get_alerts(circle_id)
    return {
        "circle_id": circle_id,
        "alerts": [a.model_dump() for a in alerts]
    }


@router.post("/{alert_id}/ack")
def acknowledge_alert(alert_id: str, req: AcknowledgeRequest):
    """
    Acknowledge an alert with user feedback:
    - 'ok' marks alert as false positive, mutes anchor for today, and widens anchor window by +15 min.
    - 'cant_reach' confirms deviation and escalates alert to secondary contact immediately.
    """
    alert = repo.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    updated_alert, widening_min = escalation_mgr.process_acknowledgment(
        alert=alert,
        action=req.action,
        ack_by=req.ack_by
    )
    repo.store_alert(updated_alert)

    # If false positive ("ok"), widen anchor window and mute anchor for today
    if req.action == "ok" and alert.anchor_id:
        repo.widen_anchor(alert.circle_id, alert.anchor_id, minutes=widening_min)
        repo.mark_anchor_acknowledged(alert.circle_id, alert.anchor_id)

    return {
        "status": "acknowledged",
        "alert_id": alert_id,
        "new_status": updated_alert.status.value,
        "new_level": updated_alert.level.value,
        "widening_applied_min": widening_min
    }
