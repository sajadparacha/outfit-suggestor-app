"""Outfit Service - Business logic for outfit operations"""
from typing import Dict, Iterable, Optional, List, Set
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
import imagehash
from PIL import Image
import io
import base64
from types import SimpleNamespace
from datetime import datetime

from models.outfit import OutfitSuggestion
from models.outfit_history import OutfitHistory
from models.wardrobe import WardrobeItem
from services.photo_thumbnails import history_thumbnails, wardrobe_thumbnails
from utils.image_processor import make_thumbnail

HISTORY_SLOT_ID_COLUMNS = (
    "shirt_id",
    "trouser_id",
    "blazer_id",
    "shoes_id",
    "belt_id",
    "sweater_id",
    "outerwear_id",
    "tie_id",
)

# Default threshold - will be overridden by Config if available
DEFAULT_IMAGE_SIMILARITY_THRESHOLD = 5


class OutfitService:
    """Service for outfit-related business logic"""
    
    def save_outfit_history(
        self,
        db: Session,
        user_id: Optional[int],
        text_input: str,
        image_data: str,
        model_image: Optional[str],
        suggestion: OutfitSuggestion,
        occasion: Optional[str] = None,
        season: Optional[str] = None,
        style: Optional[str] = None,
        image_from_wardrobe: bool = False,
    ) -> OutfitHistory:
        """
        Save outfit suggestion to history
        
        Args:
            db: Database session
            user_id: User ID (optional for anonymous users)
            text_input: User's text input
            image_data: Base64 encoded uploaded image
            model_image: Base64 encoded model image (optional)
            suggestion: Outfit suggestion object
            image_from_wardrobe: image_data is the photo of suggestion.source_wardrobe_item_id;
                store a reference instead of a copy
            
        Returns:
            Created OutfitHistory entry
        """
        columns = self._get_outfit_history_columns(db)
        image_from_wardrobe = bool(image_from_wardrobe)
        if (
            image_from_wardrobe
            and "image_from_wardrobe" in columns
            and getattr(suggestion, "source_wardrobe_item_id", None) is not None
        ):
            image_data = None
        else:
            image_from_wardrobe = False
        payload = {
            "user_id": user_id,
            "text_input": text_input,
            "image_data": image_data,
            "image_thumbnail": make_thumbnail(image_data),
            "shirt": suggestion.shirt,
            "trouser": suggestion.trouser,
            "blazer": suggestion.blazer,
            "shoes": suggestion.shoes,
            "belt": suggestion.belt,
            "reasoning": suggestion.reasoning,
            "sweater": suggestion.sweater,
            "outerwear": suggestion.outerwear,
            "tie": suggestion.tie,
        }
        if "created_at" in columns:
            payload["created_at"] = datetime.utcnow()
        optional_history_fields = {
            "model_image": model_image,
            "shirt_id": getattr(suggestion, "shirt_id", None),
            "trouser_id": getattr(suggestion, "trouser_id", None),
            "blazer_id": getattr(suggestion, "blazer_id", None),
            "shoes_id": getattr(suggestion, "shoes_id", None),
            "belt_id": getattr(suggestion, "belt_id", None),
            "sweater_id": getattr(suggestion, "sweater_id", None),
            "outerwear_id": getattr(suggestion, "outerwear_id", None),
            "tie_id": getattr(suggestion, "tie_id", None),
            "source_wardrobe_item_id": getattr(suggestion, "source_wardrobe_item_id", None),
            "image_from_wardrobe": image_from_wardrobe,
            "occasion": occasion,
            "season": season,
            "style": style,
        }
        for key, value in optional_history_fields.items():
            if key in columns:
                payload[key] = value

        payload = {key: value for key, value in payload.items() if key in columns}
        column_names = ", ".join(payload.keys())
        placeholders = ", ".join([f":{key}" for key in payload.keys()])
        db.execute(
            text(f"INSERT INTO outfit_history ({column_names}) VALUES ({placeholders})"),
            payload,
        )
        db.commit()

        # Return a lightweight object that matches existing callsites.
        return OutfitHistory(**payload)
    
    def check_duplicate_image(
        self,
        db: Session,
        user_id: int,
        image_base64: str
    ) -> Optional[OutfitHistory]:
        """
        Check if an image already exists in user's history
        
        Args:
            db: Database session
            user_id: User ID
            image_base64: Base64 encoded image to check
            
        Returns:
            Matching OutfitHistory entry if duplicate found, None otherwise
        """
        # Query user's history entries with images
        history = (
            db.query(OutfitHistory)
            .filter(OutfitHistory.user_id == user_id)
            .filter(
                or_(
                    OutfitHistory.image_data.isnot(None),
                    OutfitHistory.image_from_wardrobe.is_(True),
                )
            )
            .order_by(OutfitHistory.created_at.desc())
            .all()
        )
        wardrobe_images = self.load_wardrobe_images(
            db,
            user_id,
            (e.source_wardrobe_item_id for e in history if e.image_data is None),
        )
        
        # Check for duplicate using perceptual hashing
        for entry in history:
            stored = entry.image_data or wardrobe_images.get(entry.source_wardrobe_item_id)
            if stored and self._images_are_similar(image_base64, stored):
                return entry
        
        return None

    def is_wardrobe_photo(self, image_base64: str, item: Optional[WardrobeItem]) -> bool:
        """True when image_base64 shows the same photo as the wardrobe item's image."""
        if item is None or not item.image_data or not image_base64:
            return False
        return image_base64 == item.image_data or self._images_are_similar(
            image_base64, item.image_data
        )

    @staticmethod
    def load_wardrobe_images(
        db: Session, user_id: int, item_ids: Iterable[Optional[int]]
    ) -> Dict[int, Optional[str]]:
        ids = {i for i in item_ids if i is not None}
        if not ids:
            return {}
        rows = (
            db.query(WardrobeItem.id, WardrobeItem.image_data)
            .filter(WardrobeItem.user_id == user_id, WardrobeItem.id.in_(ids))
            .all()
        )
        return {row.id: row.image_data for row in rows}

    @staticmethod
    def copy_wardrobe_photo_into_history(db: Session, item: WardrobeItem) -> None:
        """Store the item's current photo on history rows that reference it.

        Call before the item is deleted or its photo replaced, so those rows keep the
        photo they were made from. Does not commit.
        """
        if not item.image_data:
            return
        db.query(OutfitHistory).filter(
            OutfitHistory.user_id == item.user_id,
            OutfitHistory.source_wardrobe_item_id == item.id,
            OutfitHistory.image_from_wardrobe.is_(True),
            OutfitHistory.image_data.is_(None),
        ).update(
            {
                "image_data": item.image_data,
                "image_thumbnail": item.image_thumbnail or make_thumbnail(item.image_data),
                "image_from_wardrobe": False,
            },
            synchronize_session=False,
        )
    
    def get_user_history(
        self,
        db: Session,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
        wardrobe_item_id: Optional[int] = None,
        include_images: bool = True,
    ) -> List[SimpleNamespace]:
        """
        Get a page of the user's outfit history, newest first.

        Entries carry image_thumbnail (256px) and image_data=None; use get_history_entry
        for the full photo.

        Args:
            db: Database session
            user_id: User ID
            limit: Maximum number of entries to return
            offset: Number of entries to skip
            wardrobe_item_id: Only entries made from or using this wardrobe item
            include_images: False leaves image_thumbnail and model_image empty

        Returns:
            List of history entries
        """
        columns = self._get_outfit_history_columns(db)
        where = ["user_id = :user_id"]
        params: Dict[str, object] = {"user_id": user_id, "limit": limit, "offset": offset}
        if wardrobe_item_id is not None:
            where.append(self._references_wardrobe_item_sql(columns))
            params["wardrobe_item_id"] = wardrobe_item_id
        history = self._select_history(
            db, columns, " AND ".join(where), params, paginate=True, full_image=False,
            include_images=include_images,
        )
        if include_images:
            self._attach_thumbnails(db, user_id, history)
        return history

    def get_history_entry(
        self, db: Session, user_id: int, entry_id: int
    ) -> Optional[SimpleNamespace]:
        """One history entry with the full input photo (image_data) and its thumbnail."""
        columns = self._get_outfit_history_columns(db)
        history = self._select_history(
            db,
            columns,
            "user_id = :user_id AND id = :entry_id",
            {"user_id": user_id, "entry_id": entry_id},
            paginate=False,
            full_image=True,
            include_images=True,
        )
        if not history:
            return None
        entry = history[0]
        if getattr(entry, "image_from_wardrobe", False) and not entry.image_data:
            images = self.load_wardrobe_images(db, user_id, [entry.source_wardrobe_item_id])
            entry.image_data = images.get(entry.source_wardrobe_item_id)
        self._attach_thumbnails(db, user_id, history)
        return entry

    @staticmethod
    def _references_wardrobe_item_sql(columns: Set[str]) -> str:
        conditions = [
            f"{column} = :wardrobe_item_id"
            for column in ("source_wardrobe_item_id", *HISTORY_SLOT_ID_COLUMNS)
            if column in columns
        ]
        # Rows saved before item IDs were stored only share the identical photo
        conditions.append(
            "(image_data IS NOT NULL AND image_data = ("
            "SELECT image_data FROM wardrobe_items "
            "WHERE id = :wardrobe_item_id AND user_id = :user_id))"
        )
        return "(" + " OR ".join(conditions) + ")"

    def _attach_thumbnails(self, db: Session, user_id: int, history: List[SimpleNamespace]) -> None:
        """Fill image_thumbnail from the row, a backfill, or the source wardrobe item."""
        from_wardrobe = [
            entry for entry in history
            if getattr(entry, "image_from_wardrobe", False) and not entry.has_image_data
        ]
        needs_backfill = [
            entry.id for entry in history
            if entry.has_image_data and not entry.image_thumbnail
        ]
        backfilled = history_thumbnails(db, needs_backfill)
        wardrobe_thumbs = wardrobe_thumbnails(
            db, user_id, (entry.source_wardrobe_item_id for entry in from_wardrobe)
        )
        for entry in history:
            if entry.id in backfilled:
                entry.image_thumbnail = backfilled[entry.id]
        for entry in from_wardrobe:
            entry.image_thumbnail = wardrobe_thumbs.get(entry.source_wardrobe_item_id)
        if backfilled or wardrobe_thumbs:
            db.commit()

    def _select_history(
        self,
        db: Session,
        columns: Set[str],
        where_sql: str,
        params: Dict[str, object],
        paginate: bool,
        full_image: bool,
        include_images: bool,
    ) -> List[SimpleNamespace]:
        select_preference = [
            "id",
            "created_at",
            "user_id",
            "text_input",
            "image_thumbnail",
            "model_image",
            "shirt",
            "trouser",
            "blazer",
            "shoes",
            "belt",
            "reasoning",
            "sweater",
            "outerwear",
            "tie",
            "shirt_id",
            "trouser_id",
            "blazer_id",
            "shoes_id",
            "belt_id",
            "sweater_id",
            "outerwear_id",
            "tie_id",
            "source_wardrobe_item_id",
            "image_from_wardrobe",
            "occasion",
            "season",
            "style",
        ]
        if not include_images:
            select_preference = [
                c for c in select_preference if c not in ("image_thumbnail", "model_image")
            ]
        select_columns = [column for column in select_preference if column in columns]
        if not select_columns:
            return []
        if "image_data" in columns:
            select_columns.append(
                "image_data" if full_image else "(image_data IS NOT NULL) AS has_image_data"
            )

        query = text(
            f"""
                SELECT {", ".join(select_columns)}
                FROM outfit_history
                WHERE {where_sql}
                ORDER BY created_at DESC, id DESC
                {"LIMIT :limit OFFSET :offset" if paginate else ""}
            """
        )
        rows = db.execute(query, params).fetchall()
        history = []
        for row in rows:
            entry = SimpleNamespace(**dict(row._mapping))
            if full_image:
                entry.has_image_data = bool(getattr(entry, "image_data", None))
            else:
                entry.image_data = None
                entry.has_image_data = bool(getattr(entry, "has_image_data", False))
            if not hasattr(entry, "image_thumbnail"):
                entry.image_thumbnail = None
            if not hasattr(entry, "model_image"):
                entry.model_image = None
            history.append(entry)
        return history
    
    def delete_history_entry(
        self,
        db: Session,
        entry_id: int,
        user_id: int
    ) -> bool:
        """
        Delete an outfit history entry
        
        Args:
            db: Database session
            entry_id: History entry ID to delete
            user_id: User ID (for security - can only delete own entries)
            
        Returns:
            True if deleted, False if not found or doesn't belong to user
        """
        entry = (
            db.query(OutfitHistory)
            .filter(OutfitHistory.id == entry_id)
            .filter(OutfitHistory.user_id == user_id)
            .first()
        )
        
        if not entry:
            return False
        
        db.delete(entry)
        db.commit()
        return True
    
    def _images_are_similar(
        self,
        image1: str,
        image2: str,
        threshold: Optional[int] = None
    ) -> bool:
        """
        Compare two base64 images for similarity using perceptual hashing
        
        Args:
            image1: Base64 encoded image string
            image2: Base64 encoded image string
            threshold: Hamming distance threshold (0 = identical, higher = more different)
                      If None, uses Config.IMAGE_SIMILARITY_THRESHOLD
            
        Returns:
            True if images are similar within threshold, False otherwise
        """
        if threshold is None:
            # Lazy import to avoid circular dependency
            try:
                from config import Config
                threshold = Config.IMAGE_SIMILARITY_THRESHOLD
            except ImportError:
                threshold = DEFAULT_IMAGE_SIMILARITY_THRESHOLD
        
        try:
            # Decode base64 to image bytes
            img1_bytes = base64.b64decode(image1)
            img2_bytes = base64.b64decode(image2)
            
            # Open as PIL Images
            img1 = Image.open(io.BytesIO(img1_bytes))
            img2 = Image.open(io.BytesIO(img2_bytes))
            
            # Compute perceptual hashes
            hash1 = imagehash.phash(img1)
            hash2 = imagehash.phash(img2)
            
            # Calculate Hamming distance
            distance = int(hash1 - hash2)
            
            return distance <= threshold
            
        except Exception as e:
            # If perceptual hashing fails, fall back to exact match
            print(f"Perceptual hashing failed: {e}, falling back to exact match")
            return image1 == image2
    
    def _get_outfit_history_columns(self, db: Session) -> Set[str]:
        """
        Return currently available column names for outfit_history table.
        
        Args:
            db: Database session
            
        Returns:
            Set of column names
        """
        try:
            if 'sqlite' in str(db.bind.url):
                result = db.execute(text("PRAGMA table_info(outfit_history)"))
                return {row[1] for row in result.fetchall()}

            result = db.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='outfit_history'
            """))
            return {row[0] for row in result.fetchall()}
        except Exception:
            return set()



