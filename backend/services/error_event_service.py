"""Create and serialize error events for admin review."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from error_solutions import lookup_solution
from models.error_event import ErrorEvent
from models.user import User

MAX_MESSAGE_LEN = 2000
MAX_DETAIL_LEN = 8000
MAX_STACK_LEN = 12000
MAX_CONTEXT_LEN = 4000

_SECRET_KEYS = re.compile(
    r"(password|passwd|secret|token|authorization|api[_-]?key|cookie|credential)",
    re.IGNORECASE,
)


def _truncate(value: Optional[str], limit: int) -> Optional[str]:
    if value is None:
        return None
    text = str(value)
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def _redact_mapping(obj: Any) -> Any:
    if isinstance(obj, dict):
        out = {}
        for key, val in obj.items():
            if _SECRET_KEYS.search(str(key)):
                out[key] = "[redacted]"
            else:
                out[key] = _redact_mapping(val)
        return out
    if isinstance(obj, list):
        return [_redact_mapping(item) for item in obj[:50]]
    if isinstance(obj, str) and len(obj) > 500 and (
        "base64" in obj[:40].lower() or obj.startswith("data:image")
    ):
        return "[redacted-binary]"
    return obj


def serialize_context(context: Any) -> Optional[str]:
    if context is None:
        return None
    try:
        redacted = _redact_mapping(context)
        raw = json.dumps(redacted, default=str)
    except (TypeError, ValueError):
        raw = str(context)
    return _truncate(raw, MAX_CONTEXT_LEN)


def compute_fingerprint(
    *,
    source: str,
    error_code: str,
    message: str,
    endpoint: Optional[str] = None,
    route: Optional[str] = None,
) -> str:
    material = "|".join(
        [
            (source or "").lower(),
            (error_code or "").lower(),
            (message or "")[:200].lower(),
            (endpoint or route or "").lower(),
        ]
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def enrich_event_dict(event: ErrorEvent, user_email: Optional[str] = None) -> dict[str, Any]:
    solution = lookup_solution(event.error_code)
    return {
        "id": event.id,
        "source": event.source,
        "error_code": event.error_code,
        "message": event.message,
        "detail": event.detail,
        "stack": event.stack,
        "status_code": event.status_code,
        "endpoint": event.endpoint,
        "method": event.method,
        "route": event.route,
        "user_id": event.user_id,
        "user_email": user_email,
        "platform": event.platform,
        "user_agent": event.user_agent,
        "request_id": event.request_id,
        "context_json": event.context_json,
        "fingerprint": event.fingerprint,
        "resolved": bool(event.resolved),
        "resolved_at": event.resolved_at.isoformat() if event.resolved_at else None,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "suggested_cause": solution["cause"],
        "suggested_solution": solution["solution"],
    }


def email_map_for_events(db: Session, events: list[ErrorEvent]) -> dict[int, str]:
    ids = {e.user_id for e in events if e.user_id is not None}
    if not ids:
        return {}
    rows = db.query(User.id, User.email).filter(User.id.in_(ids)).all()
    return {row.id: row.email for row in rows}


def create_error_event(
    db: Session,
    *,
    source: str,
    error_code: str,
    message: str,
    detail: Optional[str] = None,
    stack: Optional[str] = None,
    status_code: Optional[int] = None,
    endpoint: Optional[str] = None,
    method: Optional[str] = None,
    route: Optional[str] = None,
    user_id: Optional[int] = None,
    platform: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_id: Optional[str] = None,
    context: Any = None,
) -> ErrorEvent:
    code = (error_code or "unknown").strip().lower()[:100]
    msg = _truncate(message or "Unknown error", MAX_MESSAGE_LEN) or "Unknown error"
    fp = compute_fingerprint(
        source=source,
        error_code=code,
        message=msg,
        endpoint=endpoint,
        route=route,
    )
    event = ErrorEvent(
        source=source[:20],
        error_code=code,
        message=msg,
        detail=_truncate(detail, MAX_DETAIL_LEN),
        stack=_truncate(stack, MAX_STACK_LEN),
        status_code=status_code,
        endpoint=_truncate(endpoint, 255),
        method=_truncate(method, 10) if method else None,
        route=_truncate(route, 255),
        user_id=user_id,
        platform=_truncate(platform, 40),
        user_agent=_truncate(user_agent, 1000),
        request_id=_truncate(request_id, 64),
        context_json=serialize_context(context),
        fingerprint=fp,
        resolved=False,
        created_at=datetime.utcnow(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def try_create_error_event(db: Session, **kwargs: Any) -> Optional[ErrorEvent]:
    """Best-effort create; never raise to callers (avoid breaking responses)."""
    try:
        return create_error_event(db, **kwargs)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return None
