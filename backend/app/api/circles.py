from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from backend.app.config import settings
from backend.app.db.repositories import repo
from backend.app.clock import global_clock
from backend.app.engine.evaluator import evaluate_circle_status
from backend.app.engine.baseline import extract_anchors_from_signals
from backend.app.engine.escalation import EscalationManager

router = APIRouter(prefix="/circles", tags=["circles"])
escalation_mgr = EscalationManager(global_clock)


class AwayModeRequest(BaseModel):
    away_until: Optional[str] = None  # ISO timestamp


class UpdateCircleRequest(BaseModel):
    elder_name: Optional[str] = None
    age: Optional[int] = None
    city: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    secondary_contact_name: Optional[str] = None
    secondary_contact_email: Optional[str] = None
    default_grace_min: Optional[int] = None


class UpdateAnchorRequest(BaseModel):
    name: Optional[str] = None
    grace_min: Optional[int] = None


@router.get("/{circle_id}/today")
@router.get("/{circle_id}/status")
def get_today_status(circle_id: str):
    """
    Returns today's routine status card (green/amber/red), active anchors,
    detected deviations, and active alerts.
    """
    circle = repo.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Care circle not found")

    anchors = repo.get_anchors(circle_id)
    offset_hours = circle.get("offset_hours", -7.0)
    now_utc = global_clock.now()
    local_now = now_utc + timedelta(hours=offset_hours)

    # Local midnight today in UTC
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

    # Process observations through escalation ladder
    existing_alerts = repo.get_alerts(circle_id)
    for obs in eval_result.observations:
        new_or_escalated = escalation_mgr.determine_escalation(
            observation=obs,
            circle=circle,
            existing_alerts=existing_alerts
        )
        if new_or_escalated:
            repo.store_alert(new_or_escalated)

    current_alerts = [a.model_dump() for a in repo.get_alerts(circle_id)]

    return {
        "circle_id": circle_id,
        "elder_name": circle.get("elder_name"),
        "age": circle.get("age", 78),
        "city": circle.get("city", "Phoenix, AZ"),
        "primary_contact_name": circle.get("primary_contact_name", "Maya"),
        "primary_contact_email": circle.get("primary_contact_email", "maya@family.local"),
        "secondary_contact_name": circle.get("secondary_contact_name", "Dr. Aris (Neighbor)"),
        "secondary_contact_email": circle.get("secondary_contact_email", "neighbor@local.net"),
        "default_grace_min": circle.get("default_grace_min", 30),
        "overall_status": eval_result.overall_status,
        "local_time": eval_result.local_time_str,
        "mode": circle.get("mode", "SIM"),
        "away_until": circle.get("away_until"),
        "observations": [o.model_dump() for o in eval_result.observations],
        "active_anchors": eval_result.active_anchors,
        "alerts": current_alerts,
        "signal_count_today": len(signals_today)
    }


@router.get("/{circle_id}/timeline")
def get_timeline(circle_id: str, day: Optional[str] = Query(None)):
    """Retrieve signals for today or a specific date formatted for visual display."""
    circle = repo.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Care circle not found")

    offset_hours = circle.get("offset_hours", -7.0)
    now_utc = global_clock.now()

    if day:
        target_date = datetime.strptime(day, "%Y-%m-%d").date()
    else:
        target_date = (now_utc + timedelta(hours=offset_hours)).date()

    local_midnight = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
    start_utc = (local_midnight - timedelta(hours=offset_hours)).replace(tzinfo=timezone.utc)
    end_utc = start_utc + timedelta(days=1)

    signals = repo.get_signals_for_circle(circle_id, start_utc=start_utc, end_utc=end_utc)

    timeline_items = []
    for s in signals:
        loc_time = s.ts_utc + timedelta(hours=offset_hours)
        timeline_items.append({
            "device_id": s.device_id,
            "kind": s.kind.value,
            "sub_type": s.sub_type,
            "time_str": loc_time.strftime("%I:%M %p"),
            "local_minutes": s.local_minutes,
            "iso_time": s.ts_utc.isoformat()
        })

    return {
        "circle_id": circle_id,
        "date": target_date.isoformat(),
        "total_events": len(timeline_items),
        "events": timeline_items
    }


@router.get("/{circle_id}/baseline")
def get_baseline(circle_id: str):
    """Retrieve learned routine anchors and explainability evidence."""
    circle = repo.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Care circle not found")

    anchors = repo.get_anchors(circle_id)
    formatted = []
    for a in anchors:
        formatted.append({
            "anchor_id": a.anchor_id,
            "name": a.name,
            "device_id": a.device_id,
            "window": a.format_window(),
            "window_start_min": a.window_start_min,
            "window_end_min": a.effective_end_min,
            "grace_min": a.grace_min,
            "reliability_pct": int(a.reliability * 100),
            "support_days": a.support_days,
            "total_days": a.total_days,
            "evidence": f"Usually {a.format_window()}, seen on {a.support_days} of {a.total_days} days"
        })

    return {
        "circle_id": circle_id,
        "elder_name": circle.get("elder_name"),
        "anchors": formatted
    }


@router.post("/{circle_id}/away")
def set_away(circle_id: str, req: AwayModeRequest):
    """Enable Elder Away mode (suppresses alerts until resumed)."""
    circle = repo.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Care circle not found")

    repo.set_away_mode(circle_id, req.away_until)
    return {"status": "away_mode_active", "away_until": req.away_until}


@router.delete("/{circle_id}/away")
def clear_away(circle_id: str):
    """Disable Elder Away mode (resumes routine check-in)."""
    circle = repo.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Care circle not found")

    repo.set_away_mode(circle_id, None)
    return {"status": "away_mode_cleared"}


@router.get("/{circle_id}")
def get_circle_profile(circle_id: str):
    """Retrieve Care Circle profile and configuration."""
    circle = repo.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Care circle not found")
    return circle


@router.patch("/{circle_id}")
@router.put("/{circle_id}")
def update_circle_profile(circle_id: str, req: UpdateCircleRequest):
    """Update elder details, caregiver escalation contacts, or default tolerance."""
    circle = repo.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Care circle not found")

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updated = repo.update_circle(circle_id, updates)

    # If default grace was updated, apply to learned anchors
    if req.default_grace_min is not None and req.default_grace_min >= 0:
        for a in repo.get_anchors(circle_id):
            a.grace_min = req.default_grace_min

    return {"status": "updated", "circle": updated}


@router.patch("/{circle_id}/anchors/{anchor_id}")
def update_anchor(circle_id: str, anchor_id: str, req: UpdateAnchorRequest):
    """Customize anchor display nickname or specific grace period."""
    circle = repo.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Care circle not found")

    anchor = repo.update_anchor(circle_id, anchor_id, name=req.name, grace_min=req.grace_min)
    if not anchor:
        raise HTTPException(status_code=404, detail="Anchor not found")

    return {
        "status": "updated",
        "anchor": {
            "anchor_id": anchor.anchor_id,
            "name": anchor.name,
            "grace_min": anchor.grace_min,
            "window": anchor.format_window()
        }
    }
