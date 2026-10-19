"""256px photo thumbnails for list responses.

Thumbnails are written alongside each photo; rows saved before the column existed are
filled on first read. Callers commit.
"""
from typing import Dict, Iterable, Optional

from sqlalchemy.orm import Session

from models.outfit_history import OutfitHistory
from models.wardrobe import WardrobeItem
from utils.image_processor import make_thumbnail


def wardrobe_thumbnails(
    db: Session, user_id: int, item_ids: Iterable[Optional[int]]
) -> Dict[int, Optional[str]]:
    """Thumbnail per wardrobe item ID owned by user_id, backfilling missing ones."""
    ids = {i for i in item_ids if i is not None}
    if not ids:
        return {}
    rows = (
        db.query(
            WardrobeItem.id,
            WardrobeItem.image_thumbnail,
            WardrobeItem.image_data.isnot(None).label("has_image"),
        )
        .filter(WardrobeItem.user_id == user_id, WardrobeItem.id.in_(ids))
        .all()
    )
    result: Dict[int, Optional[str]] = {row.id: row.image_thumbnail for row in rows}
    missing = [row.id for row in rows if row.image_thumbnail is None and row.has_image]
    if missing:
        for row in db.query(WardrobeItem.id, WardrobeItem.image_data).filter(
            WardrobeItem.id.in_(missing)
        ):
            thumbnail = make_thumbnail(row.image_data)
            if thumbnail:
                db.query(WardrobeItem).filter(WardrobeItem.id == row.id).update(
                    {"image_thumbnail": thumbnail}, synchronize_session=False
                )
                result[row.id] = thumbnail
    return result


def history_thumbnails(db: Session, entry_ids: Iterable[int]) -> Dict[int, str]:
    """Generate and store thumbnails for history rows that have image_data but no thumbnail."""
    ids = list(set(entry_ids))
    if not ids:
        return {}
    result: Dict[int, str] = {}
    for row in db.query(OutfitHistory.id, OutfitHistory.image_data).filter(
        OutfitHistory.id.in_(ids),
        OutfitHistory.image_data.isnot(None),
        OutfitHistory.image_thumbnail.is_(None),
    ):
        thumbnail = make_thumbnail(row.image_data)
        if thumbnail:
            db.query(OutfitHistory).filter(OutfitHistory.id == row.id).update(
                {"image_thumbnail": thumbnail}, synchronize_session=False
            )
            result[row.id] = thumbnail
    return result
