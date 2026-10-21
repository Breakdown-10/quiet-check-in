"""
Quiet Check-In — Amazon Bedrock & SES Diagnostic Verification Tool
Run: python scripts/test_aws.py
"""
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.config import settings
from backend.app.agent.narrator import narrator_agent
from backend.app.notifications.ses_notifier import ses_notifier

def run_diagnostics():
    print("=" * 70)
    print("Quiet Check-In — AWS Bedrock & SES Diagnostics")
    print("=" * 70)
    print(f"AWS Region:             {settings.AWS_REGION}")
    print(f"Configured Model ID:    {settings.BEDROCK_MODEL_ID}")
    print(f"SES Sender Email:       {settings.SES_SENDER_EMAIL}")
    
    key_preview = settings.AWS_ACCESS_KEY_ID[:4] + "..." if settings.AWS_ACCESS_KEY_ID else "NOT SET"
    print(f"AWS Access Key ID:      {key_preview}")
    print("-" * 70)

    # 1. Direct Amazon Bedrock Converse Verification
    print("\n[1] Testing Amazon Bedrock Runtime Connection & Model Access...")
    client = narrator_agent._get_client()
    if not client or not settings.AWS_ACCESS_KEY_ID:
        print("  [!] AWS credentials not found in .env; system is running in local fallback mode.")
    else:
        candidate_models = narrator_agent._get_candidate_models()
        bedrock_success = False

        for model_id in candidate_models:
            print(f"  Attempting Converse with: {model_id} ...")
            try:
                res = client.converse(
                    modelId=model_id,
                    messages=[{"role": "user", "content": [{"text": "Say 'Quiet Check-In AI connected' in under 8 words."}]}],
                    inferenceConfig={"maxTokens": 40, "temperature": 0.1}
                )
                output_text = res["output"]["message"]["content"][0]["text"].strip()
                print(f"  [OK] Amazon Bedrock LIVE RESPONSE from {model_id}:")
                print(f"       \"{output_text}\"")
                bedrock_success = True
                break
            except Exception as e:
                err_type = type(e).__name__
                err_msg = str(e)
                print(f"  [-] Model {model_id} failed ({err_type}): {err_msg}")

        if not bedrock_success:
            print("\n  [DIAGNOSIS & ACTION REQUIRED FOR BEDROCK]:")
            print("  Bedrock requests could not reach live inference. Causes and solutions:")
            print("  1. AccessDeniedException for Claude Haiku 5.5:")
            print("     -> Open AWS Console -> Bedrock -> Model access")
            print("     -> URL: https://console.aws.amazon.com/bedrock/home?region=" + settings.AWS_REGION + "#/modelaccess")
            print("     -> Click 'Modify model access' and enable 'Anthropic Claude Haiku 5.5'.")
            print("  2. ThrottlingException ('Too many tokens per day'):")
            print("     -> Your AWS Bedrock account has hit its daily token quota.")
            print("     -> This resets at 00:00 UTC, or you can request a quota increase in AWS Service Quotas.")
            print("  3. Quiet Check-In Safety:")
            print("     -> Quiet Check-In seamlessly serves safe, deterministic routine answers without dropping alerts.")

    # 2. Family Q&A Chat Pipeline Test
    print("\n[2] Testing Family Q&A Chat Pipeline (Bedrock + Deterministic Fallback)...")
    reply, source = narrator_agent.answer_family_question_with_source(
        circle_id=settings.DEMO_CIRCLE_ID,
        question="Did Frank pick up his morning paper today?"
    )
    print(f"  Response source: [{source.upper()}]")
    print(f"  Reply content:   \"{reply}\"")

    # 3. SES Connection Test
    print("\n[3] Testing Amazon SES (Simple Email Service)...")
    ses_client = ses_notifier._get_client()
    if not ses_client or not settings.AWS_ACCESS_KEY_ID:
        print("  [!] SES in local mode (emails logged to memory only).")
    else:
        try:
            quota = ses_client.get_send_quota()
            print(f"  [OK] SES Connection successful!")
            print(f"       Max 24h Send Quota: {quota.get('Max24HourSend')} emails")
            print(f"       Sent in last 24h:   {quota.get('SentLast24Hours')} emails")
        except Exception as e:
            print(f"  [-] SES API call failed ({type(e).__name__}): {e}")

    print("\n" + "=" * 70)

if __name__ == "__main__":
    run_diagnostics()
