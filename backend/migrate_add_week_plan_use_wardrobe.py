"""
Add use_wardrobe_only column to weekly_plan_days (default true).
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
        if not _column_exists(conn, engine, "weekly_plan_days", "use_wardrobe_only"):
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
            print("Added weekly_plan_days.use_wardrobe_only")
        else:
            print("weekly_plan_days.use_wardrobe_only already exists")


if __name__ == "__main__":
    migrate_database()
