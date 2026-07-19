"""Week plan controller — generate outfits via OutfitController paths."""
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from controllers.outfit_controller import OutfitController
from models.outfit import OutfitSuggestion
from models.user import User
from models.week_plan import (
    WeekPlanGenerateRequest,
    WeekPlanResponse,
    WeekPlanTodayResponse,
    WeekPlanUpsertRequest,
)
from services.wardrobe_service import WardrobeService
from services.week_plan_service import (
    WeekPlanService,
    empty_plan_response,
    extract_wardrobe_item_ids,
    outfit_summary,
    plan_to_response,
)


class WeekPlanController:
    def __init__(
        self,
        week_plan_service: Optional[WeekPlanService] = None,
        outfit_controller: Optional[OutfitController] = None,
    ):
        self.week_plan_service = week_plan_service or WeekPlanService()
        self.outfit_controller = outfit_controller

    def _require_outfit_controller(self) -> OutfitController:
        if self.outfit_controller is None:
            from config import get_outfit_controller

            self.outfit_controller = get_outfit_controller()
        return self.outfit_controller

    def get_plan(self, db: Session, current_user: User) -> WeekPlanResponse:
        plan = self.week_plan_service.get_plan(db, current_user.id)
        if plan is None:
            return empty_plan_response()
        return plan_to_response(plan)

    def upsert_plan(
        self, db: Session, current_user: User, body: WeekPlanUpsertRequest
    ) -> WeekPlanResponse:
        try:
            plan = self.week_plan_service.upsert_plan(db, current_user.id, body)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return plan_to_response(plan)

    def delete_plan(self, db: Session, current_user: User) -> dict:
        deleted = self.week_plan_service.delete_plan(db, current_user.id)
        return {"deleted": deleted}

    def today(self, db: Session, current_user: User) -> WeekPlanTodayResponse:
        return self.week_plan_service.today_response(db, current_user.id)

    async def _suggest_open(
        self,
        *,
        outfit_controller: OutfitController,
        text_input: str,
        occasion: str,
        season: str,
        style: str,
        db: Session,
        current_user: User,
        previous_outfit_text: Optional[str],
        avoid_outfit_texts: Optional[list[str]],
    ) -> OutfitSuggestion:
        """Text-only suggestion that is not wardrobe-only (AI may invent items)."""
        wardrobe_service = WardrobeService()
        all_items, _ = wardrobe_service.get_user_wardrobe(
            db=db,
            user_id=current_user.id,
            category=None,
            search=None,
            limit=None,
            offset=None,
        )
        wardrobe_items_dict = outfit_controller._group_items_by_outfit_slot(all_items)
        filters_context = f"Occasion: {occasion}, Season: {season}, Style: {style}"
        combined = filters_context
        extra = (text_input or "").strip()
        if extra:
            combined += f". Additional preferences: {extra}"

        suggestion, cost_info = outfit_controller.ai_service.get_outfit_suggestion_text_only(
            text_input=combined,
            wardrobe_items=wardrobe_items_dict if all_items else None,
            wardrobe_only=False,
            previous_outfit_text=previous_outfit_text,
            avoid_outfit_texts=avoid_outfit_texts,
        )
        if all_items:
            matching_items = outfit_controller.wardrobe_matcher.match_wardrobe_to_outfit(
                suggestion, all_items
            )
            suggestion.matching_wardrobe_items = matching_items

        outfit_controller.outfit_service.save_outfit_history(
            db=db,
            user_id=current_user.id,
            text_input=combined,
            image_data=None,
            model_image=None,
            suggestion=suggestion,
            occasion=occasion,
            season=season,
            style=style,
        )
        if hasattr(suggestion, "model_dump"):
            data = suggestion.model_dump()
            data["cost"] = cost_info
            return OutfitSuggestion(**data)
        suggestion.cost = cost_info
        return suggestion

    async def generate(
        self,
        db: Session,
        current_user: User,
        body: Optional[WeekPlanGenerateRequest] = None,
    ) -> WeekPlanResponse:
        body = body or WeekPlanGenerateRequest()
        plan = self.week_plan_service.get_plan(db, current_user.id)
        if plan is None:
            raise HTTPException(
                status_code=400,
                detail="Save a week plan before generating outfits.",
            )

        if body.day_of_week is not None:
            target_days = [
                d
                for d in plan.days
                if d.day_of_week == body.day_of_week and d.enabled
            ]
            if not target_days:
                raise HTTPException(
                    status_code=400,
                    detail="That day is not enabled in your week plan.",
                )
        else:
            target_days = [d for d in plan.days if d.enabled]
            if not target_days:
                raise HTTPException(
                    status_code=400,
                    detail="Enable at least one day before generating.",
                )

        wardrobe_service = WardrobeService()
        items, total = wardrobe_service.get_user_wardrobe(
            db=db,
            user_id=current_user.id,
            category=None,
            search=None,
            limit=1,
            offset=0,
        )
        has_wardrobe = total > 0 and bool(items)

        wardrobe_days = [
            d for d in target_days if bool(getattr(d, "use_wardrobe_only", True))
        ]
        open_days = [
            d for d in target_days if not bool(getattr(d, "use_wardrobe_only", True))
        ]

        # Wardrobe-only days with no wardrobe: clear and skip; message if nothing else to do
        if wardrobe_days and not has_wardrobe:
            for day in wardrobe_days:
                self.week_plan_service.clear_day_outfit(db, day)
            db.commit()
            if not open_days:
                refreshed = self.week_plan_service.get_plan(db, current_user.id)
                assert refreshed is not None
                return plan_to_response(
                    refreshed,
                    wardrobe_empty=True,
                    message="Add items to your wardrobe to generate outfits.",
                )

        outfit_controller = self._require_outfit_controller()
        used_ids = self.week_plan_service.collect_used_item_ids(
            plan,
            exclude_day=body.day_of_week,
        )
        avoid_texts: list[str] = []

        days_to_generate = sorted(
            ([d for d in wardrobe_days if has_wardrobe] + open_days),
            key=lambda d: d.day_of_week,
        )

        for day in days_to_generate:
            use_wardrobe = bool(getattr(day, "use_wardrobe_only", True))
            avoid_note = ""
            if used_ids and use_wardrobe:
                avoid_note = (
                    f" Prefer different wardrobe items than IDs already used this week: "
                    f"{', '.join(str(i) for i in used_ids)}. Avoid repeating those items when possible."
                )
            text_input = (
                f"Week planner day {day.day_of_week}. "
                f"Create one complete outfit for this day.{avoid_note}"
            )
            if use_wardrobe:
                suggestion = await outfit_controller.suggest_outfit_from_wardrobe_only(
                    text_input=text_input,
                    occasion=day.occasion,
                    season=plan.shared_season,
                    style=getattr(day, "style", None) or plan.shared_style or "classic",
                    db=db,
                    current_user=current_user,
                    selected_wardrobe_item_ids=None,
                    previous_outfit_text=avoid_texts[-1] if avoid_texts else None,
                    avoid_outfit_texts=avoid_texts[-5:] if avoid_texts else None,
                )
            else:
                suggestion = await self._suggest_open(
                    outfit_controller=outfit_controller,
                    text_input=text_input,
                    occasion=day.occasion,
                    season=plan.shared_season,
                    style=getattr(day, "style", None) or plan.shared_style or "classic",
                    db=db,
                    current_user=current_user,
                    previous_outfit_text=avoid_texts[-1] if avoid_texts else None,
                    avoid_outfit_texts=avoid_texts[-5:] if avoid_texts else None,
                )

            self.week_plan_service.save_day_outfit(db, day, suggestion)
            new_ids = extract_wardrobe_item_ids(suggestion)
            for i in new_ids:
                if i not in used_ids:
                    used_ids.append(i)
            avoid_texts.append(outfit_summary(suggestion))

        db.commit()
        refreshed = self.week_plan_service.get_plan(db, current_user.id)
        assert refreshed is not None
        message = None
        wardrobe_empty = False
        if wardrobe_days and not has_wardrobe and open_days:
            wardrobe_empty = True
            message = (
                "Some days use wardrobe only — add wardrobe items for those days. "
                "Other days were generated without wardrobe-only."
            )
        return plan_to_response(
            refreshed, wardrobe_empty=wardrobe_empty, message=message
        )
