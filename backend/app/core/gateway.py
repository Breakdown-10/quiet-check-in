from typing import Protocol, Any, Optional, runtime_checkable
from datetime import datetime


@runtime_checkable
class RingGateway(Protocol):
    """Abstract interface defining the contract for both LIVE and SIM Ring adapters."""

    def list_devices(self) -> list[dict[str, Any]]:
        """List Ring devices shared with the integration."""
        ...

    def get_event_history(
        self,
        device_id: str,
        event_types: Optional[str] = None,
        page_key: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Retrieve historical event metadata for a specific device."""
        ...

    def refresh_access_token(self, refresh_token: str) -> dict[str, Any]:
        """Proactively refresh OAuth token using refresh_token grant."""
        ...

    def verify_webhook(self, raw_body: bytes, header: Optional[str]) -> bool:
        """Verify authenticity of incoming Ring webhook payload."""
        ...
