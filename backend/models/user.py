"""User model for authentication."""
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    """
    User model for authentication and user management.
    """
    
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    activation_token: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    activation_token_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    
    # Relationship to outfit history (one user can have many outfit suggestions)
    outfit_history: Mapped[list["OutfitHistory"]] = relationship(
        "OutfitHistory", back_populates="user", cascade="all, delete-orphan"
    )
    
    # Relationship to wardrobe items (one user can have many wardrobe items)
    wardrobe_items: Mapped[list["WardrobeItem"]] = relationship(
        "WardrobeItem", back_populates="user", cascade="all, delete-orphan"
    )


