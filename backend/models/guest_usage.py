"""Guest AI usage tracking for anonymous users."""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from models.database import Base


class GuestUsage(Base):
    """Tracks AI outfit suggestion usage per guest session."""

    __tablename__ = "guest_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    guest_session_id: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, index=True
    )
    ai_calls_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
