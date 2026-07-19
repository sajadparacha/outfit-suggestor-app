"""Week plan service — persistence helpers for WeeklyPlan."""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session, joinedload

from models.outfit import OutfitSuggestion
from models.week_plan import (
    DEFAULT_OCCASION,
    DEFAULT_REMINDER_TIME,
    DEFAULT_SEASON,
    DEFAULT_STYLE,
    WeekPlanDayResponse,
    WeekPlanOutfitResponse,
    WeekPlanResponse,
    WeekPlanTodayResponse,
    WeekPlanUpsertRequest,
    WeeklyPlan,
    WeeklyPlanDay,
    WeeklyPlanOutfit,
)

_REMINDER_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def validate_reminder_time(value: str) -> str:
    if not _REMINDER_RE.match(value or ""):
        raise ValueError("reminder_time must be HH:MM (24-hour)")
    return value


def outfit_summary(suggestion: OutfitSuggestion) -> str:
    """Short notification-friendly summary."""
    parts = [
        suggestion.shirt,
        suggestion.trouser,
        suggestion.shoes,
    ]
    cleaned = [p.strip() for p in parts if p and p.strip()]
    text = " · ".join(cleaned[:3]) if cleaned else (suggestion.reasoning or "Your outfit")
    return text[:240]


def extract_wardrobe_item_ids(suggestion: OutfitSuggestion) -> list[int]:
    ids: list[int] = []
    for attr in (
        "shirt_id",
        "trouser_id",
        "blazer_id",
        "shoes_id",
        "belt_id",
        "sweater_id",
        "outerwear_id",
        "tie_id",
    ):
        val = getattr(suggestion, attr, None)
        if isinstance(val, int):
            ids.append(val)
    # Deduplicate preserving order
    seen: set[int] = set()
    unique: list[int] = []
    for i in ids:
        if i not in seen:
            seen.add(i)
            unique.append(i)
    return unique


def suggestion_to_outfit_json(suggestion: OutfitSuggestion) -> dict[str, Any]:
    if hasattr(suggestion, "model_dump"):
        data = suggestion.model_dump()
    else:
        data = dict(suggestion)
    # Drop bulky/debug fields from plan storage
    for key in ("ai_prompt", "ai_raw_response", "cost"):
        data.pop(key, None)
    return data


def outfit_row_to_response(row: WeeklyPlanOutfit) -> WeekPlanOutfitResponse:
    try:
        payload = json.loads(row.outfit_json or "{}")
    except json.JSONDecodeError:
        payload = {}
    try:
        item_ids = json.loads(row.wardrobe_item_ids_json or "[]")
    except json.JSONDecodeError:
        item_ids = []
    if not isinstance(item_ids, list):
        item_ids = []
    return WeekPlanOutfitResponse(
        summary=row.summary or "",
        generated_at=row.generated_at.isoformat() if row.generated_at else None,
        shirt=payload.get("shirt") or "",
        trouser=payload.get("trouser") or "",
        blazer=payload.get("blazer") or "",
        shoes=payload.get("shoes") or "",
        belt=payload.get("belt") or "",
        reasoning=payload.get("reasoning") or "",
        sweater=payload.get("sweater"),
        outerwear=payload.get("outerwear"),
        tie=payload.get("tie"),
        shirt_id=payload.get("shirt_id"),
        trouser_id=payload.get("trouser_id"),
        blazer_id=payload.get("blazer_id"),
        shoes_id=payload.get("shoes_id"),
        belt_id=payload.get("belt_id"),
        sweater_id=payload.get("sweater_id"),
        outerwear_id=payload.get("outerwear_id"),
        tie_id=payload.get("tie_id"),
        matching_wardrobe_items=payload.get("matching_wardrobe_items"),
        model_image=payload.get("model_image"),
        wardrobe_item_ids=[int(x) for x in item_ids if isinstance(x, int)],
    )


def day_to_response(day: WeeklyPlanDay) -> WeekPlanDayResponse:
    outfit = None
    if day.outfit is not None:
        outfit = outfit_row_to_response(day.outfit)
    return WeekPlanDayResponse(
        day_of_week=day.day_of_week,
        enabled=bool(day.enabled),
        occasion=day.occasion or DEFAULT_OCCASION,
        style=getattr(day, "style", None) or DEFAULT_STYLE,
        use_wardrobe_only=bool(getattr(day, "use_wardrobe_only", True)),
        outfit=outfit,
    )


