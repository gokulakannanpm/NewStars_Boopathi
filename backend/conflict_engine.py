"""
Deterministic Timetable Conflict Detection Engine for EveHub.
Performs exact mathematical interval overlap checks between student commitments and events.
"""
from datetime import datetime, date, time
from typing import List, Dict, Any, Tuple
from models import ConflictDetectionResult

def parse_iso_datetime(dt_str: str) -> datetime | None:
    """Safely parse various ISO datetime formats."""
    if not dt_str:
        return None
    try:
        # Remove trailing Z if present for fromisoformat compatibility
        cleaned = dt_str.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)
    except Exception:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
            try:
                return datetime.strptime(dt_str, fmt)
            except ValueError:
                continue
    return None

def parse_time_str(time_str: str) -> time | None:
    """Parse HH:MM or HH:MM:SS format."""
    if not time_str:
        return None
    parts = time_str.strip().split(":")
    if len(parts) >= 2:
        try:
            return time(int(parts[0]), int(parts[1]))
        except ValueError:
            return None
    return None

def check_event_conflict(
    event_start_str: str,
    event_end_str: str,
    timetable_entries: List[Dict[str, Any]]
) -> ConflictDetectionResult:
    """
    Evaluates whether an event conflicts with any of the student's timetable commitments.
    
    Returns:
      - conflict: at least one commitment strictly overlaps in time.
      - no_conflict: checked commitments; no interval overlap exists.
      - unknown: event start/end is malformed or invalid.
    """
    event_start = parse_iso_datetime(event_start_str)
    event_end = parse_iso_datetime(event_end_str)

    if not event_start or not event_end:
        return ConflictDetectionResult(
            status="unknown",
            message="Event start or end time is missing or unparseable. Unable to determine conflict.",
            conflicting_entries=[],
            overlapping_intervals=[]
        )

    if event_end <= event_start:
        return ConflictDetectionResult(
            status="unknown",
            message="Event end time is before or equal to start time. Invalid schedule.",
            conflicting_entries=[],
            overlapping_intervals=[]
        )

    # Normalize timezones if naive
    if event_start.tzinfo is not None:
        event_start = event_start.replace(tzinfo=None)
    if event_end.tzinfo is not None:
        event_end = event_end.replace(tzinfo=None)

    conflicting_entries = []
    overlapping_intervals = []

    for entry in timetable_entries:
        entry_date_str = entry.get("date")
        start_time_str = entry.get("start_time")
        end_time_str = entry.get("end_time")

        if not entry_date_str or not start_time_str or not end_time_str:
            continue

        try:
            d_parts = [int(p) for p in entry_date_str.split("-")]
            entry_d = date(d_parts[0], d_parts[1], d_parts[2])
        except Exception:
            continue

        t_start = parse_time_str(start_time_str)
        t_end = parse_time_str(end_time_str)

        if not t_start or not t_end or t_end <= t_start:
            continue

        entry_start = datetime.combine(entry_d, t_start)
        entry_end = datetime.combine(entry_d, t_end)

        # Mathematical overlap condition: max(start1, start2) < min(end1, end2)
        overlap_start = max(event_start, entry_start)
        overlap_end = min(event_end, entry_end)

        if overlap_start < overlap_end:
            overlap_duration_min = int((overlap_end - overlap_start).total_seconds() / 60)
            overlap_desc = (
                f"{entry.get('title')} ({entry_date_str} {overlap_start.strftime('%I:%M %p')} - "
                f"{overlap_end.strftime('%I:%M %p')}, {overlap_duration_min} mins overlap)"
            )
            conflicting_entries.append({
                "id": entry.get("id"),
                "title": entry.get("title"),
                "type": entry.get("type", "commitment"),
                "date": entry_date_str,
                "start_time": start_time_str,
                "end_time": end_time_str,
                "notes": entry.get("notes"),
                "overlap_start": overlap_start.isoformat(),
                "overlap_end": overlap_end.isoformat(),
                "overlap_minutes": overlap_duration_min
            })
            overlapping_intervals.append(overlap_desc)

    if conflicting_entries:
        count = len(conflicting_entries)
        return ConflictDetectionResult(
            status="conflict",
            message=f"Schedule conflict detected with {count} commitment{'s' if count > 1 else ''}.",
            conflicting_entries=conflicting_entries,
            overlapping_intervals=overlapping_intervals
        )

    if not timetable_entries:
        return ConflictDetectionResult(
            status="no_conflict",
            message="No commitments found in your timetable for this date range.",
            conflicting_entries=[],
            overlapping_intervals=[]
        )

    return ConflictDetectionResult(
        status="no_conflict",
        message="No schedule conflicts detected. You are free during this event time.",
        conflicting_entries=[],
        overlapping_intervals=[]
    )

def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers."""
    import math
    R = 6371.0  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)
