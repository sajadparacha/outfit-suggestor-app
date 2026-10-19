"""
Ensure outfit_history / wardrobe_items columns that create_all will not add to existing tables.
Safe to call on every startup.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.engine import Engine

from utils.ensure_week_plan_schema import _column_names, _table_exists


def ensure_outfit_history_schema(engine: Engine) -> None:
    """Add outfit_history.image_from_wardrobe and image_thumbnail columns if missing."""
    with engine.begin() as conn:
        if not _table_exists(conn, engine, "outfit_history"):
            return
        columns = _column_names(conn, engine, "outfit_history")
        if "image_from_wardrobe" not in columns:
            default = "0" if "sqlite" in str(engine.url) else "FALSE"
            conn.execute(
                text(
                    "ALTER TABLE outfit_history "
                    f"ADD COLUMN image_from_wardrobe BOOLEAN NOT NULL DEFAULT {default}"
                )
            )
            print("✅ Added outfit_history.image_from_wardrobe")
        if "image_thumbnail" not in columns:
            conn.execute(text("ALTER TABLE outfit_history ADD COLUMN image_thumbnail TEXT"))
            print("✅ Added outfit_history.image_thumbnail")


def ensure_wardrobe_schema(engine: Engine) -> None:
    """Add wardrobe_items.image_thumbnail if missing."""
    with engine.begin() as conn:
        if not _table_exists(conn, engine, "wardrobe_items"):
            return
        if "image_thumbnail" in _column_names(conn, engine, "wardrobe_items"):
            return
        conn.execute(text("ALTER TABLE wardrobe_items ADD COLUMN image_thumbnail TEXT"))
        print("✅ Added wardrobe_items.image_thumbnail")
