import hashlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.supabase_client import sb_get, sb_head, sb_post

router = APIRouter(prefix="/analytics", tags=["analytics"])


class TrackEvent(BaseModel):
    event_type: str
    event_data: dict = {}
    page_path: str | None = None
    session_id: str | None = None
    referrer: str | None = None


@router.post("/track", status_code=204)
def track_event(event: TrackEvent, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()[:16]
    user_agent = request.headers.get("user-agent", "")

    try:
        sb_post("cbr_analytics", {
            "event_type": event.event_type,
            "event_data": event.event_data,
            "page_path": event.page_path,
            "session_id": event.session_id,
            "user_agent": user_agent,
            "referrer": event.referrer,
            "ip_hash": ip_hash,
        })
    except Exception:
        pass  # Analytics should never break the app


class AnalyticsSummary(BaseModel):
    total_events: int
    unique_sessions: int
    events_by_type: dict[str, int]
    daily_events: list[dict]


@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(days: int = 30):
    since = (datetime.now() - timedelta(days=days)).isoformat()

    total = sb_head("cbr_analytics", {"created_at": f"gte.{since}"})

    # Get recent events to compute stats from
    events = sb_get("cbr_analytics", {
        "created_at": f"gte.{since}",
        "select": "event_type,session_id,created_at",
        "limit": 10000,
    })

    sessions = set()
    type_counts: dict[str, int] = {}
    daily: dict[str, int] = {}

    for e in events:
        if e.get("session_id"):
            sessions.add(e["session_id"])
        et = e.get("event_type", "unknown")
        type_counts[et] = type_counts.get(et, 0) + 1
        day = e["created_at"][:10]
        daily[day] = daily.get(day, 0) + 1

    daily_events = [{"date": d, "count": c} for d, c in sorted(daily.items())]

    return AnalyticsSummary(
        total_events=total,
        unique_sessions=len(sessions),
        events_by_type=type_counts,
        daily_events=daily_events,
    )
