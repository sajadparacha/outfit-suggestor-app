"""
Optional migration helper: ensure error_events table exists.

create_all() on startup already creates new tables. Use this if you need an
explicit migration step on an existing deployment without restarting create_all.
"""
from models.database import Base, engine
from models.error_event import ErrorEvent  # noqa: F401


def migrate():
    print("=" * 80)
    print("Ensuring error_events table exists")
    print("=" * 80)
    Base.metadata.create_all(bind=engine, tables=[ErrorEvent.__table__])
    print("✅ error_events ready")
    print("=" * 80)


if __name__ == "__main__":
    migrate()
