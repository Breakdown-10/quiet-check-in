import json
import logging
from typing import Any, Optional, Tuple
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
    AI Narrator powered by Amazon Bedrock (Claude Haiku 5.5) and Strands Agent patterns.
    Translates structured facts into empathetic, calm messages and answers family queries.
    Strictly bounded by Bedrock Guardrails and instantaneous deterministic fallback.
    """

    def __init__(self, model_id: Optional[str] = None, region_name: Optional[str] = None):
        self.model_id = model_id or settings.BEDROCK_MODEL_ID
        self.region_name = region_name or settings.AWS_REGION
        self._bedrock_client = None
        self.last_status: dict[str, Any] = {
            "connected": False,
            "model": self.model_id,
            "last_error": None,
            "last_error_type": None
        }

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
                logger.warning(f"Bedrock runtime client unavailable: {e}")
                self.last_status["last_error"] = str(e)
                self.last_status["last_error_type"] = type(e).__name__
        return self._bedrock_client

    def _get_candidate_models(self) -> list[str]:
        """Return prioritized list of Bedrock model IDs / inference profiles."""
        candidates = [self.model_id]
        fallback_candidates = [
            "anthropic.claude-3-5-sonnet-20241022-v2:0",
            "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            "us.anthropic.claude-3-5-haiku-20241022-v1:0",
            "anthropic.claude-3-haiku-20240307-v1:0",
        ]
        for m in fallback_candidates:
            if m not in candidates:
                candidates.append(m)
        return candidates

    def compose_alert_message(
        self,
        evidence_facts: dict[str, Any],
        deviation_type: DeviationType,
        escalation_level: str = "L1"
    ) -> str:
        """
        Compose a natural language notification message from structured facts.
        Attempts Bedrock Converse API first across candidate models; falls back to
        deterministic safe template if unavailable or rate limited.
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

            last_err = None
            for model_id in self._get_candidate_models():
                try:
                    response = client.converse(
                        modelId=model_id,
                        system=[{"text": system_prompt}],
                        messages=[{"role": "user", "content": [{"text": prompt}]}],
                        inferenceConfig={"maxTokens": 120, "temperature": 0.2}
                    )
                    output_text = response["output"]["message"]["content"][0]["text"].strip()
                    
                    # Validate against Bedrock Guardrails filter
                    is_valid, violation = BedrockGuardrailsFilter.validate_content(output_text)
                    if is_valid:
                        self.last_status.update({"connected": True, "model": model_id, "last_error": None})
                        return output_text
                    else:
                        logger.warning(f"Guardrail violation in Bedrock response: {violation}")
                except Exception as e:
                    last_err = e
                    logger.debug(f"Bedrock invocation failed for {model_id}: {e}")

            if last_err:
                self.last_status.update({
                    "connected": False,
                    "last_error": str(last_err),
                    "last_error_type": type(last_err).__name__
                })
                logger.warning(f"All Bedrock candidate models failed ({type(last_err).__name__}: {last_err}); using template fallback.")

        # Deterministic safe fallback
        return TemplateFallbackNarrator.render_message(
            evidence_facts=evidence_facts,
            deviation_type=deviation_type,
            escalation_level=escalation_level
        )

    def _execute_tool(self, default_circle_id: str, tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
        """Execute agent tool safely and return JSON serializable dict."""
        circle_id = tool_input.get("circle_id") or default_circle_id
        try:
            if tool_name == "get_today_status":
                return get_today_status(circle_id)
            elif tool_name == "get_recent_signals":
                hours = float(tool_input.get("hours", 24.0))
                return {"signals": get_recent_signals(circle_id, hours=hours)}
            elif tool_name == "get_anchor_explanation":
                anchor_id = tool_input.get("anchor_id", "")
                return get_anchor_explanation(circle_id, anchor_id)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            return {"error": f"Tool execution failed: {str(e)}"}

    def _call_bedrock_chat(self, circle_id: str, question: str) -> Optional[str]:
        """
        Invoke Bedrock Converse API with tool use loop for conversational family Q&A.
        Returns the generated text answer if successful, or None if Bedrock is unavailable.
        """
        client = self._get_client()
        if not client:
            return None

        system_prompt = (
            "You are the Quiet Check-In AI assistant for a family caretaking app. "
            "You help family members understand their elderly loved one's daily routine using Ring sensor events. "
            "RULES:\n"
            "1. Be warm, calm, objective, and reassuring.\n"
            "2. Keep answers concise (1 to 3 sentences).\n"
            "3. NEVER provide medical advice, diagnosis, or use emergency/alarmist words.\n"
            "4. Always use the available tools (get_today_status, get_recent_signals, get_anchor_explanation) "
            "to check the physical evidence before answering.\n"
            f"The care circle ID is '{circle_id}'."
        )

        last_err = None
        for model_id in self._get_candidate_models():
            messages: list[dict[str, Any]] = [
                {"role": "user", "content": [{"text": question}]}
            ]
            try:
                # Up to 3 tool-use execution turns
                for _ in range(3):
                    response = client.converse(
                        modelId=model_id,
                        system=[{"text": system_prompt}],
                        messages=messages,
                        inferenceConfig={"maxTokens": 250, "temperature": 0.2},
                        toolConfig={"tools": AGENT_TOOL_SPECS}
                    )
                    
                    stop_reason = response.get("stopReason")
                    output_msg = response.get("output", {}).get("message", {})
                    content_blocks = output_msg.get("content", [])
                    messages.append(output_msg)

                    if stop_reason == "tool_use":
                        tool_results = []
                        for block in content_blocks:
                            if "toolUse" in block:
                                tu = block["toolUse"]
                                tu_id = tu["toolUseId"]
                                tu_name = tu["name"]
                                tu_input = tu.get("input", {})
                                tool_output = self._execute_tool(circle_id, tu_name, tu_input)
                                tool_results.append({
                                    "toolResult": {
                                        "toolUseId": tu_id,
                                        "content": [{"json": tool_output}],
                                        "status": "success"
                                    }
                                })
                        if tool_results:
                            messages.append({"role": "user", "content": tool_results})
                        else:
                            break
                    else:
                        # Final text answer
                        reply_text = "".join(b.get("text", "") for b in content_blocks).strip()
                        if reply_text:
                            is_valid, violation = BedrockGuardrailsFilter.validate_content(reply_text)
                            if is_valid:
                                self.last_status.update({"connected": True, "model": model_id, "last_error": None})
                                return reply_text
                            else:
                                logger.warning(f"Bedrock chat response guardrail violation: {violation}")
                                return None
                        break
            except Exception as e:
                last_err = e
                logger.debug(f"Bedrock chat failed for {model_id}: {e}")
                continue

        if last_err:
            self.last_status.update({
                "connected": False,
                "last_error": str(last_err),
                "last_error_type": type(last_err).__name__
            })
            logger.warning(f"Bedrock chat fell back to deterministic engine ({type(last_err).__name__}: {last_err})")

        return None

    def _deterministic_family_answer(self, circle_id: str, question: str) -> str:
        """
        Safe deterministic rule-grounded response generator.
        Provides instant, reliable answers when Bedrock is offline, rate-limited, or throttled.
        """
        lower_q = question.lower()
        today_data = get_today_status(circle_id)
        recent_signals = get_recent_signals(circle_id, hours=12.0)
        elder_name = today_data.get("elder_name", "Frank")

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
                return "No back door activity has been recorded yet today."

        # General status query
        status = today_data.get("overall_status", "green")
        if status == "green":
            event_count = today_data.get("events_count_today", 0)
            return f"Today is looking normal for {elder_name}. We've observed {event_count} routine events so far and all active anchors are on schedule."
        elif status == "amber":
            return f"There is a gentle check-in open: one of {elder_name}'s usual morning routines hasn't checked in yet today."
        else:
            return f"Extended silence detected during waking hours. Consider reaching out with a quick call."

    def answer_family_question(self, circle_id: str, question: str) -> str:
        """
        Answer a family member's conversational question.
        Uses Bedrock Converse with agent tools when available;
        falls back to deterministic grounded engine if rate-limited or unavailable.
        """
        reply, _ = self.answer_family_question_with_source(circle_id, question)
        return reply

    def answer_family_question_with_source(self, circle_id: str, question: str) -> Tuple[str, str]:
        """
        Returns (reply_text, source) where source is 'bedrock' or 'fallback'.
        """
        # Guardrail check on input
        is_safe, violation = BedrockGuardrailsFilter.validate_content(question)
        if not is_safe:
            return (
                "Quiet Check-In monitors daily routines and device metadata only. "
                "For medical or emergency situations, please contact local services directly.",
                "guardrail_refusal"
            )

        # 1. Attempt Bedrock Converse Agent
        bedrock_reply = self._call_bedrock_chat(circle_id, question)
        if bedrock_reply:
            return bedrock_reply, "bedrock"

        # 2. Instant deterministic safe fallback
        fallback_reply = self._deterministic_family_answer(circle_id, question)
        return fallback_reply, "fallback"


narrator_agent = BedrockNarratorAgent()
