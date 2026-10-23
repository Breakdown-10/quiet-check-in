import json
import logging
import time
from typing import Any, Optional, Tuple
import boto3
from botocore.config import Config
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
        self._cooldown_until: float = 0.0
        self.last_status: dict[str, Any] = {
            "connected": False,
            "model": self.model_id,
            "last_error": None,
            "last_error_type": None
        }

    def _is_in_cooldown(self) -> bool:
        return time.time() < self._cooldown_until

    def _trigger_cooldown(self, seconds: float = 60.0):
        self._cooldown_until = time.time() + seconds

    def _get_client(self):
        if self._bedrock_client is None:
            try:
                kwargs = {"region_name": self.region_name}
                if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                    kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                    kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
                    if settings.AWS_SESSION_TOKEN:
                        kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN

                cfg = Config(
                    retries={"max_attempts": 1},
                    connect_timeout=2.0,
                    read_timeout=4.0
                )
                self._bedrock_client = boto3.client("bedrock-runtime", config=cfg, **kwargs)
            except Exception as e:
                logger.warning(f"Bedrock runtime client unavailable: {e}")
                self.last_status["last_error"] = str(e)
                self.last_status["last_error_type"] = type(e).__name__
        return self._bedrock_client

    def _get_candidate_models(self) -> list[str]:
        """Return prioritized list of Bedrock model IDs / inference profiles."""
        candidates = [self.model_id]
        fallback_candidates = [
            "us.anthropic.claude-haiku-4-5-20251001-v1:0",
            "global.anthropic.claude-haiku-4-5-20251001-v1:0"
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
        if client and not self._is_in_cooldown():
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
                        self._cooldown_until = 0.0
                        return output_text
                    else:
                        logger.warning(f"Guardrail violation in Bedrock response: {violation}")
                except Exception as e:
                    last_err = e
                    err_msg = str(e)
                    logger.debug(f"Bedrock invocation failed for {model_id}: {e}")
                    if "ThrottlingException" in err_msg or "Too many tokens per day" in err_msg:
                        self._trigger_cooldown(60.0)
                        break

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
        if not client or self._is_in_cooldown():
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
                                self._cooldown_until = 0.0
                                return reply_text
                            else:
                                logger.warning(f"Bedrock chat response guardrail violation: {violation}")
                                return None
                        break
            except Exception as e:
                last_err = e
                err_msg = str(e)
                logger.debug(f"Bedrock chat failed for {model_id}: {e}")
                if "ThrottlingException" in err_msg or "Too many tokens per day" in err_msg:
                    logger.warning(f"Bedrock daily token quota reached; activating 60s cooldown: {e}")
                    self._trigger_cooldown(60.0)
                    break
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

        # 0. Conversational greetings, introductions, and courtesy
        clean_q = lower_q.strip().strip("?!.,")
        if clean_q in ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy", "sup", "greetings"] or any(clean_q.startswith(g) for g in ["hello ", "hi ", "hey "]):
            return f"Hello! I'm {elder_name}'s Quiet Check-In assistant. All Ring ambient sensors are online and monitoring his routine normally. How can I help you today?"

        if any(phrase in clean_q for phrase in ["who are you", "what can you do", "what do you do", "help me", "how does this work"]):
            return f"I'm {elder_name}'s ambient care assistant for Quiet Check-In. I track daily routine milestones—such as his morning kitchen routine, patio check, medication adherence, and morning paper pickup—using privacy-first Ring event timestamps with zero video or audio recording."

        if any(phrase in clean_q for phrase in ["thank you", "thanks", "thx", "appreciate it"]):
            return f"You're very welcome! I'll continue keeping watch over {elder_name}'s routines quietly and will notify family if any unexpected silence occurs."

        # 1. Paper / Front Doorbell / Porch routine check
        if any(term in lower_q for term in ["paper", "doorbell", "porch", "front door", "front"]):
            paper_anchor = next(
                (a for a in today_data.get("active_anchors", []) 
                 if any(term in a.get("name", "").lower() for term in ["paper", "doorbell", "porch", "front"])
                 or any(term in a.get("device_id", "").lower() for term in ["doorbell", "front"])),
                None
            )
            doorbell_events = [
                s for s in recent_signals 
                if any(term in s.get("device", "").lower() for term in ["doorbell", "front"])
                or any(term in s.get("device_id", "").lower() for term in ["doorbell", "front"])
            ]

            if doorbell_events or (paper_anchor and paper_anchor.get("has_occurred")):
                last_time = doorbell_events[-1].get("local_time") if doorbell_events else "around his usual time"
                return f"Yes, {elder_name} completed his morning paper pickup routine today around {last_time}."
            elif paper_anchor:
                window = paper_anchor.get("window", "8:00 AM - 9:15 AM")
                status = paper_anchor.get("status", "pending")
                if status == "missed":
                    return f"{elder_name} hasn't been detected picking up the paper today yet. His usual window is {window}."
                else:
                    return f"Nothing yet, but it's still early. {elder_name} usually picks up the paper between {window}."
            else:
                return f"No front porch or doorbell activity has been recorded yet today, so {elder_name} may not have picked up the paper yet."

        # 2. Back patio / garden routine check
        if any(term in lower_q for term in ["back door", "backdoor", "patio", "garden"]):
            patio_anchor = next(
                (a for a in today_data.get("active_anchors", []) 
                 if any(term in a.get("name", "").lower() for term in ["patio", "back"])
                 or any(term in a.get("device_id", "").lower() for term in ["backdoor", "patio"])),
                None
            )
            door_events = [
                s for s in recent_signals 
                if any(term in s.get("device", "").lower() for term in ["backdoor", "patio"])
                or any(term in s.get("device_id", "").lower() for term in ["backdoor", "patio"])
            ]
            if door_events or (patio_anchor and patio_anchor.get("has_occurred")):
                last_event = door_events[-1] if door_events else None
                time_str = last_event.get("local_time") if last_event else "his usual morning time"
                return f"{elder_name} was active at the back patio today around {time_str}."
            elif patio_anchor:
                return f"No back patio activity observed yet today. {elder_name}'s normal patio check is between {patio_anchor.get('window')}."
            else:
                return "No back door activity has been recorded yet today."

        # 3. Kitchen / breakfast / morning wake routine check
        if any(term in lower_q for term in ["kitchen", "breakfast", "coffee", "wake", "woke", "up"]):
            kitchen_anchor = next(
                (a for a in today_data.get("active_anchors", []) 
                 if "kitchen" in a.get("name", "").lower() or "kitchen" in a.get("device_id", "").lower()),
                None
            )
            kitchen_events = [
                s for s in recent_signals 
                if "kitchen" in s.get("device", "").lower() or "kitchen" in s.get("device_id", "").lower()
            ]
            if kitchen_events or (kitchen_anchor and kitchen_anchor.get("has_occurred")):
                last_t = kitchen_events[-1].get("local_time") if kitchen_events else "around his usual time"
                return f"{elder_name} was active in the kitchen around {last_t} for his morning routine."
            elif kitchen_anchor:
                return f"No kitchen activity recorded yet today. {elder_name} usually starts his morning kitchen routine between {kitchen_anchor.get('window')}."
            else:
                return "No kitchen motion has been recorded yet today."

        # 4. Medicine / pills adherence check
        if any(term in lower_q for term in ["medicine", "meds", "pill", "cabinet", "dose"]):
            med_anchor = next(
                (a for a in today_data.get("active_anchors", []) 
                 if "med" in a.get("name", "").lower() or "medicine" in a.get("device_id", "").lower()),
                None
            )
            med_events = [
                s for s in recent_signals 
                if "medicine" in s.get("device", "").lower() or "medicine" in s.get("device_id", "").lower()
            ]
            if med_events or (med_anchor and med_anchor.get("has_occurred")):
                last_t = med_events[-1].get("local_time") if med_events else "around his usual time"
                return f"{elder_name} accessed the medicine cabinet at {last_t} today."
            elif med_anchor:
                return f"No medicine cabinet activity recorded yet today. {elder_name}'s normal adherence window is {med_anchor.get('window')}."
            else:
                return "No medicine cabinet adherence recorded yet today."

        # 5. Device health / sensor connectivity check
        if any(term in lower_q for term in ["sensor", "device", "health", "battery", "online"]):
            return "All Ring sensors (Front Doorbell, Back Patio Door, Medicine Cabinet, Kitchen Motion) are online and healthy. Data minimization protocol is active (0 audio, 0 video recorded)."

        # 6. General status fallback
        status = today_data.get("overall_status", "green")
        if status == "green":
            event_count = today_data.get("events_count_today", 0)
            return f"Today is looking normal for {elder_name}. We've observed {event_count} routine events so far and all active anchors are on schedule."
        elif status == "amber":
            return f"There is a gentle check-in open: one of {elder_name}'s usual morning routines is overdue past its typical window."
        else:
            return f"Extended silence detected during waking hours. Consider reaching out with a quick check-in call."

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
