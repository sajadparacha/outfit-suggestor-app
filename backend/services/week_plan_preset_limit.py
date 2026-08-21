"""Resolve effective week-plan preset (named config) limits per user.

Future subscription jobs / billing can set `user.subscription_plan` and/or
`user.week_plan_preset_limit_override`; clients always read limit from the API.
"""
from __future__ import annotations

import os
from typing import Literal, Optional, Tuple

from models.user import User

WEEK_PLAN_PRESET_LIMIT_DEFAULT = int(
    os.getenv("WEEK_PLAN_PRESET_LIMIT_DEFAULT", "10")
)

# Ready for future tiers; unused in product UI until plans exist.
WEEK_PLAN_PRESET_LIMIT_BY_PLAN: dict[str, int] = {
    "free": 2,
    "plus": 4,
    "pro": 10,
}

LimitSource = Literal["override", "tier", "default"]


class PresetLimitReachedError(Exception):
    """Raised when creating a preset would exceed the effective limit."""

    def __init__(self, count: int, limit: int):
        self.count = count
        self.limit = limit
        super().__init__(
            f"Preset limit reached ({count}/{limit}). Delete one to save another."
        )


def resolve_week_plan_preset_limit(
    user: User,
) -> Tuple[int, LimitSource]:
    """
    effective_limit(user) =
      1. week_plan_preset_limit_override if not null
      2. else tier default from subscription_plan if mapped
      3. else WEEK_PLAN_PRESET_LIMIT_DEFAULT
    """
    override = getattr(user, "week_plan_preset_limit_override", None)
    if override is not None:
        return int(override), "override"

    plan = getattr(user, "subscription_plan", None)
    if plan:
        key = str(plan).strip().lower()
        if key in WEEK_PLAN_PRESET_LIMIT_BY_PLAN:
            return WEEK_PLAN_PRESET_LIMIT_BY_PLAN[key], "tier"

    return WEEK_PLAN_PRESET_LIMIT_DEFAULT, "default"


def validate_override_limit(limit: Optional[int]) -> Optional[int]:
    """Return normalized override (or None to clear). Raises ValueError if invalid."""
    if limit is None:
        return None
    if not isinstance(limit, int) or isinstance(limit, bool):
        raise ValueError("limit must be an integer or null")
    if limit < 1 or limit > 20:
        raise ValueError("limit must be between 1 and 20")
    return limit
