import json
import logging
from typing import Any, Optional
import boto3
from botocore.exceptions import BotoCoreError, ClientError

from backend.app.config import settings
from backend.app.agent.fallback import TemplateFallbackNarrator
from backend.app.agent.guardrails import BedrockGuardrailsFilter
from backend.app.agent.tools import (
    get_today_status,
    get_recent_signals,
    get_anchor_explanation,
    AGENT_TOOL_SPECS
)
from backend.app.engine.evaluator import DeviationType

logger = logging.getLogger("narrator")


class BedrockNarratorAgent:
    """
    AI Narrator powered by Amazon Bedrock (Claude) and Strands Agent patterns.
    Translates structured facts into empathetic, calm messages and answers family queries.
    Strictly bounded by Bedrock Guardrails and instantaneous deterministic fallback.
    """

    def __init__(self, model_id: Optional[str] = None, region_name: Optional[str] = None):
        self.model_id = model_id or settings.BEDROCK_MODEL_ID
        self.region_name = region_name or settings.AWS_REGION
        self._bedrock_client = None

    def _get_client(self):
        if self._bedrock_client is None:
            try:
                kwargs = {"region_name": self.region_name}
                if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                    kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                    kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
                    if settings.AWS_SESSION_TOKEN:
                        kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN

                self._bedrock_client = boto3.client("bedrock-runtime", **kwargs)
            except Exception as e:
                logger.info(f"Bedrock runtime client unavailable: {e}")
        return self._bedrock_client

    def compose_alert_message(
        self,
        evidence_facts: dict[str, Any],
        deviation_type: DeviationType,
        escalation_level: str = "L1"
    ) -> str:
        """
        Compose a natural language notification message from structured facts.
        Attempts Bedrock Converse API first; falls back to deterministic template if unavailable.
        """
        elder_name = evidence_facts.get("elder_name", "Frank")
        anchor_name = evidence_facts.get("anchor_name", "routine")
        window = evidence_facts.get("usual_window", "")
        support_text = evidence_facts.get("support_text", "")

        client = self._get_client()
        if client:
            system_prompt = (
                "You are the Quiet Check-In AI narrator for a family caretaking app. "
                "Your role is to write a warm, calm, non-alarmist notification to family. "
                "RULES: At most 2 sentences. Never use medical jargon or emergency words. "
                "Always cite the normal baseline evidence so family can judge for themselves."
            )
            prompt = (
                f"Write a {escalation_level} check-in message for {elder_name}. "
                f"Fact: {anchor_name} usually occurs between {window} ({support_text}). "
                f"Status: Nothing observed yet today."
            )

            try:
                response = client.converse(
                    modelId=self.model_id,
                    system=[{"text": system_prompt}],
                    messages=[{"role": "user", "content": [{"text": prompt}]}],
                    inferenceConfig={"maxTokens": 100, "temperature": 0.2}
                )
                output_text = response["output"]["message"]["content"][0]["text"].strip()
                
                # Validate against Bedrock Guardrails filter
                is_valid, violation = BedrockGuardrailsFilter.validate_content(output_text)
                if is_valid:
                    return output_text
                else:
                    logger.warning(f"Guardrail violation in Bedrock response: {violation}")
            except (BotoCoreError, ClientError, Exception) as e:
                logger.info(f"Bedrock invocation skipped or failed ({e}), using template fallback.")

        # Deterministic safe fallback
        return TemplateFallbackNarrator.render_message(
            evidence_facts=evidence_facts,
            deviation_type=deviation_type,
            escalation_level=escalation_level
        )

    def answer_family_question(self, circle_id: str, question: str) -> str:
        """
        Answer a family member's conversational question using agent tools.
        Example: 'Did Dad pick up the paper today?' or 'When did he last open the back door?'
        """
        lower_q = question.lower()
        today_data = get_today_status(circle_id)
        recent_signals = get_recent_signals(circle_id, hours=12.0)
        elder_name = today_data.get("elder_name", "Frank")

        # Guardrail check on input
        is_safe, violation = BedrockGuardrailsFilter.validate_content(question)
        if not is_safe:
            return (
                "Quiet Check-In monitors daily routines and device metadata only. "
                "For medical or emergency situations, please contact local services directly."
            )

        # Tool-assisted answers
        if "paper" in lower_q or "doorbell" in lower_q or "front" in lower_q:
            paper_anchor = next(
                (a for a in today_data.get("active_anchors", []) if "paper" in a.get("name", "").lower() or "doorbell" in a.get("name", "").lower()),
                None
            )
            if paper_anchor:
                if paper_anchor.get("has_occurred"):
                    return f"Yes, {elder_name} completed his morning paper pickup routine today around his usual time."
                else:
                    window = paper_anchor.get("window", "7:30 - 8:50 AM")
                    status = paper_anchor.get("status", "pending")
                    if status == "missed":
                        return f"{elder_name} hasn't been detected picking up the paper today yet. His usual window is {window}."
                    else:
                        return f"Nothing yet, but it's still early. {elder_name} usually picks up the paper between {window}."

        if "back door" in lower_q or "patio" in lower_q or "garden" in lower_q:
            door_events = [s for s in recent_signals if "backdoor" in s.get("device", "").lower()]
            if door_events:
                last_event = door_events[-1]
                return f"{elder_name} was active at the back patio today around {last_event.get('local_time')}."
            else:
                return f"No back door activity has been recorded yet today."

        # General status query
        status = today_data.get("overall_status", "green")
        if status == "green":
            event_count = today_data.get("events_count_today", 0)
            return f"Today is looking normal for {elder_name}. We've observed {event_count} routine events so far and all active anchors are on schedule."
        elif status == "amber":
            return f"There is a gentle check-in open: one of {elder_name}'s usual morning routines hasn't checked in yet today."
        else:
            return f"Extended silence detected during waking hours. Consider reaching out with a quick call."


narrator_agent = BedrockNarratorAgent()
