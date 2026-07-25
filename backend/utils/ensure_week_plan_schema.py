"""
Ensure weekly_plan_days has columns that create_all will not add to existing tables.
Safe to call on every startup.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.engine import Engine


def _column_names(conn, engine: Engine, table_name: str) -> set[str]:
    if "sqlite" in str(engine.url):
        rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
        return {row[1] for row in rows}
    rows = conn.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = :table_name
            """
        ),
        {"table_name": table_name},
    ).fetchall()
    return {row[0] for row in rows}


def _table_exists(conn, engine: Engine, table_name: str) -> bool:
    if "sqlite" in str(engine.url):
        row = conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=:name"
            ),
            {"name": table_name},
        ).fetchone()
        return row is not None
    row = conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_name = :table_name
            """
        ),
        {"table_name": table_name},
    ).fetchone()
    return row is not None


def ensure_week_plan_day_columns(engine: Engine) -> None:
    """Add per-day style / use_wardrobe_only if missing (Railway create_all gap)."""
    with engine.begin() as conn:
        if not _table_exists(conn, engine, "weekly_plan_days"):
            return
        cols = _column_names(conn, engine, "weekly_plan_days")
        if "style" not in cols:
            conn.execute(
                text(
                    "ALTER TABLE weekly_plan_days "
                    "ADD COLUMN style VARCHAR(64) NOT NULL DEFAULT 'classic'"
                )
            )
            print("✅ Added weekly_plan_days.style")
        if "use_wardrobe_only" not in cols:
            if "sqlite" in str(engine.url):
                conn.execute(
                    text(
                        "ALTER TABLE weekly_plan_days "
                        "ADD COLUMN use_wardrobe_only BOOLEAN NOT NULL DEFAULT 1"
                    )
                )
            else:
                conn.execute(
                    text(
                        "ALTER TABLE weekly_plan_days "
                        "ADD COLUMN use_wardrobe_only BOOLEAN NOT NULL DEFAULT TRUE"
                    )
                )
            print("✅ Added weekly_plan_days.use_wardrobe_only")
