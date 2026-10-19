"""ORM models for persisting outfit suggestion history."""
from datetime import datetime

from sqlalchemy import Boolean, Integer, String, DateTime, Text, ForeignKey, false
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
    occasion: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    season: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    style: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    
    # Store the uploaded image as base64 string
    image_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 256px JPEG of image_data for list responses; NULL when image_from_wardrobe
    # (the wardrobe item's thumbnail is used instead)
    image_thumbnail: Mapped[str | None] = mapped_column(Text, nullable=True)

    # True when the input photo is the source wardrobe item's photo: image_data is left
    # empty and the photo is read from wardrobe_items (source_wardrobe_item_id).
    image_from_wardrobe: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    
    # Store the generated model image as base64 string
    model_image: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Snapshot of the outfit suggestion returned by the AI
    shirt: Mapped[str] = mapped_column(String(512), nullable=False)
    trouser: Mapped[str] = mapped_column(String(512), nullable=False)
    blazer: Mapped[str] = mapped_column(String(512), nullable=False)
    shoes: Mapped[str] = mapped_column(String(512), nullable=False)
    belt: Mapped[str] = mapped_column(String(512), nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    shirt_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    trouser_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    blazer_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    shoes_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    belt_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    sweater: Mapped[str | None] = mapped_column(String(512), nullable=True)
    outerwear: Mapped[str | None] = mapped_column(String(512), nullable=True)
    tie: Mapped[str | None] = mapped_column(String(512), nullable=True)
    sweater_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    outerwear_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    tie_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    source_wardrobe_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)


