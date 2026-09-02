"""
Add pinned_items_json column to weekly_plan_days (slot -> wardrobe item id).
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()


def _column_exists(conn, engine, table_name: str, column_name: str) -> bool:
    if "sqlite" in str(engine.url):
        result = conn.execute(text(f"PRAGMA table_info({table_name})"))
        return any(row[1] == column_name for row in result.fetchall())

    result = conn.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name=:table_name AND column_name=:column_name
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    )
    return result.fetchone() is not None


def migrate_database() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    engine = create_engine(database_url)
    with engine.begin() as conn:
        if not _column_exists(conn, engine, "weekly_plan_days", "pinned_items_json"):
            conn.execute(
                text(
                    "ALTER TABLE weekly_plan_days "
                    "ADD COLUMN pinned_items_json TEXT NOT NULL DEFAULT '{}'"
                )
            )
            print("Added weekly_plan_days.pinned_items_json")
        else:
            print("weekly_plan_days.pinned_items_json already exists")


if __name__ == "__main__":
    migrate_database()
