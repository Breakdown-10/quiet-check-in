import json
import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from backend.app.config import settings
from backend.app.core.verifier import generate_ring_signature
from backend.app.clock import Clock, VirtualClock


class RingTwinSimulator:
    """
    The 'Ring Twin' simulator: models an elder's daily rhythm and generates
    cryptographically signed Ring v1.1 Webhook payloads.
    
    Supports:
    - Persona-based daily event generation with Gaussian jitter
    - 21-day history pre-seeding (backfill path)
    - Fault injection: duplicates, bad signatures, drops, device offline
    - Virtual Clock stepping for demo scenarios
    """

    def __init__(self, clock: Optional[Clock] = None, hmac_key: Optional[str] = None):
        self.clock = clock or VirtualClock()
        self.hmac_key = hmac_key or settings.RING_HMAC_KEY
        self.account_id = "ring_acc_frank_phoenix_01"
        self.devices = {
            "front_doorbell": "doorbell_front",
            "back_door": "sensor_backdoor",
            "medicine_cabinet": "sensor_medicine",
            "kitchen_motion": "motion_kitchen"
        }


    def create_event_payload(
        self,
        event_type: str,
        device_id: str,
        timestamp: datetime,
        sub_type: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> dict:
        """Create a compliant Ring v1.1 Webhook JSON dictionary."""
        req_id = request_id or f"req-{uuid.uuid4().hex[:12]}"
        epoch_ms = int(timestamp.timestamp() * 1000)

        data_obj = {
            "id": f"event_{uuid.uuid4().hex[:12]}",
            "type": event_type,
            "attributes": {
                "source": device_id,
                "source_type": "devices",
                "timestamp": epoch_ms
            },
            "relationships": {
                "devices": {
                    "links": {"self": f"/v1/devices/{device_id}"}
                }
            }
        }
        if sub_type:
            data_obj["subType"] = sub_type

        return {
            "meta": {
                "version": "1.1",
                "time": timestamp.isoformat(),
                "request_id": req_id,
                "account_id": self.account_id
            },
            "data": data_obj
        }

    def build_signed_webhook(
        self,
        event_type: str,
        device_id: str,
        timestamp: datetime,
        sub_type: Optional[str] = None,
        request_id: Optional[str] = None,
        tamper: bool = False
    ) -> tuple[bytes, str]:
        """
        Builds raw UTF-8 JSON bytes and the corresponding X-Signature header.
        If tamper is True, introduces a bad signature for testing rejection.
        """
        payload_dict = self.create_event_payload(
            event_type=event_type,
            device_id=device_id,
            timestamp=timestamp,
            sub_type=sub_type,
            request_id=request_id
        )
        raw_body = json.dumps(payload_dict).encode("utf-8")
        
        if tamper:
            sig_header = "sha256=bad000000000000000000000000000000000000000000000000000000000dead"
        else:
            sig_header = generate_ring_signature(raw_body, self.hmac_key)
            
        return raw_body, sig_header

    def generate_day_events(
        self,
        date_target: datetime,
        offset_hours: float = -7.0,
        skip_paper: bool = False,
        jitter_seed: Optional[int] = None
    ) -> list[dict]:
        """
        Generates simulated daily events for Frank's personalized routine:
        - 07:10 AM ± 10m: Kitchen motion (Breakfast & Wakeup)
        - 07:35 AM ± 12m: Back patio door opens (Garden walk)
        - 08:15 AM ± 10m: Medicine cabinet opens (Daily medication adherence)
        - 08:45 AM ± 15m: Front doorbell motion (Paper pickup / porch)
        - 13:30 PM ± 20m: Back patio check (Afternoon check)
        - 20:30 PM ± 15m: Back patio check (Evening lockup routine)
        """
        if jitter_seed is not None:
            random.seed(jitter_seed)

        events = []
        base_midnight_local = datetime(date_target.year, date_target.month, date_target.day, 0, 0, 0)
        midnight_utc = base_midnight_local - timedelta(hours=offset_hours)
        midnight_utc = midnight_utc.replace(tzinfo=timezone.utc)

        # 1. Kitchen motion (Morning Wake & Breakfast: ~07:10 AM)
        kitchen_min = 7 * 60 + 10 + int(random.gauss(0, 8))
        t0 = midnight_utc + timedelta(minutes=kitchen_min)
        events.append(self.create_event_payload("motion_detected", self.devices["kitchen_motion"], t0, sub_type="human"))

        # 2. Back patio morning walk (~07:35 AM)
        backdoor_min = 7 * 60 + 35 + int(random.gauss(0, 10))
        t1 = midnight_utc + timedelta(minutes=backdoor_min)
        events.append(self.create_event_payload("contact_sensor_faulted", self.devices["back_door"], t1))
        events.append(self.create_event_payload("contact_sensor_cleared", self.devices["back_door"], t1 + timedelta(seconds=45)))

        # 3. Morning Medication check (~08:15 AM)
        if not skip_paper:
            med_min = 8 * 60 + 15 + int(random.gauss(0, 8))
            t_med = midnight_utc + timedelta(minutes=med_min)
            events.append(self.create_event_payload("contact_sensor_faulted", self.devices["medicine_cabinet"], t_med))
            events.append(self.create_event_payload("contact_sensor_cleared", self.devices["medicine_cabinet"], t_med + timedelta(seconds=30)))

        # 4. Front door motion / Paper pickup (~08:45 AM)
        if not skip_paper:
            paper_min = 8 * 60 + 45 + int(random.gauss(0, 12))
            t2 = midnight_utc + timedelta(minutes=paper_min)
            events.append(self.create_event_payload(
                "motion_detected",
                self.devices["front_doorbell"],
                t2,
                sub_type="human"
            ))

        # 5. Afternoon patio walk (~13:30 PM, 85% probability)
        if random.random() > 0.15:
            afternoon_min = 13 * 60 + 30 + int(random.gauss(0, 15))
            t3 = midnight_utc + timedelta(minutes=afternoon_min)
            events.append(self.create_event_payload("contact_sensor_faulted", self.devices["back_door"], t3))
            events.append(self.create_event_payload("contact_sensor_cleared", self.devices["back_door"], t3 + timedelta(seconds=60)))

        # 6. Evening lockup (~20:30 PM)
        evening_min = 20 * 60 + 30 + int(random.gauss(0, 10))
        t4 = midnight_utc + timedelta(minutes=evening_min)
        events.append(self.create_event_payload("contact_sensor_faulted", self.devices["back_door"], t4))
        events.append(self.create_event_payload("contact_sensor_cleared", self.devices["back_door"], t4 + timedelta(seconds=30)))

        events.sort(key=lambda e: e["data"]["attributes"]["timestamp"])
        return events


    def generate_history_backfill(
        self,
        days: int = 21,
        end_date: Optional[datetime] = None,
        offset_hours: float = -7.0
    ) -> list[dict]:
        """
        Generate realistic historical events spanning the last N days
        to establish a mature baseline for the routine intelligence engine.
        """
        if end_date is None:
            end_date = self.clock.now()

        all_events = []
        for d in range(days, 0, -1):
            day_target = end_date - timedelta(days=d)
            # Occasional variation: 5% chance of skipping paper pickup in past history
            skip = random.random() < 0.05
            day_events = self.generate_day_events(day_target, offset_hours=offset_hours, skip_paper=skip)
            all_events.extend(day_events)

        return all_events
