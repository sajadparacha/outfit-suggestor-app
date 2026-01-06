"""Wardrobe model for storing user's clothing items."""
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from .database import Base


class ClothingCategory(str, enum.Enum):
    """Enumeration of clothing categories."""
    SHIRT = "shirt"
    TROUSER = "trouser"
    BLAZER = "blazer"
    JACKET = "jacket"
    SHOES = "shoes"
    BELT = "belt"
    TIE = "tie"
    SUIT = "suit"
    SWEATER = "sweater"
    POLO = "polo"
    T_SHIRT = "t_shirt"
    JEANS = "jeans"
    SHORTS = "shorts"
    OTHER = "other"


class WardrobeItem(Base):
    """
    Model to store individual clothing items in a user's wardrobe.
    """
    
    __tablename__ = "wardrobe_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Item details
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # Using string instead of Enum for flexibility
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    # Image storage (base64 encoded)
    image_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Additional metadata
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string or comma-separated
    condition: Mapped[str | None] = mapped_column(String(50), nullable=True)  # new, good, fair, poor
    purchase_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_worn: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    wear_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    
    # Relationship to user
    user: Mapped["User"] = relationship("User", back_populates="wardrobe_items")



