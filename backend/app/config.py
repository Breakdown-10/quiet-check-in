import os
from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseModel

# Automatically load environment variables from .env file if present
load_dotenv()


class Settings(BaseModel):
    APP_NAME: str = "Quiet Check-In"
    RING_HMAC_KEY: str = os.getenv("RING_HMAC_KEY", "staging_ring_hmac_secret_key_demo_2026")
    DEMO_CIRCLE_ID: str = "circle_frank_phoenix"
    DEFAULT_TIMEZONE_OFFSET: float = -7.0  # Phoenix (UTC-7, no DST)
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    BEDROCK_MODEL_ID: str = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-3-5-sonnet-20241022-v2:0")
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_SESSION_TOKEN: Optional[str] = os.getenv("AWS_SESSION_TOKEN")
    SES_SENDER_EMAIL: str = os.getenv("SES_SENDER_EMAIL", "notifications@quietcheckin.local")


settings = Settings()
