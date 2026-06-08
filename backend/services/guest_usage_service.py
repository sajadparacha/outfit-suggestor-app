"""Guest AI usage limits for unauthenticated users."""
import re
import uuid
from typing import Optional, Tuple

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from exceptions import GuestLimitReachedException
from models.guest_usage import GuestUsage

GUEST_AI_LIMIT = 3
GUEST_SESSION_HEADER = "X-Guest-Session-Id"
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class GuestUsageService:
    """Enforce and record guest AI outfit suggestion usage."""

    def normalize_guest_session_id(self, raw: Optional[str]) -> str:
        if not raw or not _UUID_RE.match(raw.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid X-Guest-Session-Id header is required for guest AI requests.",
            )
        return raw.strip().lower()

    def resolve_guest_session_id(self, request: Request) -> str:
        return self.normalize_guest_session_id(request.headers.get(GUEST_SESSION_HEADER))

    def get_or_create(self, db: Session, guest_session_id: str) -> GuestUsage:
        row = (
            db.query(GuestUsage)
            .filter(GuestUsage.guest_session_id == guest_session_id)
            .first()
        )
        if row is None:
            row = GuestUsage(guest_session_id=guest_session_id, ai_calls_used=0)
            db.add(row)
            db.commit()
            db.refresh(row)
        return row

    def usage_summary(self, used: int) -> dict:
        remaining = max(0, GUEST_AI_LIMIT - used)
        return {
            "limit": GUEST_AI_LIMIT,
            "used": used,
            "remaining": remaining,
            "requires_signup": remaining <= 0,
        }

    def get_usage(self, db: Session, guest_session_id: str) -> dict:
        row = self.get_or_create(db, guest_session_id)
        return self.usage_summary(row.ai_calls_used)

    def assert_can_use_ai(self, db: Session, guest_session_id: str) -> None:
        row = self.get_or_create(db, guest_session_id)
        if row.ai_calls_used >= GUEST_AI_LIMIT:
            raise GuestLimitReachedException()

    def record_successful_ai_call(self, db: Session, guest_session_id: str) -> dict:
        row = self.get_or_create(db, guest_session_id)
        row.ai_calls_used += 1
        db.commit()
        db.refresh(row)
        return self.usage_summary(row.ai_calls_used)

    @staticmethod
    def new_session_id() -> str:
        return str(uuid.uuid4())
