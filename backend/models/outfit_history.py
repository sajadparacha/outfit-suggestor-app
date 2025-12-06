"""ORM models for persisting outfit suggestion history."""
from datetime import datetime

from sqlalchemy import Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class OutfitHistory(Base):
    """
    Database model to store each outfit suggestion made by the AI.

    This can be extended later with user identifiers or session IDs to
    associate history with specific users or devices.
    """

    __tablename__ = "outfit_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    # User relationship (nullable for backward compatibility)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user: Mapped["User"] = relationship("User", back_populates="outfit_history")

    # Optional metadata about the request
    text_input: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Store the uploaded image as base64 string
    image_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Store the generated model image as base64 string
    model_image: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Snapshot of the outfit suggestion returned by the AI
    shirt: Mapped[str] = mapped_column(String(512), nullable=False)
    trouser: Mapped[str] = mapped_column(String(512), nullable=False)
    blazer: Mapped[str] = mapped_column(String(512), nullable=False)
    shoes: Mapped[str] = mapped_column(String(512), nullable=False)
    belt: Mapped[str] = mapped_column(String(512), nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)


