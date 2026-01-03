"""Wardrobe Service - Business logic for wardrobe operations"""
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import imagehash
from PIL import Image
import io
import base64

from models.wardrobe import WardrobeItem
from models.user import User

# Default threshold - will be overridden by Config if available
DEFAULT_IMAGE_SIMILARITY_THRESHOLD = 5


class WardrobeService:
    """Service for wardrobe-related business logic"""
    
    def add_wardrobe_item(
        self,
        db: Session,
        user_id: int,
        category: str,
        color: str,
        description: str,
        image_data: Optional[str] = None
    ) -> WardrobeItem:
        """
        Add a new item to user's wardrobe (simplified - only category, color, description)
        
        Args:
            db: Database session
            user_id: User ID
            category: Clothing category (shirt, trouser, blazer, shoes, belt, etc.)
            color: Item color with specific shade
            description: Style description including fit, formality, pattern
            image_data: Base64 encoded image (optional)
            
        Returns:
            Created WardrobeItem
        """
        wardrobe_item = WardrobeItem(
            user_id=user_id,
            category=category.lower(),
            name=None,  # Not used in simplified version
            description=description,
            color=color,
            brand=None,  # Not used in simplified version
            size=None,  # Not used in simplified version
            image_data=image_data,
            tags=None,  # Not used in simplified version
            condition=None,  # Not used in simplified version
            wear_count=0
        )
        
        db.add(wardrobe_item)
        db.commit()
        db.refresh(wardrobe_item)
        return wardrobe_item
    
    def get_user_wardrobe(
        self,
        db: Session,
        user_id: int,
        category: Optional[str] = None
    ) -> List[WardrobeItem]:
        """
        Get user's wardrobe items, optionally filtered by category
        
        Args:
            db: Database session
            user_id: User ID
            category: Optional category filter
            
        Returns:
            List of WardrobeItem objects
        """
        query = db.query(WardrobeItem).filter(WardrobeItem.user_id == user_id)
        
        if category:
            query = query.filter(WardrobeItem.category == category.lower())
        
        return query.order_by(WardrobeItem.created_at.desc()).all()
    
    def get_wardrobe_item(
        self,
        db: Session,
        item_id: int,
        user_id: int
    ) -> Optional[WardrobeItem]:
        """
        Get a specific wardrobe item by ID (ensuring it belongs to user)
        
        Args:
            db: Database session
            item_id: Wardrobe item ID
            user_id: User ID (for security)
            
        Returns:
            WardrobeItem if found and belongs to user, None otherwise
        """
        return db.query(WardrobeItem).filter(
            WardrobeItem.id == item_id,
            WardrobeItem.user_id == user_id
        ).first()
    
    def update_wardrobe_item(
        self,
        db: Session,
        item_id: int,
        user_id: int,
        **kwargs
    ) -> Optional[WardrobeItem]:
        """
        Update a wardrobe item
        
        Args:
            db: Database session
            item_id: Wardrobe item ID
            user_id: User ID (for security)
            **kwargs: Fields to update
            
        Returns:
            Updated WardrobeItem if found, None otherwise
        """
        item = self.get_wardrobe_item(db, item_id, user_id)
        if not item:
            return None
        
        # Update allowed fields
        allowed_fields = [
            'name', 'description', 'color', 'brand', 'size',
            'image_data', 'tags', 'condition', 'category'
        ]
        
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                if field == 'category':
                    setattr(item, field, value.lower())
                else:
                    setattr(item, field, value)
        
        item.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(item)
        return item
    
    def delete_wardrobe_item(
        self,
        db: Session,
        item_id: int,
        user_id: int
    ) -> bool:
        """
        Delete a wardrobe item
        
        Args:
            db: Database session
            item_id: Wardrobe item ID
            user_id: User ID (for security)
            
        Returns:
            True if deleted, False if not found
        """
        item = self.get_wardrobe_item(db, item_id, user_id)
        if not item:
            return False
        
        db.delete(item)
        db.commit()
        return True
    
    def get_wardrobe_summary(
        self,
        db: Session,
        user_id: int
    ) -> dict:
        """
        Get a summary of user's wardrobe by category
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            Dictionary with category counts and summaries
        """
        items = self.get_user_wardrobe(db, user_id)
        
        summary = {
            'total_items': len(items),
            'by_category': {},
            'by_color': {},
            'categories': []
        }
        
        for item in items:
            # Count by category
            category = item.category
            if category not in summary['by_category']:
                summary['by_category'][category] = 0
            summary['by_category'][category] += 1
            
            # Count by color
            if item.color:
                if item.color not in summary['by_color']:
                    summary['by_color'][item.color] = 0
                summary['by_color'][item.color] += 1
        
        summary['categories'] = list(summary['by_category'].keys())
        
        return summary
    
    def get_wardrobe_items_by_categories(
        self,
        db: Session,
        user_id: int,
        categories: List[str]
    ) -> dict:
        """
        Get wardrobe items grouped by specified categories
        
        Args:
            db: Database session
            user_id: User ID
            categories: List of categories to fetch
            
        Returns:
            Dictionary mapping category to list of items
        """
        result = {}
        for category in categories:
            items = self.get_user_wardrobe(db, user_id, category=category.lower())
            result[category.lower()] = items
        return result
    
    def check_duplicate_image(
        self,
        db: Session,
        user_id: int,
        image_base64: str,
        threshold: Optional[int] = None
    ) -> Optional[WardrobeItem]:
        """
        Check if an image already exists in user's wardrobe using perceptual hashing
        
        Args:
            db: Database session
            user_id: User ID
            image_base64: Base64 encoded image to check
            threshold: Hamming distance threshold (default from Config)
            
        Returns:
            Matching WardrobeItem if duplicate found, None otherwise
        """
        if threshold is None:
            # Lazy import to avoid circular dependency
            try:
                from config import Config
                threshold = Config.IMAGE_SIMILARITY_THRESHOLD
            except ImportError:
                threshold = DEFAULT_IMAGE_SIMILARITY_THRESHOLD
        
        # Query user's wardrobe items with images
        items = (
            db.query(WardrobeItem)
            .filter(WardrobeItem.user_id == user_id)
            .filter(WardrobeItem.image_data.isnot(None))
            .order_by(WardrobeItem.created_at.desc())
            .all()
        )
        
        # Check for duplicate using perceptual hashing
        for item in items:
            if item.image_data and self._images_are_similar(image_base64, item.image_data, threshold):
                return item
        
        return None
    
    def _images_are_similar(
        self,
        image1: str,
        image2: str,
        threshold: int
    ) -> bool:
        """
        Compare two base64 images for similarity using perceptual hashing
        
        Args:
            image1: Base64 encoded image string
            image2: Base64 encoded image string
            threshold: Hamming distance threshold (0 = identical, higher = more different)
            
        Returns:
            True if images are similar within threshold, False otherwise
        """
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
            print(f"⚠️ Perceptual hashing failed: {e}, falling back to exact match")
            return image1 == image2