def plan_to_response(
    plan: WeeklyPlan,
    *,
    wardrobe_empty: bool = False,
    message: Optional[str] = None,
) -> WeekPlanResponse:
    days_by_dow = {d.day_of_week: d for d in plan.days}
    days: list[WeekPlanDayResponse] = []
    for dow in range(7):
        if dow in days_by_dow:
            days.append(day_to_response(days_by_dow[dow]))
        else:
            days.append(
                WeekPlanDayResponse(
                    day_of_week=dow,
                    enabled=False,
                    occasion=DEFAULT_OCCASION,
                    style=DEFAULT_STYLE,
                    use_wardrobe_only=True,
                    outfit=None,
                )
            )
    return WeekPlanResponse(
        reminder_time=plan.reminder_time or DEFAULT_REMINDER_TIME,
        timezone=plan.timezone or "UTC",
        shared_style=plan.shared_style or DEFAULT_STYLE,
        shared_season=plan.shared_season or DEFAULT_SEASON,
        days=days,
        wardrobe_empty=wardrobe_empty,
        message=message,
    )


def empty_plan_response() -> WeekPlanResponse:
    return WeekPlanResponse(
        reminder_time=DEFAULT_REMINDER_TIME,
        timezone="UTC",
        shared_style=DEFAULT_STYLE,
        shared_season=DEFAULT_SEASON,
        days=[
            WeekPlanDayResponse(
                day_of_week=dow,
                enabled=False,
                occasion=DEFAULT_OCCASION,
                style=DEFAULT_STYLE,
                use_wardrobe_only=True,
                outfit=None,
            )
            for dow in range(7)
        ],
    )


