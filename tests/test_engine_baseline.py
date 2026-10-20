from datetime import datetime, timezone, timedelta
import pytest
from backend.app.engine.baseline import extract_anchors_from_signals, compute_mad
from backend.app.engine.models import Signal, SignalKind


def test_mad_calculation():
    import numpy as np
    data = np.array([10, 12, 11, 13, 12, 100])  # 100 is an outlier
    mad = compute_mad(data)
    # Median is 12. Differences: |10-12|=2, |12-12|=0, |11-12|=1, |13-12|=1, |12-12|=0, |100-12|=88
    # Sorted diffs: [0, 0, 1, 1, 2, 88]. Median is 1.0.
    assert mad == 1.0


def test_anchor_extraction_from_consistent_signals():
    circle_id = "test_circle_1"
    device_id = "doorbell_front"
    signals = []

    # Generate 20 days of signals at 8:00 AM (480 minutes) with minor jitter (± 10 min)
    base_date = datetime(2026, 10, 1, 0, 0, 0, tzinfo=timezone.utc)
    for day_idx in range(20):
        day_ts = base_date + timedelta(days=day_idx, hours=8, minutes=day_idx % 5)
        signals.append(Signal(
            circle_id=circle_id,
            device_id=device_id,
            kind=SignalKind.HUMAN_MOTION,
            sub_type="human",
            ts_utc=day_ts,
            local_minutes=480 + (day_idx % 5),
            request_id=f"req-hist-{day_idx}"
        ))

    anchors = extract_anchors_from_signals(
        signals=signals,
        circle_id=circle_id,
        device_labels={device_id: "Front Doorbell"},
        min_support_ratio=0.60,
        lookback_days=20
    )

    assert len(anchors) == 1
    anchor = anchors[0]
    assert anchor.circle_id == circle_id
    assert anchor.device_id == device_id
    assert anchor.signal_kind == SignalKind.HUMAN_MOTION
    assert anchor.support_days == 20
    assert anchor.reliability == 1.0
    # Window should comfortably surround 8:00 AM (480 min)
    assert anchor.window_start_min <= 480 <= anchor.window_end_min
    assert anchor.grace_min == 30


def test_sparse_signals_do_not_form_anchor():
    circle_id = "test_circle_2"
    device_id = "random_sensor"
    signals = []

    # Only 3 days of events out of 20 days (15% support, well below 60% threshold)
    base_date = datetime(2026, 10, 1, 0, 0, 0, tzinfo=timezone.utc)
    for day_idx in [1, 5, 12]:
        signals.append(Signal(
            circle_id=circle_id,
            device_id=device_id,
            kind=SignalKind.DOOR_OPEN,
            ts_utc=base_date + timedelta(days=day_idx, hours=10),
            local_minutes=600,
            request_id=f"req-sparse-{day_idx}"
        ))

    anchors = extract_anchors_from_signals(
        signals=signals,
        circle_id=circle_id,
        min_support_ratio=0.60,
        lookback_days=20
    )

    assert len(anchors) == 0


def test_multi_peak_routine_discovery():
    """Verify that multiple daily routines on the same sensor form distinct anchors."""
    circle_id = "test_circle_multi"
    device_id = "sensor_backdoor"
    signals = []

    base_date = datetime(2026, 10, 1, 0, 0, 0, tzinfo=timezone.utc)
    # 20 days with morning patio check (07:15 AM = 435 min) AND evening lockup (08:30 PM = 1230 min)
    for day_idx in range(20):
        # Morning event (435m ± 5m)
        t_m = 435 + (day_idx % 5)
        signals.append(Signal(
            circle_id=circle_id,
            device_id=device_id,
            kind=SignalKind.DOOR_OPEN,
            ts_utc=base_date + timedelta(days=day_idx, minutes=t_m),
            local_minutes=t_m,
            request_id=f"req-m-{day_idx}"
        ))
        # Evening event (1230m ± 5m)
        t_e = 1230 + (day_idx % 5)
        signals.append(Signal(
            circle_id=circle_id,
            device_id=device_id,
            kind=SignalKind.DOOR_OPEN,
            ts_utc=base_date + timedelta(days=day_idx, minutes=t_e),
            local_minutes=t_e,
            request_id=f"req-e-{day_idx}"
        ))

    anchors = extract_anchors_from_signals(
        signals=signals,
        circle_id=circle_id,
        device_labels={device_id: "Back Patio"},
        min_support_ratio=0.60,
        lookback_days=20
    )

    # Should discover TWO distinct anchors instead of one giant 24h window
    assert len(anchors) == 2
    morning_anchor = anchors[0]
    evening_anchor = anchors[1]

    assert "Morning" in morning_anchor.name
    assert morning_anchor.window_start_min <= 435 <= morning_anchor.window_end_min
    # Window should be tight, NOT an all-day span
    assert (morning_anchor.window_end_min - morning_anchor.window_start_min) < 120

    assert "Evening" in evening_anchor.name
    assert evening_anchor.window_start_min <= 1230 <= evening_anchor.window_end_min
    assert (evening_anchor.window_end_min - evening_anchor.window_start_min) < 120

