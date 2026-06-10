"""Admin report routes for outfit search analytics."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from dependencies import get_current_admin_user
from models.database import get_db
from models.outfit_history import OutfitHistory
from models.user import User
from utils.db_time_group import time_bucket_expr
from utils.user_filter import matched_user_ids

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _empty_search_reports_response():
    return {
        "total_searches": 0,
        "by_occasion": [],
        "by_season": [],
        "by_style": [],
        "timeline": [],
        "recent": [],
    }


def _parse_date_range(
    start_date: Optional[str],
    end_date: Optional[str],
    query,
    date_column,
):
    """Apply optional start/end date filters to a query."""
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(date_column >= start_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD",
            )
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(date_column < end_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD",
            )
    return query


@router.get("/searches")
async def get_search_reports(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    occasion: Optional[str] = Query(None, description="Filter by occasion"),
    season: Optional[str] = Query(None, description="Filter by season"),
    style: Optional[str] = Query(None, description="Filter by style"),
    user: Optional[str] = Query(None, description="Filter by user name/email (case-insensitive contains)"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Outfit search aggregates from outfit_history (admin-only).
    """
    query = db.query(OutfitHistory)
    query = _parse_date_range(start_date, end_date, query, OutfitHistory.created_at)

    if occasion:
        query = query.filter(OutfitHistory.occasion.ilike(f"%{occasion}%"))
    if season:
        query = query.filter(OutfitHistory.season.ilike(f"%{season}%"))
    if style:
        query = query.filter(OutfitHistory.style.ilike(f"%{style}%"))

    user_ids = matched_user_ids(db, user=user, user_id=user_id)
    if user_ids is not None:
        if not user_ids:
            return _empty_search_reports_response()
        query = query.filter(OutfitHistory.user_id.in_(user_ids))

    total_searches = query.count()

    occasion_stats = (
        query.filter(OutfitHistory.occasion.isnot(None))
        .with_entities(OutfitHistory.occasion, func.count(OutfitHistory.id).label("count"))
        .group_by(OutfitHistory.occasion)
        .order_by(func.count(OutfitHistory.id).desc())
        .limit(20)
        .all()
    )
    season_stats = (
        query.filter(OutfitHistory.season.isnot(None))
        .with_entities(OutfitHistory.season, func.count(OutfitHistory.id).label("count"))
        .group_by(OutfitHistory.season)
        .order_by(func.count(OutfitHistory.id).desc())
        .limit(20)
        .all()
    )
    style_stats = (
        query.filter(OutfitHistory.style.isnot(None))
        .with_entities(OutfitHistory.style, func.count(OutfitHistory.id).label("count"))
        .group_by(OutfitHistory.style)
        .order_by(func.count(OutfitHistory.id).desc())
        .limit(20)
        .all()
    )

    time_expr = time_bucket_expr(db, OutfitHistory.created_at, "day")
    timeline = (
        query.with_entities(time_expr.label("period"), func.count(OutfitHistory.id).label("count"))
        .group_by("period")
        .order_by("period")
        .all()
    )

    recent_entries = query.order_by(OutfitHistory.created_at.desc()).limit(20).all()
    user_ids = {entry.user_id for entry in recent_entries if entry.user_id}
    users = {}
    if user_ids:
        users_query = (
            db.query(User.id, User.email, User.full_name).filter(User.id.in_(user_ids)).all()
        )
        users = {
            user.id: {"email": user.email, "full_name": user.full_name} for user in users_query
        }

    return {
        "total_searches": total_searches,
        "by_occasion": [
            {"occasion": value, "count": count} for value, count in occasion_stats
        ],
        "by_season": [{"season": value, "count": count} for value, count in season_stats],
        "by_style": [{"style": value, "count": count} for value, count in style_stats],
        "timeline": [
            {
                "period": (
                    period.isoformat()
                    if period is not None and hasattr(period, "isoformat")
                    else period
                ),
                "count": count,
            }
            for period, count in timeline
        ],
        "recent": [
            {
                "id": entry.id,
                "created_at": entry.created_at.isoformat(),
                "occasion": entry.occasion,
                "season": entry.season,
                "style": entry.style,
                "user_id": entry.user_id,
                "user_email": users.get(entry.user_id, {}).get("email") if entry.user_id else None,
                "user_name": users.get(entry.user_id, {}).get("full_name") if entry.user_id else None,
            }
            for entry in recent_entries
        ],
    }
