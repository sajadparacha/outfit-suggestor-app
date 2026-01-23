"""Outfit Service - Business logic for outfit operations"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
import imagehash
from PIL import Image
import io
import base64

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
        history_entry = OutfitHistory(
            user_id=user_id,
            text_input=text_input,
            image_data=image_data,
            model_image=model_image,
            shirt=suggestion.shirt,
            trouser=suggestion.trouser,
            blazer=suggestion.blazer,
            shoes=suggestion.shoes,
            belt=suggestion.belt,
            reasoning=suggestion.reasoning
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        return history_entry
    
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
        # Check if model_image column exists in the database
        has_model_image_column = self._check_model_image_column(db)
        
        if not has_model_image_column:
            # Use raw SQL if column doesn't exist
            query = text("""
                SELECT id, created_at, user_id, text_input, image_data, 
                       shirt, trouser, blazer, shoes, belt, reasoning
                FROM outfit_history
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
            """)
            rows = db.execute(query, {"user_id": user_id, "limit": limit}).fetchall()
            
            # Convert rows to OutfitHistory-like objects
            # Note: This is a simplified approach - in production, you might want
            # to create a proper mapping or use a different approach
            history = []
            for row in rows:
                entry = OutfitHistory(
                    id=row.id,
                    created_at=row.created_at,
                    user_id=row.user_id,
                    text_input=row.text_input,
                    image_data=row.image_data,
                    model_image=None,  # Column doesn't exist
                    shirt=row.shirt,
                    trouser=row.trouser,
                    blazer=row.blazer,
                    shoes=row.shoes,
                    belt=row.belt,
                    reasoning=row.reasoning
                )
                history.append(entry)
            
            return history
        else:
            # Column exists, use normal SQLAlchemy query
            history = (
                db.query(OutfitHistory)
                .filter(OutfitHistory.user_id == user_id)
                .order_by(OutfitHistory.created_at.desc())
                .limit(limit)
                .all()
            )
            
            # Verify all entries belong to this user (safety check)
            for entry in history:
                if entry.user_id != user_id:
                    raise ValueError(
                        f"Data integrity error: Entry {entry.id} does not belong to user {user_id}"
                    )
            
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
    
    def _check_model_image_column(self, db: Session) -> bool:
        """
        Check if model_image column exists in outfit_history table
        
        Args:
            db: Database session
            
        Returns:
            True if column exists, False otherwise
        """
        try:
            # Try to query the column directly - if it exists, this will work
            # If it doesn't exist, we'll get an error and return False
            db.execute(text("SELECT model_image FROM outfit_history LIMIT 1"))
            return True
        except Exception:
            # Column doesn't exist or table doesn't exist
            # For SQLite, we can also check pragma
            try:
                # SQLite-specific check
                if 'sqlite' in str(db.bind.url):
                    result = db.execute(text("PRAGMA table_info(outfit_history)"))
                    columns = [row[1] for row in result.fetchall()]
                    return 'model_image' in columns
                else:
                    # PostgreSQL/other databases
                    result = db.execute(text("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name='outfit_history' AND column_name='model_image'
                    """))
                    return result.fetchone() is not None
            except Exception as e:
                print(f"⚠️ Warning: Could not check for model_image column: {e}")
                return False



