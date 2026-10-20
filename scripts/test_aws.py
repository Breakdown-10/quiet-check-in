"""
Diagnostic test script to verify AWS Bedrock and Amazon SES credentials.
Run: python scripts/test_aws.py
"""
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.config import settings
from backend.app.agent.narrator import narrator_agent
from backend.app.notifications.ses_notifier import ses_notifier

def test_credentials():
    print("=" * 60)
    print("Quiet Check-In — AWS Credentials Diagnostic Tool")
    print("=" * 60)
    print(f"AWS Region:        {settings.AWS_REGION}")
    print(f"Bedrock Model:     {settings.BEDROCK_MODEL_ID}")
    print(f"SES Sender Email:  {settings.SES_SENDER_EMAIL}")
    
    key_preview = settings.AWS_ACCESS_KEY_ID[:4] + "..." if settings.AWS_ACCESS_KEY_ID else "NOT SET"
    print(f"AWS Access Key ID: {key_preview}")
    print("-" * 60)

    # 1. Test Bedrock
    print("\n1. Testing Amazon Bedrock Runtime connection...")
    bedrock_client = narrator_agent._get_client()
    if not bedrock_client or not settings.AWS_ACCESS_KEY_ID:
        print("  [!] AWS credentials not found in .env; system using local template fallback.")
    else:
        try:
            sample_facts = {
                "elder_name": "Frank",
                "anchor_name": "Morning Front Porch Activity",
                "usual_window": "8:18 AM - 9:18 AM",
                "support_text": "seen on 20 of 21 days"
            }
            msg = narrator_agent.compose_alert_message(sample_facts, "missed_anchor", "L1")
            print(f"  [OK] Bedrock Claude 3 Haiku successfully generated message:\n       \"{msg}\"")
        except Exception as e:
            print(f"  [ERROR] Bedrock call failed: {e}")
            print("  Check: (1) Did you enable model access in AWS Bedrock Console?")
            print("         (2) Is your AWS_REGION set to where access was granted (e.g. us-east-1)?")

    # 2. Test SES
    print("\n2. Testing Amazon SES client...")
    ses_client = ses_notifier._get_client()
    if not ses_client or not settings.AWS_ACCESS_KEY_ID:
        print("  [!] SES in local mode (emails logged to memory).")
    else:
        try:
            res = ses_client.get_send_quota()
            print(f"  [OK] SES Connection successful!")
            print(f"       Max 24h Send Quota: {res.get('Max24HourSend')} emails")
            print(f"       Sent in last 24h:   {res.get('SentLast24Hours')} emails")
        except Exception as e:
            print(f"  [ERROR] SES API call failed: {e}")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_credentials()
