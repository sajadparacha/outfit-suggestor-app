"""Week plan service — persistence helpers for WeeklyPlan."""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session, joinedload

from services.outfit_layer_sanitize import sanitize_outfit_layers
from models.outfit import OutfitSuggestion
from models.week_plan import (
    DEFAULT_OCCASION,
    DEFAULT_REMINDER_TIME,
    DEFAULT_SEASON,
    DEFAULT_STYLE,
    WEEK_PLAN_PRESET_NAME_MAX,
    WeekPlanDayResponse,
    WeekPlanHistoryItem,
    WeekPlanHistoryListResponse,
    WeekPlanOutfitResponse,
    WeekPlanPresetConfig,
    WeekPlanPresetConfigDay,
    WeekPlanPresetCreateRequest,
    WeekPlanPresetItem,
    WeekPlanPresetListResponse,
    WeekPlanPresetUpdateRequest,
    WeekPlanResponse,
    WeekPlanTodayResponse,
    WeekPlanUpsertRequest,
    WeeklyPlan,
    WeeklyPlanDay,
    WeeklyPlanHistory,
    WeeklyPlanOutfit,
    WeeklyPlanPreset,
)
from services.week_plan_preset_limit import (
    PresetLimitReachedError,
    resolve_week_plan_preset_limit,
)
from models.user import User


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


# Common color tokens for week-plan variety (prompt guidance only).
_COLOR_TOKEN_RE = re.compile(
    r"\b("
    r"black|white|ivory|cream|beige|khaki|tan|brown|chocolate|camel|"
    r"gray|grey|charcoal|silver|navy|blue|light[\s-]?blue|sky[\s-]?blue|"
    r"teal|turquoise|green|olive|forest|sage|red|burgundy|maroon|wine|"
    r"pink|blush|purple|violet|lilac|orange|rust|coral|yellow|mustard|gold"
    r")\b",
    re.IGNORECASE,
)


def _normalize_color_token(raw: str) -> str:
    cleaned = re.sub(r"\s+", " ", (raw or "").strip().lower())
    return cleaned.replace("-", " ")


def extract_outfit_colors(suggestion: OutfitSuggestion) -> list[str]:
    """Collect colors from wardrobe matches and outfit text for week variety prompts."""
    found: list[str] = []
    seen: set[str] = set()

    def add(raw: Optional[str]) -> None:
        if not raw:
            return
        token = _normalize_color_token(raw)
        if not token or token in seen or token == "unknown":
            return
        seen.add(token)
        found.append(token)

    matching = getattr(suggestion, "matching_wardrobe_items", None)
    if isinstance(matching, dict):
        for items in matching.values():
            if not isinstance(items, list):
                continue
            for item in items:
                if isinstance(item, dict):
                    add(item.get("color"))

    for attr in (
        "shirt",
        "trouser",
        "blazer",
        "shoes",
        "belt",
        "sweater",
        "outerwear",
        "tie",
    ):
        text = getattr(suggestion, attr, None)
        if not isinstance(text, str) or not text.strip():
            continue
        for match in _COLOR_TOKEN_RE.finditer(text):
            add(match.group(1))

    return found


def extract_colors_from_outfit_payload(payload: dict[str, Any]) -> list[str]:
    """Same as extract_outfit_colors but from a stored outfit_json dict."""
    class _Shim:
        pass

    shim = _Shim()
    for key in (
        "shirt",
        "trouser",
        "blazer",
        "shoes",
        "belt",
        "sweater",
        "outerwear",
        "tie",
        "matching_wardrobe_items",
    ):
        setattr(shim, key, payload.get(key))
    return extract_outfit_colors(shim)  # type: ignore[arg-type]


def suggestion_to_outfit_json(suggestion: OutfitSuggestion) -> dict[str, Any]:
    if hasattr(suggestion, "model_dump"):
        data = suggestion.model_dump()
    else:
        data = dict(suggestion)
    # Drop bulky/debug fields from plan storage
    for key in ("ai_prompt", "ai_raw_response", "cost"):
        data.pop(key, None)
    return data