class WeekPlanService:
    """CRUD and serialization for weekly outfit plans."""

    def get_plan(self, db: Session, user_id: int) -> Optional[WeeklyPlan]:
        return (
            db.query(WeeklyPlan)
            .options(
                joinedload(WeeklyPlan.days).joinedload(WeeklyPlanDay.outfit)
            )
            .filter(WeeklyPlan.user_id == user_id)
            .first()
        )

    def ensure_default_days(self, db: Session, plan: WeeklyPlan) -> None:
        existing = {d.day_of_week for d in plan.days}
        for dow in range(7):
            if dow not in existing:
                plan.days.append(
                    WeeklyPlanDay(
                        day_of_week=dow,
                        enabled=False,
                        occasion=DEFAULT_OCCASION,
                        style=DEFAULT_STYLE,
                        use_wardrobe_only=True,
                    )
                )
        db.flush()

    def upsert_plan(
        self, db: Session, user_id: int, body: WeekPlanUpsertRequest
    ) -> WeeklyPlan:
        reminder = validate_reminder_time(body.reminder_time or DEFAULT_REMINDER_TIME)
        plan = self.get_plan(db, user_id)
        if plan is None:
            plan = WeeklyPlan(
                user_id=user_id,
                reminder_time=reminder,
                timezone=body.timezone or "UTC",
                shared_style=body.shared_style or DEFAULT_STYLE,
                shared_season=body.shared_season or DEFAULT_SEASON,
            )
            db.add(plan)
            db.flush()
            self.ensure_default_days(db, plan)
        else:
            plan.reminder_time = reminder
            plan.timezone = body.timezone or "UTC"
            plan.shared_style = body.shared_style or DEFAULT_STYLE
            plan.shared_season = body.shared_season or DEFAULT_SEASON
            plan.updated_at = datetime.utcnow()
            self.ensure_default_days(db, plan)

        if body.days:
            by_dow = {d.day_of_week: d for d in plan.days}
            for day_in in body.days:
                day = by_dow.get(day_in.day_of_week)
                if day is None:
                    day = WeeklyPlanDay(
                        plan_id=plan.id,
                        day_of_week=day_in.day_of_week,
                        enabled=day_in.enabled,
                        occasion=day_in.occasion or DEFAULT_OCCASION,
                        style=getattr(day_in, "style", None) or DEFAULT_STYLE,
                        use_wardrobe_only=bool(
                            getattr(day_in, "use_wardrobe_only", True)
                        ),
                    )
                    plan.days.append(day)
                    by_dow[day_in.day_of_week] = day
                else:
                    was_enabled = day.enabled
                    day.enabled = bool(day_in.enabled)
                    day.occasion = day_in.occasion or DEFAULT_OCCASION
                    day.style = getattr(day_in, "style", None) or DEFAULT_STYLE
                    day.use_wardrobe_only = bool(
                        getattr(day_in, "use_wardrobe_only", True)
                    )
                    # Clear outfit when day is disabled
                    if was_enabled and not day.enabled and day.outfit is not None:
                        db.delete(day.outfit)
                        day.outfit = None

        db.commit()
        return self.get_plan(db, user_id)  # type: ignore[return-value]

    def delete_plan(self, db: Session, user_id: int) -> bool:
        plan = self.get_plan(db, user_id)
        if plan is None:
            return False
        db.delete(plan)
        db.commit()
        return True

    def save_day_outfit(
        self,
        db: Session,
        day: WeeklyPlanDay,
        suggestion: OutfitSuggestion,
    ) -> WeeklyPlanOutfit:
        summary = outfit_summary(suggestion)
        payload = suggestion_to_outfit_json(suggestion)
        item_ids = extract_wardrobe_item_ids(suggestion)
        if day.outfit is not None:
            row = day.outfit
            row.summary = summary
            row.outfit_json = json.dumps(payload)
            row.wardrobe_item_ids_json = json.dumps(item_ids)
            row.generated_at = datetime.utcnow()
        else:
            row = WeeklyPlanOutfit(
                day_id=day.id,
                summary=summary,
                outfit_json=json.dumps(payload),
                wardrobe_item_ids_json=json.dumps(item_ids),
                generated_at=datetime.utcnow(),
            )
            db.add(row)
            day.outfit = row
        db.flush()
        return row

    def clear_day_outfit(self, db: Session, day: WeeklyPlanDay) -> None:
        if day.outfit is not None:
            db.delete(day.outfit)
            day.outfit = None
            db.flush()

    def collect_used_item_ids(
        self, plan: WeeklyPlan, *, exclude_day: Optional[int] = None
    ) -> list[int]:
        used: list[int] = []
        seen: set[int] = set()
        for day in plan.days:
            if exclude_day is not None and day.day_of_week == exclude_day:
                continue
            if day.outfit is None:
                continue
            try:
                ids = json.loads(day.outfit.wardrobe_item_ids_json or "[]")
            except json.JSONDecodeError:
                ids = []
            for i in ids:
                if isinstance(i, int) and i not in seen:
                    seen.add(i)
                    used.append(i)
        return used

    def local_day_of_week(self, timezone_name: str) -> int:
        """Return 0=Monday … 6=Sunday in the given timezone."""
        try:
            tz = ZoneInfo(timezone_name)
        except Exception:
            tz = ZoneInfo("UTC")
        now = datetime.now(tz)
        return now.weekday()  # Monday=0

    def today_response(self, db: Session, user_id: int) -> WeekPlanTodayResponse:
        plan = self.get_plan(db, user_id)
        if plan is None:
            return WeekPlanTodayResponse(
                day_of_week=self.local_day_of_week("UTC"),
                enabled=False,
                occasion=None,
                style=None,
                use_wardrobe_only=True,
                outfit=None,
                reminder_time=DEFAULT_REMINDER_TIME,
                timezone="UTC",
                has_plan=False,
                message="No week plan yet.",
            )
        dow = self.local_day_of_week(plan.timezone or "UTC")
        day = next((d for d in plan.days if d.day_of_week == dow), None)
        if day is None or not day.enabled:
            return WeekPlanTodayResponse(
                day_of_week=dow,
                enabled=False,
                occasion=day.occasion if day else None,
                style=getattr(day, "style", None) if day else None,
                use_wardrobe_only=bool(getattr(day, "use_wardrobe_only", True))
                if day
                else True,
                outfit=None,
                reminder_time=plan.reminder_time,
                timezone=plan.timezone,
                has_plan=True,
                message="Today is not enabled in your week plan.",
            )
        outfit = outfit_row_to_response(day.outfit) if day.outfit else None
        return WeekPlanTodayResponse(
            day_of_week=dow,
            enabled=True,
            occasion=day.occasion,
            style=getattr(day, "style", None) or DEFAULT_STYLE,
            use_wardrobe_only=bool(getattr(day, "use_wardrobe_only", True)),
            outfit=outfit,
            reminder_time=plan.reminder_time,
            timezone=plan.timezone,
            has_plan=True,
            message=None if outfit else "No outfit generated for today yet.",
        )
