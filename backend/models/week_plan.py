"""Week outfit planner ORM and API schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


VALID_DAYS = frozenset(range(7))  # 0=Monday … 6=Sunday
DEFAULT_REMINDER_TIME = "07:30"
DEFAULT_STYLE = "classic"
DEFAULT_SEASON = "all-season"
DEFAULT_OCCASION = "everyday"


class WeeklyPlan(Base):
    """One recurring weekly outfit plan per user."""

    __tablename__ = "weekly_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    reminder_time: Mapped[str] = mapped_column(
        String(5), nullable=False, default=DEFAULT_REMINDER_TIME
    )  # HH:MM
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    shared_style: Mapped[str] = mapped_column(
        String(64), nullable=False, default=DEFAULT_STYLE
    )
    shared_season: Mapped[str] = mapped_column(
        String(64), nullable=False, default=DEFAULT_SEASON
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="weekly_plan")
    days: Mapped[list["WeeklyPlanDay"]] = relationship(
        "WeeklyPlanDay",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="WeeklyPlanDay.day_of_week",
    )


class WeeklyPlanDay(Base):
    """One day slot within a weekly plan (Mon–Sun)."""

    __tablename__ = "weekly_plan_days"
    __table_args__ = (
        UniqueConstraint("plan_id", "day_of_week", name="uq_weekly_plan_day"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("weekly_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon … 6=Sun
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    occasion: Mapped[str] = mapped_column(
        String(64), nullable=False, default=DEFAULT_OCCASION
    )
    style: Mapped[str] = mapped_column(
        String(64), nullable=False, default=DEFAULT_STYLE
    )
    use_wardrobe_only: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )

    plan: Mapped["WeeklyPlan"] = relationship("WeeklyPlan", back_populates="days")
    outfit: Mapped[Optional["WeeklyPlanOutfit"]] = relationship(
        "WeeklyPlanOutfit",
        back_populates="day",
        cascade="all, delete-orphan",
        uselist=False,
    )


class WeeklyPlanOutfit(Base):
    """Persisted generated outfit for a planned day (no morning AI re-call)."""

    __tablename__ = "weekly_plan_outfits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    day_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("weekly_plan_days.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    summary: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    outfit_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    wardrobe_item_ids_json: Mapped[str] = mapped_column(
        Text, nullable=False, default="[]"
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    day: Mapped["WeeklyPlanDay"] = relationship(
        "WeeklyPlanDay", back_populates="outfit"
    )


# --- Pydantic schemas ---


class WeekPlanDayInput(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    enabled: bool = False
    occasion: str = DEFAULT_OCCASION
    style: str = DEFAULT_STYLE
    use_wardrobe_only: bool = True


class WeekPlanUpsertRequest(BaseModel):
    reminder_time: str = Field(
        default=DEFAULT_REMINDER_TIME,
        description="Daily reminder time HH:MM",
    )
    timezone: str = Field(default="UTC", description="IANA timezone name")
    shared_style: str = Field(default=DEFAULT_STYLE)
    shared_season: str = Field(default=DEFAULT_SEASON)
    days: list[WeekPlanDayInput] = Field(default_factory=list)


class WeekPlanGenerateRequest(BaseModel):
    day_of_week: Optional[int] = Field(
        default=None,
        ge=0,
        le=6,
        description="If set, regenerate only this day; otherwise all enabled days",
    )


class WeekPlanOutfitResponse(BaseModel):
    summary: str
    generated_at: Optional[str] = None
    shirt: str = ""
    trouser: str = ""
    blazer: str = ""
    shoes: str = ""
    belt: str = ""
    reasoning: str = ""
    sweater: Optional[str] = None
    outerwear: Optional[str] = None
    tie: Optional[str] = None
    shirt_id: Optional[int] = None
    trouser_id: Optional[int] = None
    blazer_id: Optional[int] = None
    shoes_id: Optional[int] = None
    belt_id: Optional[int] = None
    sweater_id: Optional[int] = None
    outerwear_id: Optional[int] = None
    tie_id: Optional[int] = None
    matching_wardrobe_items: Optional[dict[str, Any]] = None
    model_image: Optional[str] = None
    wardrobe_item_ids: list[int] = Field(default_factory=list)


class WeekPlanDayResponse(BaseModel):
    day_of_week: int
    enabled: bool
    occasion: str
    style: str = DEFAULT_STYLE
    use_wardrobe_only: bool = True
    outfit: Optional[WeekPlanOutfitResponse] = None


class WeekPlanResponse(BaseModel):
    reminder_time: str
    timezone: str
    shared_style: str  # legacy; prefer per-day style
    shared_season: str
    days: list[WeekPlanDayResponse]
    wardrobe_empty: bool = False
    message: Optional[str] = None


class WeekPlanTodayResponse(BaseModel):
    day_of_week: int
    enabled: bool
    occasion: Optional[str] = None
    style: Optional[str] = None
    use_wardrobe_only: bool = True
    outfit: Optional[WeekPlanOutfitResponse] = None
    reminder_time: str
    timezone: str
    has_plan: bool = True
    message: Optional[str] = None


# Avoid circular import type hints
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User
