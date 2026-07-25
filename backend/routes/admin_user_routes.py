"""Admin routes for per-user week-plan preset limit overrides."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from dependencies import get_current_admin_user
from models.database import get_db
from models.user import User
from models.week_plan import (
    WeekPlanPresetLimitPatchRequest,
    WeekPlanPresetLimitPatchResponse,
)
from services.week_plan_preset_limit import (
    resolve_week_plan_preset_limit,
    validate_override_limit,
)

router = APIRouter(prefix="/api/admin/users", tags=["admin-users"])


@router.patch(
    "/{user_id}/week-plan-preset-limit",
    response_model=WeekPlanPresetLimitPatchResponse,
    name="patch_week_plan_preset_limit",
)
async def patch_week_plan_preset_limit(
    user_id: int,
    body: WeekPlanPresetLimitPatchRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        override = validate_override_limit(body.limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    user.week_plan_preset_limit_override = override
    db.commit()
    db.refresh(user)
    effective, source = resolve_week_plan_preset_limit(user)
    return WeekPlanPresetLimitPatchResponse(
        user_id=user.id,
        week_plan_preset_limit_override=user.week_plan_preset_limit_override,
        effective_limit=effective,
        limit_source=source,
    )
