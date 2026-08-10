"""
Database migration script to add OAuth fields on users.

1. auth_provider VARCHAR(32) nullable
2. provider_user_id VARCHAR(255) nullable
3. hashed_password nullable (OAuth-only users)
"""

from sqlalchemy import text

from models.database import SessionLocal


def migrate():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("Starting OAuth User Fields Migration")
        print("=" * 80)

        for column, ddl in (
            ("auth_provider", "ALTER TABLE users ADD COLUMN auth_provider VARCHAR(32)"),
            ("provider_user_id", "ALTER TABLE users ADD COLUMN provider_user_id VARCHAR(255)"),
        ):
            exists = db.execute(
                text(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema='public'
                      AND table_name='users'
                      AND column_name=:column_name
                    """
                ),
                {"column_name": column},
            ).fetchone()
            if exists:
                print(f"⚠️  users.{column} already exists. Skipping.")
            else:
                print(f"Adding {column}...")
                db.execute(text(ddl))
                db.commit()
                print(f"✅ Added users.{column}")

        print("Making hashed_password nullable...")
        db.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))
        db.commit()
        print("✅ users.hashed_password is nullable")

        print()
        print("Migration complete.")
        print("=" * 80)
    except Exception as e:
        db.rollback()
        print("❌ Migration failed:", str(e))
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
