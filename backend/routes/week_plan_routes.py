"""Week outfit planner API routes — auth required."""
from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from controllers.week_plan_controller import WeekPlanController
from dependencies import get_current_active_user
from models.database import get_db
from models.user import User
from models.week_plan import (
    WeekPlanGenerateRequest,
    WeekPlanResponse,
    WeekPlanTodayResponse,
    WeekPlanUpsertRequest,
)

router = APIRouter(prefix="/api/week-plan", tags=["week-plan"])


def get_week_plan_controller() -> WeekPlanController:
    return WeekPlanController()


@router.get("", response_model=WeekPlanResponse, name="get_week_plan")
async def get_week_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    controller: WeekPlanController = Depends(get_week_plan_controller),
):
    return controller.get_plan(db, current_user)


@router.put("", response_model=WeekPlanResponse, name="upsert_week_plan")
async def upsert_week_plan(
    body: WeekPlanUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    controller: WeekPlanController = Depends(get_week_plan_controller),
):
    return controller.upsert_plan(db, current_user, body)


@router.delete("", name="delete_week_plan")
async def delete_week_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    controller: WeekPlanController = Depends(get_week_plan_controller),
):
    return controller.delete_plan(db, current_user)


@router.get("/history", name="list_week_plan_history")
async def list_week_plan_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    controller: WeekPlanController = Depends(get_week_plan_controller),
):
    return controller.list_history(db, current_user)


@router.post(
    "/history/{history_id}/restore",
    response_model=WeekPlanResponse,
    name="restore_week_plan_history",
)
async def restore_week_plan_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    controller: WeekPlanController = Depends(get_week_plan_controller),
):
    return controller.restore_history(db, current_user, history_id)


@router.post("/generate", response_model=WeekPlanResponse, name="generate_week_plan")
async def generate_week_plan(
    body: WeekPlanGenerateRequest = Body(default_factory=WeekPlanGenerateRequest),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    controller: WeekPlanController = Depends(get_week_plan_controller),
):
    return await controller.generate(db, current_user, body)


@router.get("/today", response_model=WeekPlanTodayResponse, name="get_week_plan_today")
async def get_week_plan_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    controller: WeekPlanController = Depends(get_week_plan_controller),
):
    return controller.today(db, current_user)
