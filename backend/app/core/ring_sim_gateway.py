from typing import Any, Optional
from backend.app.core.gateway import RingGateway
from backend.app.core.ring_sim import RingTwinSimulator
from backend.app.core.verifier import verify_ring_signature


class RingSimGateway(RingGateway):
    """
    Simulation implementation of RingGateway powered by the Ring Twin simulator.
    Provides synthetic devices and historical events without requiring live Ring cloud access.
    """

    def __init__(self, simulator: Optional[RingTwinSimulator] = None, hmac_key: str = "staging_ring_hmac_secret_key_demo_2026"):
        self.simulator = simulator or RingTwinSimulator(hmac_key=hmac_key)
        self.hmac_key = hmac_key

    def list_devices(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "doorbell_front",
                "type": "devices",
                "attributes": {
                    "kind": "doorbell",
                    "description": "Front Doorbell",
                    "status": {"online": True}
                }
            },
            {
                "id": "sensor_backdoor",
                "type": "devices",
                "attributes": {
                    "kind": "contact_sensor",
                    "description": "Back Patio Contact Sensor",
                    "status": {"online": True, "contact_detection": {"faulted": False}}
                }
            }
        ]

    def get_event_history(
        self,
        device_id: str,
        event_types: Optional[str] = None,
        page_key: Optional[str] = None
    ) -> list[dict[str, Any]]:
        raw_history = self.simulator.generate_history_backfill(days=7)
        # Filter for this device
        return [
            e for e in raw_history
            if e["data"]["attributes"]["source"] == device_id
        ]

    def refresh_access_token(self, refresh_token: str) -> dict[str, Any]:
        return {
            "access_token": "simulated_access_token_valid_4h",
            "expires_in": 14400,
            "refresh_token": "simulated_refresh_token_valid_30d"
        }

    def verify_webhook(self, raw_body: bytes, header: Optional[str]) -> bool:
        return verify_ring_signature(raw_body, header, self.hmac_key)
