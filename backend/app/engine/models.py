from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class RingEventType(str, Enum):
    MOTION_DETECTED = "motion_detected"
    BUTTON_PRESS = "button_press"
    CONTACT_SENSOR_FAULTED = "contact_sensor_faulted"
    CONTACT_SENSOR_CLEARED = "contact_sensor_cleared"
    DEVICE_ONLINE = "device_online"
    DEVICE_OFFLINE = "device_offline"
    TAMPER_DETECTED = "tamper_detected"
    TAMPER_CLEARED = "tamper_cleared"


class MotionSubType(str, Enum):
    HUMAN = "human"
    MOTION = "motion"
    VEHICLE = "vehicle"
    OTHER_MOTION = "other_motion"


class RingMeta(BaseModel):
    version: str = "1.1"
    time: str
    request_id: str
    account_id: str


class RingAttributes(BaseModel):
    source: str  # device_id
    source_type: str = "devices"
    timestamp: int  # epoch milliseconds


class RingData(BaseModel):
    id: str
    type: str
    subType: Optional[str] = None
    attributes: RingAttributes
    relationships: Optional[dict[str, Any]] = None


class RingWebhookPayload(BaseModel):
    """Ring Webhook v1.1 incoming payload structure."""
    meta: RingMeta
    data: RingData


class SignalKind(str, Enum):
    DOORBELL_PRESS = "doorbell_press"
    HUMAN_MOTION = "human_motion"
    MOTION = "motion"
    DOOR_OPEN = "door_open"
    DOOR_CLOSED = "door_closed"
    DEVICE_ONLINE = "device_online"
    DEVICE_OFFLINE = "device_offline"


class Signal(BaseModel):
    """
    Internal normalized signal representing routine-relevant metadata.
    Data minimization principle: only timestamps and device labels are stored.
    Zero video, audio, or visual content is ever captured.
    """
    circle_id: str
    device_id: str
    kind: SignalKind
    sub_type: Optional[str] = None
    ts_utc: datetime
    local_minutes: int = Field(
        ...,
        description="Minutes elapsed since local midnight (0 to 1439) in elder's timezone"
    )
    request_id: str

    @property
    def hour_float(self) -> float:
        """Returns the time as a float (e.g., 7:30 AM -> 7.5)."""
        return self.local_minutes / 60.0


def normalize_ring_payload(payload: RingWebhookPayload, circle_id: str, timezone_offset_hours: float = 0.0) -> Signal:
    """
    Normalize an incoming Ring v1.1 Webhook payload into an internal Signal.
    Converts epoch ms to UTC datetime and calculates minutes from local midnight.
    """
    epoch_ms = payload.data.attributes.timestamp
    ts_utc = datetime.fromtimestamp(epoch_ms / 1000.0, tz=timezone.utc)
    
    # Calculate local minutes from midnight based on elder's timezone offset
    total_seconds = (ts_utc.hour * 3600 + ts_utc.minute * 60 + ts_utc.second) + int(timezone_offset_hours * 3600)
    local_minutes = (total_seconds // 60) % 1440

    event_type = payload.data.type
    sub_type = payload.data.subType

    if event_type == RingEventType.BUTTON_PRESS:
        kind = SignalKind.DOORBELL_PRESS
    elif event_type == RingEventType.MOTION_DETECTED:
        if sub_type == MotionSubType.HUMAN:
            kind = SignalKind.HUMAN_MOTION
        else:
            kind = SignalKind.MOTION
    elif event_type == RingEventType.CONTACT_SENSOR_FAULTED:
        kind = SignalKind.DOOR_OPEN
    elif event_type == RingEventType.CONTACT_SENSOR_CLEARED:
        kind = SignalKind.DOOR_CLOSED
    elif event_type == RingEventType.DEVICE_OFFLINE:
        kind = SignalKind.DEVICE_OFFLINE
    elif event_type == RingEventType.DEVICE_ONLINE:
        kind = SignalKind.DEVICE_ONLINE
    else:
        kind = SignalKind.MOTION

    return Signal(
        circle_id=circle_id,
        device_id=payload.data.attributes.source,
        kind=kind,
        sub_type=sub_type,
        ts_utc=ts_utc,
        local_minutes=local_minutes,
        request_id=payload.meta.request_id
    )