_SLOT_ID_FIELDS = (
    ("shirt", "shirt_id"),
    ("trouser", "trouser_id"),
    ("blazer", "blazer_id"),
    ("shoes", "shoes_id"),
    ("belt", "belt_id"),
    ("sweater", "sweater_id"),
    ("outerwear", "outerwear_id"),
    ("tie", "tie_id"),
)


def _first_unused_match_id(
    items: Any, exclude_ids: set[int], *, allow_excluded_fallback: bool = True
) -> Optional[int]:
    if not isinstance(items, list):
        return None
    fallback: Optional[int] = None
    for item in items:
        if not isinstance(item, dict):
            continue
        item_id = item.get("id")
        if not isinstance(item_id, int):
            continue
        if item_id not in exclude_ids:
            return item_id
        if allow_excluded_fallback and fallback is None:
            fallback = item_id
    return fallback if allow_excluded_fallback else None


def prioritize_matching_items(
    matching: Any, exclude_ids: set[int]
) -> dict[str, Any]:
    """Keep all matches but put unused ids first so bind prefers them."""
    if not isinstance(matching, dict):
        return {}
    if not exclude_ids:
        return matching
    prioritized: dict[str, Any] = {}
    for category, items in matching.items():
        if not isinstance(items, list):
            prioritized[category] = items
            continue
        unused: list[Any] = []
        used: list[Any] = []
        for item in items:
            if (
                isinstance(item, dict)
                and isinstance(item.get("id"), int)
                and item["id"] in exclude_ids
            ):
                used.append(item)
            else:
                unused.append(item)
        prioritized[category] = unused + used
    return prioritized


def filter_matching_items_excluding(
    matching: Any, exclude_ids: set[int]
) -> dict[str, Any]:
    """Drop already-used wardrobe ids from match lists (keep order)."""
    if not isinstance(matching, dict):
        return {}
    filtered: dict[str, Any] = {}
    for category, items in matching.items():
        if not isinstance(items, list):
            filtered[category] = items
            continue
        kept = [
            item
            for item in items
            if not (
                isinstance(item, dict)
                and isinstance(item.get("id"), int)
                and item["id"] in exclude_ids
            )
        ]
        # If filtering emptied the slot, keep originals as last-resort fallback.
        filtered[category] = kept if kept else list(items)
    return filtered


def scrub_reused_slot_ids(
    suggestion: OutfitSuggestion, exclude_ids: set[int]
) -> None:
    """
    Hard-clear slot ids already used earlier in the week when an unused alternative
    exists in matching_wardrobe_items. Prioritize unused matches for bind/save.
    """
    if not exclude_ids:
        return
    matching = getattr(suggestion, "matching_wardrobe_items", None)
    if isinstance(matching, dict):
        matching = prioritize_matching_items(matching, exclude_ids)
        suggestion.matching_wardrobe_items = matching
    else:
        matching = {}

    for category, id_field in _SLOT_ID_FIELDS:
        val = getattr(suggestion, id_field, None)
        if not isinstance(val, int) or val not in exclude_ids:
            continue
        items = matching.get(category) or []
        has_alt = any(
            isinstance(item, dict)
            and isinstance(item.get("id"), int)
            and item["id"] not in exclude_ids
            for item in items
        )
        if has_alt:
            setattr(suggestion, id_field, None)


def bind_missing_slot_ids_from_matches(
    payload: dict[str, Any],
    *,
    exclude_item_ids: Optional[set[int]] = None,
) -> None:
    """
    When AI leaves *_id null but matching_wardrobe_items has photos, bind the first
    unused match id so day-detail cards show the same thumbs as the week overview.
    Never binds an id already used on another day this week when alternatives exist.
    """
    exclude = exclude_item_ids or set()
    matching = payload.get("matching_wardrobe_items")
    if isinstance(matching, dict) and exclude:
        matching = prioritize_matching_items(matching, exclude)
        payload["matching_wardrobe_items"] = matching
    if not isinstance(matching, dict):
        return
    claimed = set(exclude)
    for category, id_field in _SLOT_ID_FIELDS:
        existing = payload.get(id_field)
        if isinstance(existing, int):
            if existing in claimed:
                # Reused — clear and rebind from remaining matches if possible.
                payload[id_field] = None
            else:
                claimed.add(existing)
                continue
        item_id = _first_unused_match_id(
            matching.get(category), claimed, allow_excluded_fallback=True
        )
        if item_id is not None:
            payload[id_field] = item_id
            claimed.add(item_id)


