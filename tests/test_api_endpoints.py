import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings
from backend.app.db.repositories import repo

client = TestClient(app)
circle_id = settings.DEMO_CIRCLE_ID


def test_full_api_workflow_end_to_end():
    # 1. Health check & Root Dashboard
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "Quiet Check-In" in res_root.text
    assert "text/html" in res_root.headers.get("content-type", "")

    # 2. Reset simulator to 07:30 AM with fresh seeded baseline
    res_reset = client.post("/sim/inject", json={"scenario": "reset"})
    assert res_reset.status_code == 200
    assert res_reset.json()["status"] == "reset_complete"

    # 3. Check learned baseline
    res_base = client.get(f"/circles/{circle_id}/baseline")
    assert res_base.status_code == 200
    anchors = res_base.json()["anchors"]
    assert len(anchors) >= 1
    paper_anchor = next((a for a in anchors if "front" in a["device_id"].lower() or "paper" in a["name"].lower()), None)
    assert paper_anchor is not None
    assert paper_anchor["reliability_pct"] >= 70

    # 4. Check today status at 07:30 AM (pending paper, overall green)
    res_today = client.get(f"/circles/{circle_id}/today")
    assert res_today.status_code == 200
    data_today = res_today.json()
    assert data_today["overall_status"] == "green"

    # 5. Fast-forward past deadline without routine (skip_routine)
    res_skip = client.post("/sim/inject", json={"scenario": "skip_routine"})
    assert res_skip.status_code == 200

    # 6. Today status should now be amber with an active L1 alert!
    res_overdue = client.get(f"/circles/{circle_id}/today")
    assert res_overdue.status_code == 200
    data_overdue = res_overdue.json()
    assert data_overdue["overall_status"] == "amber"
    assert len(data_overdue["alerts"]) >= 1
    alert = data_overdue["alerts"][0]
    assert alert["level"] == "L1"
    assert alert["recipient_name"] == "Maya"

    # 7. Maya acknowledges alert: "I called, all good"
    alert_id = alert["alert_id"]
    res_ack = client.post(f"/alerts/{alert_id}/ack", json={"action": "ok", "ack_by": "Maya"})
    assert res_ack.status_code == 200
    assert res_ack.json()["new_status"] == "acknowledged_safe"
    assert res_ack.json()["widening_applied_min"] == 15

    # 8. Test Elder Away mode (future date)
    res_away = client.post(f"/circles/{circle_id}/away", json={"away_until": "2026-12-31T00:00:00Z"})
    assert res_away.status_code == 200
    assert res_away.json()["status"] == "away_mode_active"

    res_today_away = client.get(f"/circles/{circle_id}/today")
    assert res_today_away.json()["away_until"] is not None
    assert res_today_away.json()["overall_status"] == "green"  # Suppressed

    # 9. Clear away mode
    res_clear_away = client.delete(f"/circles/{circle_id}/away")
    assert res_clear_away.status_code == 200
    assert res_clear_away.json()["status"] == "away_mode_cleared"


def test_api_v1_prefixed_endpoints_and_time_travel():
    # Verify /api/v1 compatibility routes for SAM and Ring Reviewers
    res_status = client.get(f"/api/v1/circles/{circle_id}/status")
    assert res_status.status_code == 200
    assert "overall_status" in res_status.json()

    res_timeline = client.get(f"/api/v1/circles/{circle_id}/timeline")
    assert res_timeline.status_code == 200

    res_baseline = client.get(f"/api/v1/circles/{circle_id}/baseline")
    assert res_baseline.status_code == 200

    # Test /api/v1/sim/time-travel with advance minutes
    res_tt_adv = client.post("/api/v1/sim/time-travel", json={"minutes": 15})
    assert res_tt_adv.status_code == 200
    assert res_tt_adv.json()["status"] == "advanced"

    # Test /api/v1/sim/time-travel with scenario
    res_tt_scen = client.post("/api/v1/sim/time-travel", json={"scenario": "reset"})
    assert res_tt_scen.status_code == 200
    assert res_tt_scen.json()["status"] == "reset_complete"


def test_customization_profile_and_anchors():
    # Reset first
    client.post("/sim/inject", json={"scenario": "reset"})

    # 1. Update Care Circle Profile
    update_payload = {
        "elder_name": "Eleanor",
        "age": 82,
        "city": "Seattle, WA",
        "primary_contact_name": "Sarah",
        "primary_contact_email": "sarah@family.local",
        "secondary_contact_name": "Neighbor Tom",
        "secondary_contact_email": "tom@local.net",
        "default_grace_min": 45
    }
    res_update = client.patch(f"/circles/{circle_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["circle"]["elder_name"] == "Eleanor"
    assert res_update.json()["circle"]["age"] == 82
    assert res_update.json()["circle"]["primary_contact_name"] == "Sarah"

    # 2. Check today status reflects updated elder name and contacts
    res_today = client.get(f"/circles/{circle_id}/today")
    assert res_today.status_code == 200
    today_data = res_today.json()
    assert today_data["elder_name"] == "Eleanor"
    assert today_data["age"] == 82
    assert today_data["city"] == "Seattle, WA"
    assert today_data["primary_contact_name"] == "Sarah"
    assert today_data["default_grace_min"] == 45

    # 3. Update specific anchor name and grace period
    res_base = client.get(f"/circles/{circle_id}/baseline")
    anchors = res_base.json()["anchors"]
    first_anchor_id = anchors[0]["anchor_id"]

    res_anchor_patch = client.patch(
        f"/circles/{circle_id}/anchors/{first_anchor_id}",
        json={"name": "Eleanor's Morning Herbal Tea", "grace_min": 40}
    )
    assert res_anchor_patch.status_code == 200
    assert res_anchor_patch.json()["anchor"]["name"] == "Eleanor's Morning Herbal Tea"
    assert res_anchor_patch.json()["anchor"]["grace_min"] == 40

    # 4. Verify in baseline endpoint
    res_base_after = client.get(f"/circles/{circle_id}/baseline")
    updated_anchor = next(a for a in res_base_after.json()["anchors"] if a["anchor_id"] == first_anchor_id)
    assert updated_anchor["name"] == "Eleanor's Morning Herbal Tea"


def test_security_proof_endpoint():
    """Verify the live cryptographic security proof endpoint passes all 4 checks."""
    res = client.get("/sim/security-proof")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert len(data["proofs"]) == 4

    proof_ids = [p["id"] for p in data["proofs"]]
    assert "valid_hmac" in proof_ids
    assert "tamper_protection" in proof_ids
    assert "replay_protection" in proof_ids
    assert "idempotent_dedupe" in proof_ids

    # All 4 security guarantees must pass
    for proof in data["proofs"]:
        assert proof["passed"] is True, f"Security check failed: {proof['name']}"


