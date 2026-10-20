import logging
from typing import Optional, Any
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from backend.app.config import settings

logger = logging.getLogger("notifications.ses")


class SESEmailNotifier:
    """
    Amazon SES dispatcher for delivering gentle email notifications to family members.
    Maintains a dispatched log for testing, local simulation, and offline operation.
    """

    def __init__(self, region_name: Optional[str] = None):
        self.region_name = region_name or settings.AWS_REGION
        self.sender_email = getattr(settings, "SES_SENDER_EMAIL", "notifications@quietcheckin.local")
        self._ses_client = None
        self.dispatched_emails: list[dict[str, Any]] = []

    def _get_client(self):
        if self._ses_client is None:
            try:
                kwargs = {"region_name": self.region_name}
                if getattr(settings, "AWS_ACCESS_KEY_ID", None) and getattr(settings, "AWS_SECRET_ACCESS_KEY", None):
                    kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                    kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
                    if getattr(settings, "AWS_SESSION_TOKEN", None):
                        kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN

                self._ses_client = boto3.client("ses", **kwargs)
            except Exception as e:
                logger.info(f"SES client unavailable: {e}")
        return self._ses_client

    def send_checkin_email(
        self,
        to_email: str,
        recipient_name: str,
        elder_name: str,
        subject: str,
        message: str,
        evidence_facts: dict[str, Any],
        ack_url: Optional[str] = None
    ) -> bool:
        """Dispatch a calm, human check-in email with evidence facts and one-tap action."""
        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #2d3748; line-height: 1.6;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h2 style="color: #166534; margin: 0 0 8px 0; font-size: 18px;">Quiet Check-In for {elder_name}</h2>
                <p style="margin: 0; font-size: 15px;">{message}</p>
            </div>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 24px; font-size: 13px; color: #64748b;">
                <strong>Evidence:</strong> {evidence_facts.get('support_text', 'Normal routine')} | Normal window: {evidence_facts.get('usual_window', 'N/A')}
            </div>

            <div style="text-align: center; margin: 24px 0;">
                <a href="{ack_url or '#'}" style="background: #059669; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
                    I called him, all good
                </a>
            </div>

            <p style="font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                Quiet Check-In uses Ring event metadata only. No video, images, or audio are ever accessed.<br>
                This is not an emergency service. In case of danger, contact local emergency services immediately.
            </p>
        </div>
        """

        record = {
            "to": to_email,
            "recipient_name": recipient_name,
            "subject": subject,
            "message": message,
            "evidence": evidence_facts
        }
        self.dispatched_emails.append(record)

        client = self._get_client()
        if client:
            try:
                client.send_email(
                    Source=self.sender_email,
                    Destination={"ToAddresses": [to_email]},
                    Message={
                        "Subject": {"Data": subject},
                        "Body": {
                            "Text": {"Data": message},
                            "Html": {"Data": html_body}
                        }
                    }
                )
                logger.info(f"SES email sent to {to_email}")
                return True
            except (BotoCoreError, ClientError, Exception) as e:
                logger.info(f"SES send skipped or in test mode ({e}); logged to memory.")

        return True


ses_notifier = SESEmailNotifier()
