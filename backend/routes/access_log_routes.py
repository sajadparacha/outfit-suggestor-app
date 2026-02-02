"""Routes for viewing access logs."""
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from models.database import get_db
from models.access_log import AccessLog
from dependencies import get_current_admin_user
from models.user import User

router = APIRouter(prefix="/api/access-logs", tags=["Access Logs"])


@router.get("/")
async def get_access_logs(
    country: Optional[str] = Query(None, description="Filter by country"),
    city: Optional[str] = Query(None, description="Filter by city"),
    age_group: Optional[str] = Query(None, description="Filter by age group (e.g., '18-24', '25-34')"),
    ip_address: Optional[str] = Query(None, description="Filter by IP address"),
    user: Optional[str] = Query(None, description="Filter by user name/email (case-insensitive contains)"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    operation_type: Optional[str] = Query(None, description="Filter by operation type (e.g., 'ai_outfit_suggestion', 'wardrobe_add', 'outfit_history_view')"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)  # Admin-only
):
    """
    Get access logs with filtering options.
    Requires authentication.
    """
    query = db.query(AccessLog)
    
    # Apply filters
    if country:
        query = query.filter(AccessLog.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(AccessLog.city.ilike(f"%{city}%"))
    if age_group:
        query = query.filter(AccessLog.age_group == age_group)
    if ip_address:
        query = query.filter(AccessLog.ip_address == ip_address)
    if user_id:
        query = query.filter(AccessLog.user_id == user_id)
    if user:
        user_like = f"%{user}%"
        matched_user_ids = [
            uid
            for (uid,) in db.query(User.id)
            .filter(or_(User.email.ilike(user_like), User.full_name.ilike(user_like)))
            .all()
        ]
        if not matched_user_ids:
            return {"total": 0, "limit": limit, "offset": offset, "logs": []}
        query = query.filter(AccessLog.user_id.in_(matched_user_ids))
    if operation_type:
        query = query.filter(AccessLog.operation_type == operation_type)
    if endpoint:
        query = query.filter(AccessLog.endpoint.ilike(f"%{endpoint}%"))
    
    # Date filters
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(AccessLog.timestamp >= start_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(AccessLog.timestamp < end_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    logs = query.order_by(AccessLog.timestamp.desc()).offset(offset).limit(limit).all()
    
    # Get user emails for logs that have user_id
    user_ids = {log.user_id for log in logs if log.user_id}
    users = {}
    if user_ids:
        users_query = db.query(User.id, User.email, User.full_name).filter(User.id.in_(user_ids)).all()
        users = {user.id: {"email": user.email, "full_name": user.full_name} for user in users_query}
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": [
            {
                "id": log.id,
                "ip_address": log.ip_address,
                "country": log.country,
                "country_code": log.country_code,
                "city": log.city,
                "region": log.region,
                "endpoint": log.endpoint,
                "method": log.method,
                "status_code": log.status_code,
                "response_time_ms": log.response_time_ms,
                "user_id": log.user_id,
                "user_email": users.get(log.user_id, {}).get("email") if log.user_id else None,
                "user_name": users.get(log.user_id, {}).get("full_name") if log.user_id else None,
                "operation_type": log.operation_type,
                "age_group": log.age_group,
                "timestamp": log.timestamp.isoformat(),
                "user_agent": log.user_agent,
            }
            for log in logs
        ]
    }


@router.get("/stats")
async def get_access_stats(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)  # Admin-only
):
    """
    Get aggregated statistics about access logs.
    Requires authentication.
    """
    query = db.query(AccessLog)
    
    # Apply date filters
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(AccessLog.timestamp >= start_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(AccessLog.timestamp < end_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )
    
    # Total requests
    total_requests = query.count()
    
    # Requests by country
    country_stats = (
        query.filter(AccessLog.country.isnot(None))
        .with_entities(AccessLog.country, func.count(AccessLog.id).label('count'))
        .group_by(AccessLog.country)
        .order_by(func.count(AccessLog.id).desc())
        .limit(20)
        .all()
    )
    
    # Requests by city
    city_stats = (
        query.filter(AccessLog.city.isnot(None))
        .with_entities(AccessLog.city, AccessLog.country, func.count(AccessLog.id).label('count'))
        .group_by(AccessLog.city, AccessLog.country)
        .order_by(func.count(AccessLog.id).desc())
        .limit(20)
        .all()
    )
    
    # Requests by age group
    age_group_stats = (
        query.filter(AccessLog.age_group.isnot(None))
        .with_entities(AccessLog.age_group, func.count(AccessLog.id).label('count'))
        .group_by(AccessLog.age_group)
        .order_by(func.count(AccessLog.id).desc())
        .all()
    )
    
    # Unique IP addresses
    unique_ips = query.with_entities(func.count(func.distinct(AccessLog.ip_address))).scalar()
    
    # Average response time
    avg_response_time = query.with_entities(func.avg(AccessLog.response_time_ms)).scalar()
    
    # Requests by endpoint
    endpoint_stats = (
        query.with_entities(AccessLog.endpoint, func.count(AccessLog.id).label('count'))
        .group_by(AccessLog.endpoint)
        .order_by(func.count(AccessLog.id).desc())
        .limit(20)
        .all()
    )
    
    # Requests by user
    user_stats = (
        query.filter(AccessLog.user_id.isnot(None))
        .with_entities(AccessLog.user_id, func.count(AccessLog.id).label('count'))
        .group_by(AccessLog.user_id)
        .order_by(func.count(AccessLog.id).desc())
        .limit(20)
        .all()
    )
    
    # Get user emails for user stats
    user_ids_for_stats = [user_id for user_id, _ in user_stats]
    users_for_stats = {}
    if user_ids_for_stats:
        users_query = db.query(User.id, User.email, User.full_name).filter(User.id.in_(user_ids_for_stats)).all()
        users_for_stats = {user.id: {"email": user.email, "full_name": user.full_name} for user in users_query}
    
    return {
        "total_requests": total_requests,
        "unique_ip_addresses": unique_ips,
        "average_response_time_ms": round(avg_response_time, 2) if avg_response_time else None,
        "by_country": [
            {"country": country, "count": count}
            for country, count in country_stats
        ],
        "by_city": [
            {"city": city, "country": country, "count": count}
            for city, country, count in city_stats
        ],
        "by_age_group": [
            {"age_group": age_group, "count": count}
            for age_group, count in age_group_stats
        ],
        "by_endpoint": [
            {"endpoint": endpoint, "count": count}
            for endpoint, count in endpoint_stats
        ],
        "by_user": [
            {
                "user_id": user_id,
                "user_email": users_for_stats.get(user_id, {}).get("email"),
                "user_name": users_for_stats.get(user_id, {}).get("full_name"),
                "count": count
            }
            for user_id, count in user_stats
        ]
    }


@router.get("/usage")
async def get_usage_statistics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)  # Admin-only
):
    """
    Get usage statistics for AI calls, wardrobe operations, and outfit history.
    Requires authentication.
    """
    query = db.query(AccessLog)
    
    # Apply date filters
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(AccessLog.timestamp >= start_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(AccessLog.timestamp < end_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )
    
    if user_id:
        query = query.filter(AccessLog.user_id == user_id)
    
    # AI Calls Statistics
    ai_outfit_suggestions = query.filter(AccessLog.operation_type == "ai_outfit_suggestion").count()
    ai_wardrobe_analysis = query.filter(AccessLog.operation_type == "ai_wardrobe_analysis").count()
    total_ai_calls = ai_outfit_suggestions + ai_wardrobe_analysis
    
    # Wardrobe Operations Statistics
    wardrobe_add = query.filter(AccessLog.operation_type == "wardrobe_add").count()
    wardrobe_update = query.filter(AccessLog.operation_type == "wardrobe_update").count()
    wardrobe_delete = query.filter(AccessLog.operation_type == "wardrobe_delete").count()
    wardrobe_view = query.filter(AccessLog.operation_type == "wardrobe_view").count()
    wardrobe_check_duplicate = query.filter(AccessLog.operation_type == "wardrobe_check_duplicate").count()
    wardrobe_summary = query.filter(AccessLog.operation_type == "wardrobe_summary").count()
    total_wardrobe_operations = wardrobe_add + wardrobe_update + wardrobe_delete + wardrobe_view + wardrobe_check_duplicate + wardrobe_summary
    
    # Outfit History Statistics
    outfit_history_view = query.filter(AccessLog.operation_type == "outfit_history_view").count()
    
    # Get unique users for each operation type
    unique_users_ai = query.filter(AccessLog.operation_type.in_(["ai_outfit_suggestion", "ai_wardrobe_analysis"])).with_entities(func.count(func.distinct(AccessLog.user_id))).scalar()
    unique_users_wardrobe = query.filter(AccessLog.operation_type.in_(["wardrobe_add", "wardrobe_update", "wardrobe_delete", "wardrobe_view", "wardrobe_check_duplicate", "wardrobe_summary"])).with_entities(func.count(func.distinct(AccessLog.user_id))).scalar()
    unique_users_history = query.filter(AccessLog.operation_type == "outfit_history_view").with_entities(func.count(func.distinct(AccessLog.user_id))).scalar()
    
    # Average response times
    avg_ai_response_time = query.filter(AccessLog.operation_type.in_(["ai_outfit_suggestion", "ai_wardrobe_analysis"])).with_entities(func.avg(AccessLog.response_time_ms)).scalar()
    avg_wardrobe_response_time = query.filter(AccessLog.operation_type.in_(["wardrobe_add", "wardrobe_update", "wardrobe_delete", "wardrobe_view"])).with_entities(func.avg(AccessLog.response_time_ms)).scalar()
    
    # Usage by user (top 10) - simplified approach
    user_usage_query = (
        query.filter(AccessLog.user_id.isnot(None))
        .with_entities(AccessLog.user_id, func.count(AccessLog.id).label('total_operations'))
        .group_by(AccessLog.user_id)
        .order_by(func.count(AccessLog.id).desc())
        .limit(10)
        .all()
    )
    
    # Get detailed stats for top users
    top_users_data = []
    if user_usage_query:
        user_ids_for_usage = [user_id for user_id, _ in user_usage_query]
        users_query = db.query(User.id, User.email, User.full_name).filter(User.id.in_(user_ids_for_usage)).all()
        users_for_usage = {user.id: {"email": user.email, "full_name": user.full_name} for user in users_query}
        
        for user_id, total_ops in user_usage_query:
            user_query = query.filter(AccessLog.user_id == user_id)
            top_users_data.append({
                "user_id": user_id,
                "user_email": users_for_usage.get(user_id, {}).get("email"),
                "user_name": users_for_usage.get(user_id, {}).get("full_name"),
                "ai_outfit_suggestions": user_query.filter(AccessLog.operation_type == "ai_outfit_suggestion").count(),
                "ai_wardrobe_analysis": user_query.filter(AccessLog.operation_type == "ai_wardrobe_analysis").count(),
                "wardrobe_add": user_query.filter(AccessLog.operation_type == "wardrobe_add").count(),
                "outfit_history_views": user_query.filter(AccessLog.operation_type == "outfit_history_view").count(),
                "total_operations": total_ops
            })
    
    return {
        "ai_calls": {
            "outfit_suggestions": ai_outfit_suggestions,
            "wardrobe_analysis": ai_wardrobe_analysis,
            "total": total_ai_calls,
            "unique_users": unique_users_ai or 0,
            "average_response_time_ms": round(avg_ai_response_time, 2) if avg_ai_response_time else None
        },
        "wardrobe_operations": {
            "add": wardrobe_add,
            "update": wardrobe_update,
            "delete": wardrobe_delete,
            "view": wardrobe_view,
            "check_duplicate": wardrobe_check_duplicate,
            "summary": wardrobe_summary,
            "total": total_wardrobe_operations,
            "unique_users": unique_users_wardrobe or 0,
            "average_response_time_ms": round(avg_wardrobe_response_time, 2) if avg_wardrobe_response_time else None
        },
        "outfit_history": {
            "views": outfit_history_view,
            "unique_users": unique_users_history or 0
        },
        "top_users": top_users_data
    }


@router.get("/timeline")
async def get_access_timeline(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    group_by: str = Query("hour", regex="^(hour|day|week)$", description="Group by hour, day, or week"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)  # Admin-only
):
    """
    Get access logs grouped by time period.
    Requires authentication.
    """
    query = db.query(AccessLog)
    
    # Apply date filters
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(AccessLog.timestamp >= start_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(AccessLog.timestamp < end_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )
    
    # Group by time period
    if group_by == "hour":
        time_expr = func.date_trunc('hour', AccessLog.timestamp)
    elif group_by == "day":
        time_expr = func.date_trunc('day', AccessLog.timestamp)
    elif group_by == "week":
        time_expr = func.date_trunc('week', AccessLog.timestamp)
    else:
        time_expr = func.date_trunc('hour', AccessLog.timestamp)
    
    timeline = (
        query.with_entities(
            time_expr.label('period'),
            func.count(AccessLog.id).label('count')
        )
        .group_by('period')
        .order_by('period')
        .all()
    )
    
    return {
        "group_by": group_by,
        "timeline": [
            {
                "period": period.isoformat() if period else None,
                "count": count
            }
            for period, count in timeline
        ]
    }
