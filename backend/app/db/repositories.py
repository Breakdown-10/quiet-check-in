from datetime import datetime, timezone, timedelta
from typing import Optional
from backend.app.engine.models import Signal
from backend.app.engine.baseline import Anchor
from backend.app.engine.escalation import Alert


class InMemoryRepository:
    """
    In-memory storage repository implementing the single-table DynamoDB access patterns.
    Provides instant, zero-latency persistence for tests, local simulation, and demo mode.
    """

    def __init__(self):
        self._processed_requests: dict[str, float] = {}  # request_id -> expiry_timestamp
        self._signals: list[Signal] = []
        self._circles: dict[str, dict] = {}
        self._devices: dict[str, list[dict]] = {}
        self._baseline_anchors: dict[str, list[Anchor]] = {}
        self._alerts: list[Alert] = []
        self._acknowledged_anchors_today: dict[str, set[str]] = {}  # circle_id -> set of anchor_ids

    # --- Idempotency Deduplication ---
    def is_request_processed(self, request_id: str) -> bool:
        now = datetime.now(timezone.utc).timestamp()
        if request_id in self._processed_requests:
            if self._processed_requests[request_id] > now:
                return True
            else:
                del self._processed_requests[request_id]
        return False

    def mark_request_processed(self, request_id: str, ttl_seconds: int = 172800) -> None:
        expiry = datetime.now(timezone.utc).timestamp() + ttl_seconds
        self._processed_requests[request_id] = expiry

    # --- Signal Persistence ---
    def store_signal(self, signal: Signal) -> None:
        self._signals.append(signal)

    def get_signals_for_circle(
        self,
        circle_id: str,
        start_utc: Optional[datetime] = None,
        end_utc: Optional[datetime] = None
    ) -> list[Signal]:
        results = [s for s in self._signals if s.circle_id == circle_id]
        if start_utc:
            results = [s for s in results if s.ts_utc >= start_utc]
        if end_utc:
            results = [s for s in results if s.ts_utc <= end_utc]
        results.sort(key=lambda s: s.ts_utc)
        return results

    def get_recent_signals(self, circle_id: str, hours: float = 24.0, as_of: Optional[datetime] = None) -> list[Signal]:
        if as_of is None:
            as_of = datetime.now(timezone.utc)
        start = as_of - timedelta(hours=hours)
        return self.get_signals_for_circle(circle_id, start_utc=start, end_utc=as_of)

    # --- Anchors / Baseline ---
    def store_anchors(self, circle_id: str, anchors: list[Anchor]) -> None:
        self._baseline_anchors[circle_id] = anchors

    def get_anchors(self, circle_id: str) -> list[Anchor]:
        return self._baseline_anchors.get(circle_id, [])

    def update_anchor(
        self,
        circle_id: str,
        anchor_id: str,
        name: Optional[str] = None,
        grace_min: Optional[int] = None
    ) -> Optional[Anchor]:
        for a in self.get_anchors(circle_id):
            if a.anchor_id == anchor_id:
                if name is not None and name.strip():
                    a.name = name.strip()
                if grace_min is not None and grace_min >= 0:
                    a.grace_min = grace_min
                return a
        return None

    def widen_anchor(self, circle_id: str, anchor_id: str, minutes: int = 15, max_offset: int = 90) -> None:
        for a in self.get_anchors(circle_id):
            if a.anchor_id == anchor_id:
                new_offset = min(max_offset, a.window_widening_offset + minutes)
                a.window_widening_offset = new_offset

    def mark_anchor_acknowledged(self, circle_id: str, anchor_id: str) -> None:
        self._acknowledged_anchors_today.setdefault(circle_id, set()).add(anchor_id)

    def get_acknowledged_anchors(self, circle_id: str) -> set[str]:
        return self._acknowledged_anchors_today.get(circle_id, set())

    # --- Alerts ---
    def store_alert(self, alert: Alert) -> None:
        # Update existing if matching ID, else append
        for idx, a in enumerate(self._alerts):
            if a.alert_id == alert.alert_id:
                self._alerts[idx] = alert
                return
        self._alerts.append(alert)

    def get_alerts(self, circle_id: str) -> list[Alert]:
        return [a for a in self._alerts if a.circle_id == circle_id]

    def get_alert(self, alert_id: str) -> Optional[Alert]:
        return next((a for a in self._alerts if a.alert_id == alert_id), None)

    # --- Circles & Devices ---
    def register_circle(
        self,
        circle_id: str,
        elder_name: str = "Frank",
        timezone_name: str = "America/Phoenix",
        offset_hours: float = -7.0,
        age: int = 78,
        city: str = "Phoenix, AZ",
        primary_contact_name: str = "Maya",
        primary_contact_email: str = "maya@family.local",
        secondary_contact_name: str = "Dr. Aris (Neighbor)",
        secondary_contact_email: str = "neighbor@local.net",
        default_grace_min: int = 30
    ) -> dict:
        data = {
            "circle_id": circle_id,
            "elder_name": elder_name,
            "age": age,
            "city": city,
            "timezone": timezone_name,
            "offset_hours": offset_hours,
            "primary_contact_name": primary_contact_name,
            "primary_contact_email": primary_contact_email,
            "secondary_contact_name": secondary_contact_name,
            "secondary_contact_email": secondary_contact_email,
            "default_grace_min": default_grace_min,
            "mode": "SIM",
            "away_until": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self._circles[circle_id] = data
        return data

    def get_circle(self, circle_id: str) -> Optional[dict]:
        return self._circles.get(circle_id)

    def update_circle(self, circle_id: str, updates: dict) -> Optional[dict]:
        if circle_id not in self._circles:
            return None
        self._circles[circle_id].update(updates)
        return self._circles[circle_id]

    def set_away_mode(self, circle_id: str, away_until_iso: Optional[str]) -> None:
        if circle_id in self._circles:
            self._circles[circle_id]["away_until"] = away_until_iso

    def register_device(self, circle_id: str, device_id: str, label: str, kind: str) -> dict:
        device = {
            "device_id": device_id,
            "circle_id": circle_id,
            "label": label,
            "kind": kind,
            "status": "online",
            "last_seen": datetime.now(timezone.utc).isoformat()
        }
        if circle_id not in self._devices:
            self._devices[circle_id] = []
        self._devices[circle_id].append(device)
        return device

    def get_devices(self, circle_id: str) -> list[dict]:
        return self._devices.get(circle_id, [])

    def clear(self) -> None:
        self._processed_requests.clear()
        self._signals.clear()
        self._circles.clear()
        self._devices.clear()
        self._baseline_anchors.clear()
        self._alerts.clear()
        self._acknowledged_anchors_today.clear()


# Global singleton instance for in-process lifecycle
repo = InMemoryRepository()
