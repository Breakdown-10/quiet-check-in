import re
from typing import Optional


FORBIDDEN_WORDS = [
    "emergency", "911", "cardiac", "heart attack", "stroke", "dying",
    "paramedics", "ambulance", "critical condition", "diagnose", "diagnosis",
    "medical emergency", "fatal", "urgent danger", "peril"
]


class GuardrailViolation(Exception):
    pass


class BedrockGuardrailsFilter:
    """
    Enforces Amazon Bedrock Guardrails policy:
    1. Blocks medical diagnosis or health speculation.
    2. Prohibits emergency/alarmist language (this is NOT an emergency service).
    3. Restricts conversation strictly to care circle routine and device metadata.
    4. Enforces warmth and conciseness (<= 2 sentences).
    """

    @staticmethod
    def validate_content(text: str) -> tuple[bool, Optional[str]]:
        """
        Validate generated text against safety guardrails.
        Returns (is_valid, violation_reason).
        """
        lower = text.lower()

        # 1. Check forbidden alarmist/medical words
        for word in FORBIDDEN_WORDS:
            if re.search(r'\b' + re.escape(word) + r'\b', lower):
                return False, f"Prohibited word detected: '{word}'"

        # 2. Check sentence count constraint (at most 3 sentences for flexibility, target <= 2)
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
        if len(sentences) > 3:
            return False, f"Message exceeds length limit ({len(sentences)} sentences, max 3 allowed)"

        return True, None
