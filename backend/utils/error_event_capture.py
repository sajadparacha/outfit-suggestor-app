"""Helpers to persist API-side error events from exception handlers."""
from __future__ import annotations

import traceback
from typing import Any, Optional

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from models.database import SessionLocal
from services.error_event_service import try_create_error_event
from utils.auth import decode_access_token, peek_user_id_from_authorization

# Overridable in tests so captures use the same SQLite session factory.
_session_factory = SessionLocal


def set_session_factory(factory) -> None:
    """Set session factory used by exception capture (tests override this)."""
    global _session_factory
    _session_factory = factory or SessionLocal


def _open_session():
    return _session_factory()


def _should_skip_path(path: str) -> bool:
    p = (path or "").rstrip("/")
    return p.endswith("/api/error-events") or "/api/admin/error-events" in p


def _optional_user_id(request: Request) -> Optional[int]:
    try:
        auth = request.headers.get("Authorization") or ""
        if not auth.startswith("Bearer "):
            return None
        token = auth.split(" ", 1)[1]
        payload = decode_access_token(token)
        if payload:
            sub = payload.get("sub")
            return int(sub) if sub is not None else None
        # Expired / otherwise non-auth-valid token: still attribute for error logs
        return peek_user_id_from_authorization(auth)
    except Exception:
        return None


def _detail_to_message(detail: Any) -> str:
    if detail is None:
        return "HTTP error"
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list):
        try:
            return "; ".join(
                str(item.get("msg") if isinstance(item, dict) else item) for item in detail[:5]
            )
        except Exception:
            return str(detail)[:500]
    return str(detail)[:500]


def record_http_exception(request: Request, exc: StarletteHTTPException) -> None:
    """Persist notable HTTP errors (4xx/5xx except noisy 404 on root assets)."""
    path = request.url.path
    if _should_skip_path(path):
        return
    status_code = int(getattr(exc, "status_code", 500) or 500)
    # Skip routine not-found noise for static-ish paths; keep API 404s.
    if status_code == 404 and not path.startswith("/api/"):
        return
    if status_code < 400:
        return

    detail = getattr(exc, "detail", None)
    code = None
    if isinstance(detail, dict):
        code = detail.get("code")
        message = _detail_to_message(detail.get("detail") or detail.get("message") or detail)
    else:
        message = _detail_to_message(detail)

    if not code:
        code = f"http_{status_code}"

    db = _open_session()
    try:
        try_create_error_event(
            db,
            source="api",
            error_code=str(code),
            message=message,
            detail=str(detail) if detail is not None else None,
            status_code=status_code,
            endpoint=path,
            method=request.method,
            user_id=_optional_user_id(request),
            platform="api",
            user_agent=request.headers.get("user-agent"),
            context={"headers_host": request.headers.get("host")},
        )
    finally:
        db.close()


def record_unhandled_exception(request: Request, exc: Exception) -> None:
    path = request.url.path
    if _should_skip_path(path):
        return
    db = _open_session()
    try:
        try_create_error_event(
            db,
            source="api",
            error_code="http_500",
            message=str(exc) or exc.__class__.__name__,
            detail=exc.__class__.__name__,
            stack="".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
            status_code=500,
            endpoint=path,
            method=request.method,
            user_id=_optional_user_id(request),
            platform="api",
            user_agent=request.headers.get("user-agent"),
        )
    finally:
        db.close()


def record_validation_error(request: Request, exc: RequestValidationError) -> None:
    path = request.url.path
    if _should_skip_path(path):
        return
    db = _open_session()
    try:
        try_create_error_event(
            db,
            source="api",
            error_code="http_422",
            message="Request validation failed",
            detail=str(exc.errors())[:4000],
            status_code=422,
            endpoint=path,
            method=request.method,
            user_id=_optional_user_id(request),
            platform="api",
            user_agent=request.headers.get("user-agent"),
            context={"errors": exc.errors()[:10]},
        )
    finally:
        db.close()
