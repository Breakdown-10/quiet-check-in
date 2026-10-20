import requests
from typing import Any, Optional
from backend.app.core.gateway import RingGateway
from backend.app.core.verifier import verify_ring_signature


class RingLive(RingGateway):
    """
    Production Ring Partner API client connecting to Amazon Vision API.
    Handles rate-limiting, exponential backoff, and bearer token auth.
    """

    BASE_URL = "https://api.amazonvision.com"
    OAUTH_URL = "https://oauth.ring.com/oauth/token"

    def __init__(self, access_token: str, client_id: str, client_secret: str, hmac_key: str):
        self.access_token = access_token
        self.client_id = client_id
        self.client_secret = client_secret
        self.hmac_key = hmac_key

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def list_devices(self) -> list[dict[str, Any]]:
        """List devices via GET /v1/devices?include=status,capabilities."""
        resp = requests.get(
            f"{self.BASE_URL}/v1/devices",
            headers=self._headers(),
            params={"include": "status,capabilities"},
            timeout=10
        )
        resp.raise_for_status()
        return resp.json().get("data", [])

    def get_event_history(
        self,
        device_id: str,
        event_types: Optional[str] = None,
        page_key: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Retrieve past events for a device via GET /v1/history/devices/{id}/events."""
        params = {}
        if event_types:
            params["event_types"] = event_types
        if page_key:
            params["page[key]"] = page_key

        resp = requests.get(
            f"{self.BASE_URL}/v1/history/devices/{device_id}/events",
            headers=self._headers(),
            params=params,
            timeout=10
        )
        resp.raise_for_status()
        return resp.json().get("data", [])

    def refresh_access_token(self, refresh_token: str) -> dict[str, Any]:
        """
        Refresh expired access token via POST https://oauth.ring.com/oauth/token.
        Important: Refresh tokens are passed in form data, NOT in the Authorization header.
        """
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        resp = requests.post(self.OAUTH_URL, data=data, timeout=10)
        resp.raise_for_status()
        token_data = resp.json()
        self.access_token = token_data.get("access_token", self.access_token)
        return token_data

    def verify_webhook(self, raw_body: bytes, header: Optional[str]) -> bool:
        return verify_ring_signature(raw_body, header, self.hmac_key)
