from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel, Field
import numpy as np
from scipy.stats import gaussian_kde
from scipy.signal import find_peaks
from backend.app.engine.models import Signal, SignalKind


class DayType(str):
    WEEKDAY = "weekday"
    WEEKEND = "weekend"


class Anchor(BaseModel):
    """
    Learned daily behavioral anchor representing a regular daily routine.
    Example: 'Morning Medication' at Medicine Cabinet between 8:05 AM and 8:40 AM.
    """
    anchor_id: str
    circle_id: str
    device_id: str
    signal_kind: SignalKind
    day_type: str = "weekday"
    name: str
    window_start_min: int = Field(..., description="Minutes from local midnight (0..1439)")
    window_end_min: int = Field(..., description="Minutes from local midnight (0..1439)")
    grace_min: int = Field(default=30, description="Grace period before escalation")
    reliability: float = Field(..., description="Share of historical days with event inside window [0..1]")
    support_days: int = Field(..., description="Count of days where this anchor occurred")
    total_days: int = Field(..., description="Total sample days analyzed")
    window_widening_offset: int = Field(default=0, description="Learned widening from false-positive feedback")

    @property
    def effective_end_min(self) -> int:
        return self.window_end_min + self.window_widening_offset

    @property
    def deadline_min(self) -> int:
        return self.effective_end_min + self.grace_min

    def format_window(self) -> str:
        s_h, s_m = divmod(self.window_start_min, 60)
        e_h, e_m = divmod(self.effective_end_min, 60)
        s_ampm = "AM" if s_h < 12 else "PM"
        e_ampm = "AM" if e_h < 12 else "PM"
        s_h_12 = s_h if 1 <= s_h <= 12 else (s_h - 12 if s_h > 12 else 12)
        e_h_12 = e_h if 1 <= e_h <= 12 else (e_h - 12 if e_h > 12 else 12)
        return f"{s_h_12}:{s_m:02d} {s_ampm} - {e_h_12}:{e_m:02d} {e_ampm}"


def compute_mad(data: np.ndarray) -> float:
    """Compute Median Absolute Deviation (MAD)."""
    if len(data) == 0:
        return 0.0
    median = np.median(data)
    return float(np.median(np.abs(data - median)))


def derive_contextual_anchor_name(device_id: str, dev_label: str, kind: SignalKind, median_time: float) -> str:
    """Generate human-readable, non-hardcoded routine names based on time-of-day and device context."""
    if 300 <= median_time < 720:
        time_period = "Morning"
    elif 720 <= median_time < 1020:
        time_period = "Afternoon"
    elif 1020 <= median_time < 1320:
        time_period = "Evening"
    else:
        time_period = "Night"

    dev_lower = dev_label.lower()
    dev_id_lower = device_id.lower()

    if "medicine" in dev_lower or "medicine" in dev_id_lower or "cabinet" in dev_lower:
        return f"{time_period} Medication Adherence"
    elif "kitchen" in dev_lower or "kitchen" in dev_id_lower:
        return f"{time_period} Kitchen Routine"
    elif "doorbell" in dev_lower or "doorbell" in dev_id_lower or "porch" in dev_lower:
        return f"{time_period} Front Porch Activity"
    elif "patio" in dev_lower or "patio" in dev_id_lower or "back" in dev_lower:
        return f"{time_period} Patio Check"
    elif "hallway" in dev_lower or "hallway" in dev_id_lower:
        return f"{time_period} Hallway Movement"
    elif kind == SignalKind.DOOR_OPEN:
        return f"{time_period} {dev_label} Opening"
    elif kind == SignalKind.HUMAN_MOTION:
        return f"{time_period} {dev_label} Movement"
    else:
        return f"{time_period} {dev_label} Routine"


