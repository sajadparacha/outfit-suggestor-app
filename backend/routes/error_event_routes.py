"""Routes for client error ingest and admin error event review."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from dependencies import get_current_admin_user, get_optional_user
from models.database import get_db
from models.error_event import ErrorEvent
from models.user import User
from services.error_event_service import (
    create_error_event,
    email_map_for_events,
    enrich_event_dict,
)
from utils.auth import peek_user_id_from_authorization
from utils.user_filter import matched_user_ids

router = APIRouter(tags=["Error Events"])

# Simple in-process rate limit for client ingest (per IP).
_CLIENT_INGEST_HITS: dict[str, list[float]] = {}
_CLIENT_INGEST_LIMIT = 30
_CLIENT_INGEST_WINDOW_SEC = 60.0


class ClientErrorIngestRequest(BaseModel):
    error_code: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1, max_length=2000)
    stack: Optional[str] = Field(None, max_length=12000)
    detail: Optional[str] = Field(None, max_length=8000)
    status_code: Optional[int] = None
    endpoint: Optional[str] = Field(None, max_length=255)
    method: Optional[str] = Field(None, max_length=10)
    route: Optional[str] = Field(None, max_length=255)
    platform: Optional[str] = Field("web", max_length=40)
    context: Optional[dict[str, Any]] = None


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def _rate_limit_client_ingest(ip: str) -> None:
    import time

    now = time.time()
    window_start = now - _CLIENT_INGEST_WINDOW_SEC
    hits = [t for t in _CLIENT_INGEST_HITS.get(ip, []) if t >= window_start]
    if len(hits) >= _CLIENT_INGEST_LIMIT:
        _CLIENT_INGEST_HITS[ip] = hits
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many error reports; try again later",
        )
    hits.append(now)
    _CLIENT_INGEST_HITS[ip] = hits


def _parse_date(value: Optional[str], *, end_of_day: bool = False) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD",
        ) from exc
    if end_of_day:
        return dt + timedelta(days=1)
    return dt


@router.post("/api/error-events", status_code=status.HTTP_201_CREATED)
async def ingest_client_error(
    body: ClientErrorIngestRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Accept client-reported errors (auth optional). Rate-limited."""
    _rate_limit_client_ingest(_client_ip(request))
    user_id = current_user.id if current_user else None
    if user_id is None:
        # Attribute expired/stale tokens so 401 client reports still show a user id
        user_id = peek_user_id_from_authorization(request.headers.get("Authorization"))
    event = create_error_event(
        db,
        source="client",
        error_code=body.error_code,
        message=body.message,
        detail=body.detail,
        stack=body.stack,
        status_code=body.status_code,
        endpoint=body.endpoint,
        method=body.method,
        route=body.route,
        user_id=user_id,
        platform=body.platform or "web",
        user_agent=request.headers.get("user-agent"),
        context=body.context,
    )
    return {"id": event.id, "fingerprint": event.fingerprint}


@router.get("/api/admin/error-events")
async def list_error_events(
    source: Optional[str] = Query(None, description="api or client"),
    error_code: Optional[str] = Query(None),
    user: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    query = db.query(ErrorEvent)

    if source:
        query = query.filter(ErrorEvent.source == source.lower())
    if error_code:
        query = query.filter(ErrorEvent.error_code.ilike(f"%{error_code.strip()}%"))
    if resolved is not None:
        query = query.filter(ErrorEvent.resolved.is_(resolved))

    user_ids = matched_user_ids(db, user=user, user_id=user_id)
    if user_ids is not None:
        if not user_ids:
            return {"total": 0, "limit": limit, "offset": offset, "events": []}
        query = query.filter(ErrorEvent.user_id.in_(user_ids))

    start_dt = _parse_date(start_date)
    end_dt = _parse_date(end_date, end_of_day=True)
    if start_dt:
        query = query.filter(ErrorEvent.created_at >= start_dt)
    if end_dt:
        query = query.filter(ErrorEvent.created_at < end_dt)

    total = query.count()
    rows = (
        query.order_by(ErrorEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    emails = email_map_for_events(db, rows)
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": [
            enrich_event_dict(row, user_email=emails.get(row.user_id) if row.user_id else None)
            for row in rows
        ],
    }


@router.get("/api/admin/error-events/summary")
async def error_events_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    query = db.query(
        ErrorEvent.error_code,
        ErrorEvent.source,
        func.count(ErrorEvent.id).label("count"),
    )
    start_dt = _parse_date(start_date)
    end_dt = _parse_date(end_date, end_of_day=True)
    if start_dt:
        query = query.filter(ErrorEvent.created_at >= start_dt)
    if end_dt:
        query = query.filter(ErrorEvent.created_at < end_dt)

    rows = (
        query.group_by(ErrorEvent.error_code, ErrorEvent.source)
        .order_by(func.count(ErrorEvent.id).desc())
        .limit(50)
        .all()
    )
    return {
        "by_code": [
            {"error_code": r.error_code, "source": r.source, "count": r.count}
            for r in rows
        ]
    }


@router.get("/api/admin/error-events/{event_id}")
async def get_error_event(
    event_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    event = db.query(ErrorEvent).filter(ErrorEvent.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Error event not found")
    emails = email_map_for_events(db, [event])
    return enrich_event_dict(
        event,
        user_email=emails.get(event.user_id) if event.user_id else None,
    )


@router.patch("/api/admin/error-events/{event_id}/resolved")
async def mark_error_resolved(
    event_id: int,
    resolved: bool = Query(True),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    event = db.query(ErrorEvent).filter(ErrorEvent.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Error event not found")
    event.resolved = resolved
    event.resolved_at = datetime.utcnow() if resolved else None
    db.commit()
    db.refresh(event)
    emails = email_map_for_events(db, [event])
    return enrich_event_dict(
        event,
        user_email=emails.get(event.user_id) if event.user_id else None,
    )
