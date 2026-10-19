"""
Shrink week plan storage: drop wardrobe photos copied into plan JSON and old history rows.

- weekly_plan_history: keep the newest HISTORY_KEEP_PER_USER snapshots per user, and strip
  matching_wardrobe_items[*].image_data from the rest (photos are re-read from wardrobe_items).
- weekly_plan_outfits: strip the same photos from outfit_json.
- PostgreSQL: VACUUM FULL both tables so the freed space is returned to disk.

Usage (from backend/):
    python migrate_slim_week_plan_history.py --dry-run
    python migrate_slim_week_plan_history.py
    DATABASE_URL="postgresql://..." python migrate_slim_week_plan_history.py
"""
import argparse
import json
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

from services.week_plan_service import HISTORY_KEEP_PER_USER, without_matching_item_images

load_dotenv()

TABLES = ("weekly_plan_history", "weekly_plan_outfits")


def _slim_plan_json(raw: str) -> str:
    data = json.loads(raw or "{}")
    for day in data.get("days") or []:
        if isinstance(day, dict):
            day["outfit"] = without_matching_item_images(day.get("outfit"))
    return json.dumps(data)


def _slim_outfit_json(raw: str) -> str:
    return json.dumps(without_matching_item_images(json.loads(raw or "{}")))


def _table_sizes(conn, is_postgres: bool) -> dict:
    if not is_postgres:
        return {}
    return {
        table: conn.execute(
            text("SELECT pg_size_pretty(pg_total_relation_size(:t))"), {"t": table}
        ).scalar()
        for table in TABLES
    }


def _slim_column(conn, table: str, column: str, slim, dry_run: bool) -> tuple[int, int]:
    """Rewrite rows one at a time (rows can be tens of MB). Returns (rows changed, bytes saved)."""
    ids = [r[0] for r in conn.execute(text(f"SELECT id FROM {table} ORDER BY id"))]
    changed = saved = 0
    for row_id in ids:
        raw = conn.execute(
            text(f"SELECT {column} FROM {table} WHERE id = :id"), {"id": row_id}
        ).scalar()
        try:
            new = slim(raw)
        except (json.JSONDecodeError, TypeError, AttributeError):
            print(f"  skip {table}#{row_id}: unreadable JSON")
            continue
        if len(new) < len(raw or ""):
            changed += 1
            saved += len(raw) - len(new)
            if not dry_run:
                conn.execute(
                    text(f"UPDATE {table} SET {column} = :v WHERE id = :id"),
                    {"v": new, "id": row_id},
                )
                conn.commit()
    return changed, saved


def migrate_database(dry_run: bool, vacuum: bool) -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    engine = create_engine(database_url)
    is_postgres = engine.dialect.name == "postgresql"
    print(f"Database: {database_url.rsplit('@', 1)[-1]}{' (dry run)' if dry_run else ''}")

    with engine.connect() as conn:
        print(f"Before: {_table_sizes(conn, is_postgres)}")

        stale = conn.execute(
            text(
                """
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (
                        PARTITION BY user_id ORDER BY created_at DESC, id DESC
                    ) AS rn
                    FROM weekly_plan_history
                ) ranked
                WHERE rn > :keep
                """
            ),
            {"keep": HISTORY_KEEP_PER_USER},
        ).scalars().all()
        print(f"History rows beyond newest {HISTORY_KEEP_PER_USER} per user: {len(stale)}")
        if stale and not dry_run:
            for i in range(0, len(stale), 500):
                batch = ",".join(str(int(x)) for x in stale[i : i + 500])
                conn.execute(text(f"DELETE FROM weekly_plan_history WHERE id IN ({batch})"))
            conn.commit()

        changed, saved = _slim_column(
            conn, "weekly_plan_history", "plan_json", _slim_plan_json, dry_run
        )
        print(f"History snapshots stripped: {changed} ({saved / 1048576:.1f} MB of JSON)")
        changed, saved = _slim_column(
            conn, "weekly_plan_outfits", "outfit_json", _slim_outfit_json, dry_run
        )
        print(f"Plan outfits stripped: {changed} ({saved / 1048576:.1f} MB of JSON)")

    if is_postgres and vacuum and not dry_run:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            for table in TABLES:
                print(f"VACUUM FULL {table} ...")
                conn.execute(text(f"VACUUM FULL ANALYZE {table}"))
            print(f"After: {_table_sizes(conn, is_postgres)}")
    engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--dry-run", action="store_true", help="Report only; change nothing")
    parser.add_argument("--no-vacuum", action="store_true", help="Skip VACUUM FULL")
    args = parser.parse_args()
    migrate_database(dry_run=args.dry_run, vacuum=not args.no_vacuum)
