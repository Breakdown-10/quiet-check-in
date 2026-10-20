from typing import Any
from backend.app.engine.evaluator import Observation, DeviationType


class TemplateFallbackNarrator:
    """
    Deterministic template narrator providing immediate, reliable fallback
    if Amazon Bedrock is unavailable, rate-limited, or fails safety guardrails.
    Guarantees that an alert is never dropped or silenced.
    """

    @staticmethod
    def render_message(evidence_facts: dict[str, Any], deviation_type: DeviationType, escalation_level: str = "L1") -> str:
        elder_name = evidence_facts.get("elder_name", "your family member")
        anchor_name = evidence_facts.get("anchor_name", "routine activity")
        usual_window = evidence_facts.get("usual_window", "usual time")
        support_text = evidence_facts.get("support_text", "")
        evidence_suffix = f" ({support_text})" if support_text else ""

        if deviation_type == DeviationType.MISSED_ANCHOR:
            if escalation_level == "L1":
                return (
                    f"{elder_name} usually completes {anchor_name.lower()} by {usual_window}{evidence_suffix}. "
                    f"Nothing observed yet today. A quick check-in call might be helpful."
                )
            elif escalation_level == "L2":
                return (
                    f"Checking in on {elder_name}: {anchor_name.lower()} is overdue past {usual_window}. "
                    f"Could you take a quick look next door?"
                )
            else:  # L3
                return (
                    f"Routine break for {elder_name} remains unconfirmed. "
                    f"Consider giving a phone call or stopping by to check in."
                )

        elif deviation_type == DeviationType.LONG_SILENCE:
            hours = evidence_facts.get("hours_silent", 8)
            return (
                f"No motion or door activity has been detected for over {int(hours)} hours during daytime. "
                f"Consider giving {elder_name} a call to see how their day is going."
            )

        elif deviation_type == DeviationType.UNUSUAL_NIGHT:
            count = evidence_facts.get("night_events_count", 3)
            return (
                f"Noticeable night activity ({count} events between midnight and 5 AM) for {elder_name}. "
                f"They may have had a restless night. You might want to ask how they slept."
            )

        elif deviation_type == DeviationType.DEVICE_HEALTH:
            return (
                f"One of {elder_name}'s Ring sensors appears to be offline. "
                f"Activity check-ins may be paused until connection is restored."
            )

        elif deviation_type == DeviationType.OVERDUE_EARLY:
            return (
                f"{elder_name}'s {anchor_name.lower()} window ended, but it's still within the grace period."
            )

        return f"Routine update for {elder_name}: everything is being monitored calmly."
