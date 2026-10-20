from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings
from backend.app.agent.fallback import TemplateFallbackNarrator
from backend.app.agent.guardrails import BedrockGuardrailsFilter
from backend.app.agent.narrator import narrator_agent
from backend.app.notifications.ses_notifier import ses_notifier
from backend.app.engine.evaluator import DeviationType

client = TestClient(app)
circle_id = settings.DEMO_CIRCLE_ID


def test_template_fallback_narrator_renders_calm_evidence():
    evidence = {
        "elder_name": "Frank",
        "anchor_name": "Morning paper pickup",
        "usual_window": "7:30 AM - 8:50 AM",
        "support_text": "seen on 18 of 20 days"
    }

    msg = TemplateFallbackNarrator.render_message(
        evidence_facts=evidence,
        deviation_type=DeviationType.MISSED_ANCHOR,
        escalation_level="L1"
    )

    assert "Frank" in msg
    assert "7:30 AM - 8:50 AM" in msg
    assert "seen on 18 of 20 days" in msg
    assert "quick check-in call" in msg
    # Assert no panic words
    assert "emergency" not in msg.lower()
    assert "911" not in msg.lower()


def test_guardrails_filter_valid_and_forbidden_words():
    safe_text = "Frank usually picks up the paper by 8:30. Nothing yet today. A quick call might settle it."
    is_safe, reason = BedrockGuardrailsFilter.validate_content(safe_text)
    assert is_safe is True
    assert reason is None

    # Alarmist text with forbidden words
    alarmist_text = "Emergency! Dial 911 immediately, Frank is in critical condition!"
    is_safe_2, reason_2 = BedrockGuardrailsFilter.validate_content(alarmist_text)
    assert is_safe_2 is False
    assert "emergency" in reason_2.lower() or "911" in reason_2.lower()


def test_guardrails_filter_length_constraint():
    long_text = "Sentence one. Sentence two. Sentence three. Sentence four is too long."
    is_safe, reason = BedrockGuardrailsFilter.validate_content(long_text)
    assert is_safe is False
    assert "length" in reason.lower()


def test_ses_notifier_formats_and_logs_email():
    ses_notifier.dispatched_emails.clear()

    evidence = {
        "elder_name": "Frank",
        "usual_window": "7:30 AM - 8:50 AM",
        "support_text": "seen on 18 of 20 days"
    }

    success = ses_notifier.send_checkin_email(
        to_email="maya@family.com",
        recipient_name="Maya",
        elder_name="Frank",
        subject="Quiet Check-In: Frank's Morning Routine",
        message="Frank usually picks up the paper by 8:50. Nothing observed yet today.",
        evidence_facts=evidence,
        ack_url="https://app.quietcheckin.local/ack/123"
    )

    assert success is True
    assert len(ses_notifier.dispatched_emails) == 1
    record = ses_notifier.dispatched_emails[0]
    assert record["to"] == "maya@family.com"
    assert record["recipient_name"] == "Maya"
    assert "Frank" in record["message"]


def test_family_chat_endpoint_answers_routine_questions():
    # 1. Reset simulator to have baseline ready
    client.post("/sim/inject", json={"scenario": "reset"})

    # 2. Ask question about paper
    res = client.post(
        f"/circles/{circle_id}/chat",
        json={"message": "Did Dad get his paper today?"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "Frank" in data["reply"] or "paper" in data["reply"].lower()

    # 3. Ask emergency question -> guardrail intercept
    res_emergency = client.post(
        f"/circles/{circle_id}/chat",
        json={"message": "Is this a 911 emergency service?"}
    )
    assert res_emergency.status_code == 200
    assert "not an emergency" in res_emergency.json()["reply"].lower() or "routine" in res_emergency.json()["reply"].lower()