def extract_anchors_from_signals(
    signals: list[Signal],
    circle_id: str,
    device_labels: Optional[dict[str, str]] = None,
    min_support_ratio: float = 0.60,
    lookback_days: int = 21
) -> list[Anchor]:
    """
    Extract routine anchors using Kernel Density Estimation (KDE) and MAD math.
    
    Algorithm:
    1. Group signals by (device_id, signal_kind).
    2. Convert times to minutes after local midnight [0, 1439].
    3. Run Gaussian Kernel Density Estimation over the 1440-minute day to discover natural density peaks.
    4. Isolate distinct multi-peak clusters (e.g. morning patio walk vs. evening lockup).
    5. Each peak occurring on >= 60% of comparable days becomes a dedicated Anchor.
    6. Compute dynamic tolerance window: median ± max(30 min, 2.5 * 1.4826 * MAD).
    7. Generate contextual, dynamic labels based on time-of-day and sensor placement.
    """
    device_labels = device_labels or {}
    if not signals:
        return []

    # Group signals by (device_id, signal_kind)
    routine_kinds = {
        SignalKind.DOORBELL_PRESS,
        SignalKind.HUMAN_MOTION,
        SignalKind.MOTION,
        SignalKind.DOOR_OPEN
    }

    groups: dict[tuple[str, SignalKind], list[Signal]] = {}
    for s in signals:
        if s.kind in routine_kinds:
            key = (s.device_id, s.kind)
            groups.setdefault(key, []).append(s)


    anchors = []

    for (device_id, kind), sig_list in groups.items():
        if len(sig_list) < 5:
            continue

        # Partition signals by date to track daily recurrence
        date_map: dict[str, list[int]] = {}
        for s in sig_list:
            date_key = s.ts_utc.strftime("%Y-%m-%d")
            date_map.setdefault(date_key, []).append(s.local_minutes)

        total_days = max(lookback_days, len(date_map))
        if len(date_map) / total_days < min_support_ratio:
            continue

        times = np.array([s.local_minutes for s in sig_list], dtype=float)

        # Multi-peak routine discovery via Gaussian KDE
        unique_times = np.unique(times)
        if len(unique_times) <= 1:
            peaks = [int(unique_times[0])]
        else:
            grid = np.arange(0, 1440, 5)  # 5-minute sampling resolution
            std_val = float(np.std(times))
            bw = max(0.04, min(0.35, 25.0 / std_val if std_val > 0 else 0.1))
            kde = gaussian_kde(times, bw_method=bw)
            density = kde(grid)
            max_d = float(np.max(density))

            peak_indices, _ = find_peaks(
                density,
                height=max_d * 0.15,
                prominence=max_d * 0.10,
                distance=12  # Minimum 60 minutes between distinct routines on the same sensor
            )

            if len(peak_indices) == 0:
                peaks = [int(np.median(times))]
            else:
                peaks = [int(grid[idx]) for idx in peak_indices]

        # Evaluate each discovered temporal routine peak
        cluster_radius = 80  # Minutes around the density peak
        dev_label = device_labels.get(device_id, device_id.replace("_", " ").title())

        for peak_min in peaks:
            # Days that had an event in this peak's cluster
            matching_days = [
                d for d, d_times in date_map.items()
                if any(abs(t - peak_min) <= cluster_radius for t in d_times)
            ]
            support_days = len(matching_days)
            support_ratio = support_days / total_days

            if support_ratio < min_support_ratio:
                continue

            # Points strictly belonging to this peak cluster
            cluster_times = np.array([t for t in times if abs(t - peak_min) <= cluster_radius])
            if len(cluster_times) == 0:
                continue

            median_time = float(np.median(cluster_times))
            mad = compute_mad(cluster_times)

            # Statistical dynamic tolerance bounds: Median ± max(30m, 2.5 * 1.4826 * MAD)
            spread = max(30.0, 2.5 * 1.4826 * mad)
            start_min = max(0, int(median_time - spread))
            end_min = min(1439, int(median_time + spread))

            # Reliability: percentage of active cluster days with an event inside the learned window
            days_in_window = sum(
                1 for d in matching_days
                if any(start_min <= t <= end_min for t in date_map[d])
            )
            reliability = round(days_in_window / support_days, 2)

            anchor_name = derive_contextual_anchor_name(device_id, dev_label, kind, median_time)
            anchor_id = f"anchor_{device_id}_{kind.value}_{int(median_time // 60):02d}{int(median_time % 60):02d}"

            anchors.append(Anchor(
                anchor_id=anchor_id,
                circle_id=circle_id,
                device_id=device_id,
                signal_kind=kind,
                day_type="weekday",
                name=anchor_name,
                window_start_min=start_min,
                window_end_min=end_min,
                grace_min=30,
                reliability=reliability,
                support_days=support_days,
                total_days=total_days
            ))

    # Sort anchors chronologically by window start time
    anchors.sort(key=lambda a: a.window_start_min)
    return anchors
