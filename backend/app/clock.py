from datetime import datetime, timezone, timedelta
from typing import Protocol, runtime_checkable


@runtime_checkable
class Clock(Protocol):
    """Abstract clock protocol for decoupling system time from routine intelligence."""

    def now(self) -> datetime:
        """Return the current time (UTC aware)."""
        ...


class SystemClock:
    """Real system clock using current UTC time."""

    def now(self) -> datetime:
        return datetime.now(timezone.utc)


class VirtualClock:
    """Virtual clock for time-travel simulation, testing, and demo fast-forwarding."""

    def __init__(self, initial_time: datetime | None = None):
        if initial_time is None:
            # Default to 07:00 AM Phoenix time today (14:00 UTC) for demo start
            today = datetime.now(timezone.utc).date()
            self._current_time = datetime(today.year, today.month, today.day, 14, 0, tzinfo=timezone.utc)
        else:
            if initial_time.tzinfo is None:
                self._current_time = initial_time.replace(tzinfo=timezone.utc)
            else:
                self._current_time = initial_time

    def now(self) -> datetime:
        return self._current_time

    def advance(self, delta: timedelta) -> datetime:
        """Advance the virtual clock by a given timedelta."""
        self._current_time += delta
        return self._current_time

    def advance_minutes(self, minutes: float) -> datetime:
        """Convenience method to advance clock by N minutes."""
        return self.advance(timedelta(minutes=minutes))

    def set_time(self, new_time: datetime) -> None:
        """Explicitly set the virtual clock to a specific timestamp."""
        if new_time.tzinfo is None:
            self._current_time = new_time.replace(tzinfo=timezone.utc)
        else:
            self._current_time = new_time


# Global clock instance used across services
global_clock = VirtualClock()
