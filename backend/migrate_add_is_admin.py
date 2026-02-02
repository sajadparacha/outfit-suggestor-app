"""
Database migration script to add `is_admin` column to users table.

This script:
1. Adds is_admin BOOLEAN NOT NULL DEFAULT FALSE
2. (Optional) You can manually promote a user to admin after running it.
"""

from sqlalchemy import text

from models.database import SessionLocal


def migrate():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("Starting Admin Role Migration (add users.is_admin)")
        print("=" * 80)

        # Check if column already exists
        exists = db.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema='public'
                  AND table_name='users'
                  AND column_name='is_admin'
                """
            )
        ).fetchone()

        if exists:
            print("⚠️  users.is_admin already exists. Skipping migration.")
            return

        print("Adding is_admin column...")
        db.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE
                """
            )
        )
        db.commit()
        print("✅ Added users.is_admin (default FALSE)")

        print()
        print("Migration complete.")
        print("To make a user admin, run something like:")
        print("  UPDATE users SET is_admin = TRUE WHERE email = 'you@example.com';")
        print("=" * 80)

    except Exception as e:
        db.rollback()
        print("❌ Migration failed:", str(e))
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()

