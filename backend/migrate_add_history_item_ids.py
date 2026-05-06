"""
Migration script to add wardrobe item id columns to outfit_history table.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()


def _column_exists(conn, engine, column_name: str) -> bool:
    if "sqlite" in str(engine.url):
        result = conn.execute(text("PRAGMA table_info(outfit_history)"))
        return any(row[1] == column_name for row in result.fetchall())

    result = conn.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='outfit_history' AND column_name=:column_name
            """
        ),
        {"column_name": column_name},
    )
    return result.fetchone() is not None


def migrate_database() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    engine = create_engine(database_url)
    columns_to_add = [
        ("shirt_id", "INTEGER"),
        ("trouser_id", "INTEGER"),
        ("blazer_id", "INTEGER"),
        ("shoes_id", "INTEGER"),
        ("belt_id", "INTEGER"),
        ("source_wardrobe_item_id", "INTEGER"),
    ]

    try:
        with engine.connect() as conn:
            for column_name, column_type in columns_to_add:
                if _column_exists(conn, engine, column_name):
                    print(f"✅ Column '{column_name}' already exists")
                    continue

                print(f"📝 Adding '{column_name}'...")
                conn.execute(
                    text(f"ALTER TABLE outfit_history ADD COLUMN {column_name} {column_type}")
                )
            conn.commit()
            print("✅ outfit_history ID columns migration completed")
    except Exception as exc:
        print(f"❌ Migration failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    migrate_database()
