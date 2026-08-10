"""
Ensure OAuth-related user columns exist (create_all will not alter existing tables).
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


def ensure_oauth_user_schema(engine: Engine) -> None:
    """Add auth_provider / provider_user_id and allow null hashed_password."""
    with engine.begin() as conn:
        if not _table_exists(conn, engine, "users"):
            return
        cols = _column_names(conn, engine, "users")
        dialect = "sqlite" if "sqlite" in str(engine.url) else "postgres"

        if "auth_provider" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(32)"))
        if "provider_user_id" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN provider_user_id VARCHAR(255)"))

        # Allow OAuth-only users without a password (Postgres; SQLite is loosely typed)
        if dialect == "postgres" and "hashed_password" in cols:
            conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))
