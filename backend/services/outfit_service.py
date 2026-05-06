"""Outfit Service - Business logic for outfit operations"""
from typing import Optional, List, Set
from sqlalchemy.orm import Session
from sqlalchemy import text
import imagehash
from PIL import Image
import io
import base64
from types import SimpleNamespace
from datetime import datetime

from models.outfit import OutfitSuggestion
from models.outfit_history import OutfitHistory

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
        suggestion: OutfitSuggestion
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
            
        Returns:
            Created OutfitHistory entry
        """
        columns = self._get_outfit_history_columns(db)
        payload = {
            "user_id": user_id,
            "text_input": text_input,
            "image_data": image_data,
            "shirt": suggestion.shirt,
            "trouser": suggestion.trouser,
            "blazer": suggestion.blazer,
            "shoes": suggestion.shoes,
            "belt": suggestion.belt,
            "reasoning": suggestion.reasoning,
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
            "source_wardrobe_item_id": getattr(suggestion, "source_wardrobe_item_id", None),
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
            .filter(OutfitHistory.image_data.isnot(None))
            .order_by(OutfitHistory.created_at.desc())
            .all()
        )
        
        # Check for duplicate using perceptual hashing
        for entry in history:
            if self._images_are_similar(image_base64, entry.image_data):
                return entry
        
        return None
    
    def get_user_history(
        self,
        db: Session,
        user_id: int,
        limit: int = 20
    ) -> List[OutfitHistory]:
        """
        Get user's outfit history
        
        Args:
            db: Database session
            user_id: User ID
            limit: Maximum number of entries to return
            
        Returns:
            List of OutfitHistory entries
        """
        columns = self._get_outfit_history_columns(db)
        select_preference = [
            "id",
            "created_at",
            "user_id",
            "text_input",
            "image_data",
            "model_image",
            "shirt",
            "trouser",
            "blazer",
            "shoes",
            "belt",
            "reasoning",
            "shirt_id",
            "trouser_id",
            "blazer_id",
            "shoes_id",
            "belt_id",
            "source_wardrobe_item_id",
        ]
        select_columns = [column for column in select_preference if column in columns]
        if not select_columns:
            return []

        query = text(
            f"""
                SELECT {", ".join(select_columns)}
                FROM outfit_history
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
            """
        )
        rows = db.execute(query, {"user_id": user_id, "limit": limit}).fetchall()
        history = [SimpleNamespace(**dict(row._mapping)) for row in rows]
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
            distance = hash1 - hash2
            
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



