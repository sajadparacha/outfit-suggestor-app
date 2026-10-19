"""
Shrink outfit_history: stop storing copies of wardrobe photos and re-encode model images.

- Rows made from a wardrobe item whose photo matches that item's photo: clear image_data and
  set image_from_wardrobe (the photo is re-read from wardrobe_items on read).
- model_image PNGs are re-encoded as JPEG (same resolution).
- PostgreSQL: VACUUM FULL outfit_history so the freed space is returned to disk.

Deploy the backend that reads image_from_wardrobe before running this against a database.

Usage (from backend/):
    python migrate_slim_outfit_history.py --dry-run
    python migrate_slim_outfit_history.py
    DATABASE_URL="postgresql://..." python migrate_slim_outfit_history.py
"""
import argparse
import os
import sys
from types import SimpleNamespace

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

from services.outfit_service import OutfitService
from utils.ensure_outfit_history_schema import ensure_outfit_history_schema
from utils.ensure_week_plan_schema import _column_names
from utils.image_processor import compress_generated_image

load_dotenv()


def _table_size(conn, is_postgres: bool) -> str:
    if not is_postgres:
        return "n/a"
    return conn.execute(text("SELECT pg_size_pretty(pg_total_relation_size('outfit_history'))")).scalar()


def _reference_wardrobe_photos(conn, dry_run: bool, has_flag: bool) -> tuple[int, int, int]:
    """Returns (rows changed, rows kept because the photo differs, bytes saved)."""
    service = OutfitService()
    ids = conn.execute(
        text(
            f"""
            SELECT h.id FROM outfit_history h
            JOIN wardrobe_items w ON w.id = h.source_wardrobe_item_id AND w.user_id = h.user_id
            WHERE h.image_data IS NOT NULL AND w.image_data IS NOT NULL
              {"AND NOT h.image_from_wardrobe" if has_flag else ""}
            ORDER BY h.id
            """
        )
    ).scalars().all()
    changed = kept = saved = 0
    for row_id in ids:
        history_image, wardrobe_image = conn.execute(
            text(
                """
                SELECT h.image_data, w.image_data FROM outfit_history h
                JOIN wardrobe_items w ON w.id = h.source_wardrobe_item_id
                WHERE h.id = :id
                """
            ),
            {"id": row_id},
        ).one()
        if not service.is_wardrobe_photo(history_image, SimpleNamespace(image_data=wardrobe_image)):
            kept += 1
            continue
        changed += 1
        saved += len(history_image)
        if not dry_run:
            conn.execute(
                text(
                    "UPDATE outfit_history SET image_data = NULL, image_from_wardrobe = :t "
                    "WHERE id = :id"
                ),
                {"t": True, "id": row_id},
            )
            conn.commit()
    return changed, kept, saved


def _compress_model_images(conn, dry_run: bool) -> tuple[int, int]:
    """Returns (rows changed, bytes saved)."""
    ids = conn.execute(
        text("SELECT id FROM outfit_history WHERE model_image IS NOT NULL ORDER BY id")
    ).scalars().all()
    changed = saved = 0
    for row_id in ids:
        raw = conn.execute(
            text("SELECT model_image FROM outfit_history WHERE id = :id"), {"id": row_id}
        ).scalar()
        new = compress_generated_image(raw)
        if new and len(new) < len(raw):
            changed += 1
            saved += len(raw) - len(new)
            if not dry_run:
                conn.execute(
                    text("UPDATE outfit_history SET model_image = :v WHERE id = :id"),
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
    if not dry_run:
        ensure_outfit_history_schema(engine)

    with engine.connect() as conn:
        print(f"Before: outfit_history {_table_size(conn, is_postgres)}")
        has_flag = "image_from_wardrobe" in _column_names(conn, engine, "outfit_history")
        changed, kept, saved = _reference_wardrobe_photos(conn, dry_run, has_flag)
        print(
            f"Wardrobe photo copies removed: {changed} ({saved / 1048576:.1f} MB); "
            f"kept {kept} that differ from the wardrobe photo"
        )
        changed, saved = _compress_model_images(conn, dry_run)
        print(f"Model images re-encoded as JPEG: {changed} ({saved / 1048576:.1f} MB saved)")

    if is_postgres and vacuum and not dry_run:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            print("VACUUM FULL outfit_history ...")
            conn.execute(text("VACUUM FULL ANALYZE outfit_history"))
            print(f"After: outfit_history {_table_size(conn, is_postgres)}")
    engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--dry-run", action="store_true", help="Report only; change nothing")
    parser.add_argument("--no-vacuum", action="store_true", help="Skip VACUUM FULL")
    args = parser.parse_args()
    migrate_database(dry_run=args.dry_run, vacuum=not args.no_vacuum)
