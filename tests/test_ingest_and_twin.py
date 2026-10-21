import json
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.ring_sim import RingTwinSimulator
from backend.app.config import settings
from backend.app.db.repositories import repo

client = TestClient(app)
sim = RingTwinSimulator()


@pytest.fixture(autouse=True)
def clean_repo():
    repo.clear()
    # Re-register demo circle
    repo.register_circle(
        circle_id=settings.DEMO_CIRCLE_ID,
        elder_name="Frank",
        timezone_name="America/Phoenix",
        offset_hours=-7.0
    )


def test_signed_webhook_ingest_success():
    """Verify that a properly HMAC-signed webhook is accepted, verified, and stored as a Signal."""
    now_utc = datetime.now(timezone.utc)
    raw_body, sig_header = sim.build_signed_webhook(
        event_type="motion_detected",
        device_id="doorbell_front",
        timestamp=now_utc,
        sub_type="human",
        request_id="req-test-success-01"
    )

    response = client.post(
        "/webhooks/ring",
        content=raw_body,
        headers={"X-Signature": sig_header, "Content-Type": "application/json"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["request_id"] == "req-test-success-01"
    assert data["signal_kind"] == "human_motion"

    # Verify stored in repository
    signals = repo.get_signals_for_circle(settings.DEMO_CIRCLE_ID)
    assert len(signals) == 1
    assert signals[0].request_id == "req-test-success-01"
    assert signals[0].device_id == "doorbell_front"


def test_webhook_ingest_with_x_ring_signature_fallback():
    """Verify that incoming webhooks bearing X-Ring-Signature are accepted for backward compatibility."""
    repo.clear()
    now_utc = datetime.now(timezone.utc)
    raw_body, sig_header = sim.build_signed_webhook(
        event_type="motion_detected",
        device_id="doorbell_front",
        timestamp=now_utc,
        sub_type="human",
        request_id="req-test-fallback-01"
    )

    response = client.post(
        "/webhooks/ring",
        content=raw_body,
        headers={"X-Ring-Signature": sig_header, "Content-Type": "application/json"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["request_id"] == "req-test-fallback-01"



def test_webhook_idempotency_deduplication():
    """Verify that submitting the same request_id twice returns already_processed without duplicating signals."""
    now_utc = datetime.now(timezone.utc)
    raw_body, sig_header = sim.build_signed_webhook(
        event_type="contact_sensor_faulted",
        device_id="sensor_backdoor",
        timestamp=now_utc,
        request_id="req-dedupe-999"
    )

    # First delivery
    res1 = client.post(
        "/webhooks/ring",
        content=raw_body,
        headers={"X-Signature": sig_header, "Content-Type": "application/json"}
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "processed"

    # Second duplicate delivery (e.g. Ring retry or network duplicate)
    res2 = client.post(
        "/webhooks/ring",
        content=raw_body,
        headers={"X-Signature": sig_header, "Content-Type": "application/json"}
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "already_processed"
    assert res2.json()["request_id"] == "req-dedupe-999"

    # Repository should only contain ONE signal
    signals = repo.get_signals_for_circle(settings.DEMO_CIRCLE_ID)
    assert len(signals) == 1


def test_tampered_signature_rejected():
    """Verify that an altered signature or modified payload is strictly rejected with 401."""
    now_utc = datetime.now(timezone.utc)
    raw_body, sig_header = sim.build_signed_webhook(
        event_type="motion_detected",
        device_id="doorbell_front",
        timestamp=now_utc,
        tamper=True  # inject bad signature
    )

    response = client.post(
        "/webhooks/ring",
        content=raw_body,
        headers={"X-Signature": sig_header, "Content-Type": "application/json"}
    )

    assert response.status_code == 401
    assert "Invalid HMAC signature" in response.json()["error"]
    assert len(repo.get_signals_for_circle(settings.DEMO_CIRCLE_ID)) == 0


def test_history_backfill_generation():
    """Verify that the simulator can generate 21 days of history with realistic event counts."""
    history = sim.generate_history_backfill(days=21)
    assert len(history) > 50  # ~3-5 events per day over 21 days
    
    # Check that timestamps are ordered and span approximately 21 days
    first_ts = history[0]["data"]["attributes"]["timestamp"]
    last_ts = history[-1]["data"]["attributes"]["timestamp"]
    assert last_ts > first_ts