def admin_fields_from_suggestion(suggestion: OutfitSuggestion) -> dict[str, Any]:
    """Extract admin diagnostics from a fresh suggestion (not stored on plan rows)."""
    return {
        "ai_prompt": getattr(suggestion, "ai_prompt", None),
        "ai_raw_response": getattr(suggestion, "ai_raw_response", None),
        "cost": getattr(suggestion, "cost", None),
    }


def outfit_row_to_response(
    row: WeeklyPlanOutfit,
    *,
    admin_fields: Optional[dict[str, Any]] = None,
    season: Optional[str] = None,
    occasion: Optional[str] = None,
    style: Optional[str] = None,
) -> WeekPlanOutfitResponse:
    try:
        payload = json.loads(row.outfit_json or "{}")
    except json.JSONDecodeError:
        payload = {}
    if not isinstance(payload, dict):
        payload = {}
    sanitize_outfit_layers(
        payload, season=season, occasion=occasion, style=style
    )
    try:
        item_ids = json.loads(row.wardrobe_item_ids_json or "[]")
    except json.JSONDecodeError:
        item_ids = []
    if not isinstance(item_ids, list):
        item_ids = []
    admin = admin_fields or {}
    return WeekPlanOutfitResponse(
        summary=row.summary or "",
        generated_at=row.generated_at.isoformat() if row.generated_at else None,
        ai_prompt=admin.get("ai_prompt"),
        ai_raw_response=admin.get("ai_raw_response"),
        cost=admin.get("cost"),
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


def day_to_response(
    day: WeeklyPlanDay,
    *,
    admin_outfit_fields: Optional[dict[str, Any]] = None,
    season: Optional[str] = None,
) -> WeekPlanDayResponse:
    outfit = None
    if day.outfit is not None:
        outfit = outfit_row_to_response(
            day.outfit,
            admin_fields=admin_outfit_fields,
            season=season,
            occasion=day.occasion or DEFAULT_OCCASION,
            style=getattr(day, "style", None) or DEFAULT_STYLE,
        )
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
    admin_outfit_by_day: Optional[dict[int, dict[str, Any]]] = None,
) -> WeekPlanResponse:
    days_by_dow = {d.day_of_week: d for d in plan.days}
    season = plan.shared_season or DEFAULT_SEASON
    days: list[WeekPlanDayResponse] = []
    for dow in range(7):
        if dow in days_by_dow:
            admin_fields = (
                admin_outfit_by_day.get(dow) if admin_outfit_by_day else None
            )
            days.append(
                day_to_response(
                    days_by_dow[dow],
                    admin_outfit_fields=admin_fields,
                    season=season,
                )
            )
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
        shared_season=season,
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

    def save_day_outfit(
        self,
        db: Session,
        day: WeeklyPlanDay,
        suggestion: OutfitSuggestion,
        *,
        exclude_item_ids: Optional[set[int]] = None,
    ) -> WeeklyPlanOutfit:
        summary = outfit_summary(suggestion)
        payload = suggestion_to_outfit_json(suggestion)
        bind_missing_slot_ids_from_matches(
            payload, exclude_item_ids=exclude_item_ids
        )
        plan = day.plan
        sanitize_outfit_layers(
            payload,
            season=getattr(plan, "shared_season", None) if plan is not None else None,
            occasion=day.occasion or DEFAULT_OCCASION,
            style=getattr(day, "style", None) or DEFAULT_STYLE,
        )
        item_ids = [
            int(payload[key])
            for key in (
                "shirt_id",
                "trouser_id",
                "blazer_id",
                "shoes_id",
                "belt_id",
                "sweater_id",
                "outerwear_id",
                "tie_id",
            )
            if isinstance(payload.get(key), int)
        ]
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

    def collect_used_colors(
        self, plan: WeeklyPlan, *, exclude_day: Optional[int] = None
    ) -> list[str]:
        """Colors already used on other days (for generate variety prompts)."""
        used: list[str] = []
        seen: set[str] = set()
        for day in plan.days:
            if exclude_day is not None and day.day_of_week == exclude_day:
                continue
            if day.outfit is None:
                continue
            try:
                payload = json.loads(day.outfit.outfit_json or "{}")
            except json.JSONDecodeError:
                payload = {}
            if not isinstance(payload, dict):
                continue
            for color in extract_colors_from_outfit_payload(payload):
                if color not in seen:
                    seen.add(color)
                    used.append(color)
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
        outfit = (
            outfit_row_to_response(
                day.outfit,
                season=plan.shared_season or DEFAULT_SEASON,
                occasion=day.occasion or DEFAULT_OCCASION,
                style=getattr(day, "style", None) or DEFAULT_STYLE,
            )
            if day.outfit
            else None
        )
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

    def plan_has_content(self, plan: WeeklyPlan) -> bool:
        for day in plan.days:
            if day.enabled or day.outfit is not None:
                return True
        return False

    def _history_label(self, plan: WeeklyPlan) -> str:
        enabled = sum(1 for d in plan.days if d.enabled)
        stamp = datetime.utcnow().strftime("%b %d, %Y %H:%M")
        return f"{enabled} day{'s' if enabled != 1 else ''} · {plan.reminder_time} · {stamp}"

    def snapshot_current(
        self, db: Session, user_id: int
    ) -> Optional[WeeklyPlanHistory]:
        plan = self.get_plan(db, user_id)
        if plan is None or not self.plan_has_content(plan):
            return None
        payload = plan_to_response(plan).model_dump()
        row = WeeklyPlanHistory(
            user_id=user_id,
            label=self._history_label(plan),
            plan_json=json.dumps(payload),
            created_at=datetime.utcnow(),
        )
        db.add(row)
        db.flush()
        return row

    def list_history(
        self, db: Session, user_id: int, limit: int = 20
    ) -> WeekPlanHistoryListResponse:
        rows = (
            db.query(WeeklyPlanHistory)
            .filter(WeeklyPlanHistory.user_id == user_id)
            .order_by(WeeklyPlanHistory.created_at.desc())
            .limit(max(1, min(limit, 50)))
            .all()
        )
        items: list[WeekPlanHistoryItem] = []
        for row in rows:
            enabled_count = 0
            try:
                data = json.loads(row.plan_json or "{}")
                days = data.get("days") or []
                enabled_count = sum(1 for d in days if d.get("enabled"))
            except json.JSONDecodeError:
                enabled_count = 0
            items.append(
                WeekPlanHistoryItem(
                    id=row.id,
                    label=row.label or f"Plan #{row.id}",
                    created_at=row.created_at.isoformat() if row.created_at else "",
                    enabled_day_count=enabled_count,
                )
            )
        return WeekPlanHistoryListResponse(items=items)

    def delete_plan(
        self, db: Session, user_id: int, *, snapshot: bool = True
    ) -> bool:
        plan = self.get_plan(db, user_id)
        if plan is None:
            return False
        if snapshot:
            self.snapshot_current(db, user_id)
        db.delete(plan)
        db.commit()
        return True

    def apply_plan_payload(self, db: Session, user_id: int, payload: dict) -> WeeklyPlan:
        """Replace current plan with a full plan payload (including outfits)."""
        existing = self.get_plan(db, user_id)
        if existing is not None:
            db.delete(existing)
            db.flush()

        plan = WeeklyPlan(
            user_id=user_id,
            reminder_time=payload.get("reminder_time") or DEFAULT_REMINDER_TIME,
            timezone=payload.get("timezone") or "UTC",
            shared_style=payload.get("shared_style") or DEFAULT_STYLE,
            shared_season=payload.get("shared_season") or DEFAULT_SEASON,
        )
        db.add(plan)
        db.flush()

        days_in = payload.get("days") or []
        by_dow = {int(d.get("day_of_week")): d for d in days_in if "day_of_week" in d}
        for dow in range(7):
            raw = by_dow.get(dow, {})
            day = WeeklyPlanDay(
                plan_id=plan.id,
                day_of_week=dow,
                enabled=bool(raw.get("enabled", False)),
                occasion=raw.get("occasion") or DEFAULT_OCCASION,
                style=raw.get("style") or DEFAULT_STYLE,
                use_wardrobe_only=bool(raw.get("use_wardrobe_only", True)),
            )
            db.add(day)
            db.flush()
            outfit_raw = raw.get("outfit")
            if outfit_raw and isinstance(outfit_raw, dict):
                item_ids = outfit_raw.get("wardrobe_item_ids") or []
                if not isinstance(item_ids, list):
                    item_ids = []
                generated = outfit_raw.get("generated_at")
                try:
                    generated_at = (
                        datetime.fromisoformat(generated)
                        if isinstance(generated, str) and generated
                        else datetime.utcnow()
                    )
                except ValueError:
                    generated_at = datetime.utcnow()
                outfit_row = WeeklyPlanOutfit(
                    day_id=day.id,
                    summary=outfit_raw.get("summary") or "",
                    outfit_json=json.dumps(outfit_raw),
                    wardrobe_item_ids_json=json.dumps(
                        [int(x) for x in item_ids if isinstance(x, int)]
                    ),
                    generated_at=generated_at,
                )
                db.add(outfit_row)

        db.commit()
        refreshed = self.get_plan(db, user_id)
        assert refreshed is not None
        return refreshed

    def restore_history(
        self, db: Session, user_id: int, history_id: int
    ) -> WeeklyPlan:
        row = (
            db.query(WeeklyPlanHistory)
            .filter(
                WeeklyPlanHistory.id == history_id,
                WeeklyPlanHistory.user_id == user_id,
            )
            .first()
        )
        if row is None:
            raise LookupError("History entry not found")
        try:
            payload = json.loads(row.plan_json or "{}")
        except json.JSONDecodeError as exc:
            raise ValueError("Corrupt history snapshot") from exc
        # Load restores only — do not snapshot current (that duplicated Previous plans rows).
        return self.apply_plan_payload(db, user_id, payload)

    # --- Named configurations (presets) — config only, distinct from history ---

    def _normalize_preset_name(self, name: str) -> str:
        cleaned = (name or "").strip()
        if not cleaned:
            raise ValueError("name must not be empty")
        if len(cleaned) > WEEK_PLAN_PRESET_NAME_MAX:
            raise ValueError(
                f"name must be at most {WEEK_PLAN_PRESET_NAME_MAX} characters"
            )
        return cleaned

    def _validate_preset_config(
        self, config: WeekPlanPresetConfig
    ) -> WeekPlanPresetConfig:
        reminder = validate_reminder_time(
            config.reminder_time or DEFAULT_REMINDER_TIME
        )
        days_in = config.days or []
        by_dow = {d.day_of_week: d for d in days_in}
        days: list[WeekPlanPresetConfigDay] = []
        for dow in range(7):
            raw = by_dow.get(dow)
            if raw is None:
                days.append(
                    WeekPlanPresetConfigDay(
                        day_of_week=dow,
                        enabled=False,
                        occasion=DEFAULT_OCCASION,
                        style=DEFAULT_STYLE,
                        use_wardrobe_only=True,
                    )
                )
            else:
                days.append(
                    WeekPlanPresetConfigDay(
                        day_of_week=dow,
                        enabled=bool(raw.enabled),
                        occasion=raw.occasion or DEFAULT_OCCASION,
                        style=raw.style or DEFAULT_STYLE,
                        use_wardrobe_only=bool(raw.use_wardrobe_only),
                    )
                )
        return WeekPlanPresetConfig(
            reminder_time=reminder,
            shared_season=config.shared_season or DEFAULT_SEASON,
            days=days,
        )

    def _preset_to_item(self, row: WeeklyPlanPreset) -> WeekPlanPresetItem:
        try:
            raw = json.loads(row.config_json or "{}")
        except json.JSONDecodeError:
            raw = {}
        config = self._validate_preset_config(WeekPlanPresetConfig(**raw))
        return WeekPlanPresetItem(
            id=row.id,
            name=row.name,
            config=config,
            created_at=row.created_at.isoformat() if row.created_at else "",
            updated_at=row.updated_at.isoformat() if row.updated_at else "",
        )

    def _count_presets(self, db: Session, user_id: int) -> int:
        return (
            db.query(WeeklyPlanPreset)
            .filter(WeeklyPlanPreset.user_id == user_id)
            .count()
        )

    def list_presets(
        self, db: Session, user: User
    ) -> WeekPlanPresetListResponse:
        limit, limit_source = resolve_week_plan_preset_limit(user)
        rows = (
            db.query(WeeklyPlanPreset)
            .filter(WeeklyPlanPreset.user_id == user.id)
            .order_by(WeeklyPlanPreset.updated_at.desc())
            .all()
        )
        items = [self._preset_to_item(row) for row in rows]
        return WeekPlanPresetListResponse(
            items=items,
            count=len(items),
            limit=limit,
            limit_source=limit_source,
        )

    def create_preset(
        self, db: Session, user: User, body: WeekPlanPresetCreateRequest
    ) -> WeekPlanPresetItem:
        name = self._normalize_preset_name(body.name)
        config = self._validate_preset_config(body.config)
        limit, _source = resolve_week_plan_preset_limit(user)
        count = self._count_presets(db, user.id)
        if count >= limit:
            raise PresetLimitReachedError(count=count, limit=limit)
        row = WeeklyPlanPreset(
            user_id=user.id,
            name=name,
            config_json=json.dumps(config.model_dump()),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return self._preset_to_item(row)

    def update_preset(
        self,
        db: Session,
        user: User,
        preset_id: int,
        body: WeekPlanPresetUpdateRequest,
    ) -> WeekPlanPresetItem:
        row = (
            db.query(WeeklyPlanPreset)
            .filter(
                WeeklyPlanPreset.id == preset_id,
                WeeklyPlanPreset.user_id == user.id,
            )
            .first()
        )
        if row is None:
            raise LookupError("Preset not found")
        if body.name is None and body.config is None:
            raise ValueError("Provide name and/or config to update")
        if body.name is not None:
            row.name = self._normalize_preset_name(body.name)
        if body.config is not None:
            config = self._validate_preset_config(body.config)
            row.config_json = json.dumps(config.model_dump())
        row.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(row)
        return self._preset_to_item(row)

    def delete_preset(self, db: Session, user: User, preset_id: int) -> bool:
        row = (
            db.query(WeeklyPlanPreset)
            .filter(
                WeeklyPlanPreset.id == preset_id,
                WeeklyPlanPreset.user_id == user.id,
            )
            .first()
        )
        if row is None:
            raise LookupError("Preset not found")
        db.delete(row)
        db.commit()
        return True

    def apply_preset(
        self, db: Session, user: User, preset_id: int
    ) -> WeeklyPlan:
        """Apply config to current plan and clear all outfits. No auto-generate."""
        row = (
            db.query(WeeklyPlanPreset)
            .filter(
                WeeklyPlanPreset.id == preset_id,
                WeeklyPlanPreset.user_id == user.id,
            )
            .first()
        )
        if row is None:
            raise LookupError("Preset not found")
        try:
            raw = json.loads(row.config_json or "{}")
        except json.JSONDecodeError as exc:
            raise ValueError("Corrupt preset config") from exc
        config = self._validate_preset_config(WeekPlanPresetConfig(**raw))
        existing = self.get_plan(db, user.id)
        timezone = existing.timezone if existing is not None else "UTC"
        shared_style = (
            existing.shared_style if existing is not None else DEFAULT_STYLE
        )
        # Config-only payload — outfits omitted so apply_plan_payload clears them
        payload = {
            "reminder_time": config.reminder_time,
            "timezone": timezone,
            "shared_style": shared_style,
            "shared_season": config.shared_season,
            "days": [d.model_dump() for d in config.days],
        }
        return self.apply_plan_payload(db, user.id, payload)
