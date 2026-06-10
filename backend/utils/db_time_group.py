"""Cross-database helpers for grouping timestamps in reports."""
from sqlalchemy import func
from sqlalchemy.orm import Session


def time_bucket_expr(session: Session, column, group_by: str = "day"):
    """Return a SQL expression that buckets a datetime column by hour/day/week."""
    dialect = session.get_bind().dialect.name
    if dialect == "sqlite":
        if group_by == "hour":
            return func.strftime("%Y-%m-%d %H:00:00", column)
        if group_by == "week":
            return func.strftime("%Y-%W", column)
        return func.strftime("%Y-%m-%d", column)

    if group_by == "hour":
        return func.date_trunc("hour", column)
    if group_by == "week":
        return func.date_trunc("week", column)
    return func.date_trunc("day", column)
