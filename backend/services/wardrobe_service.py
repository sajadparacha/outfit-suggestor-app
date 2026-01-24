"""Wardrobe Service - Business logic for wardrobe operations"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
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
        category: Optional[str] = None,
        search: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> tuple[List[WardrobeItem], int]:
        """
        Get user's wardrobe items with pagination and search
        
        Args:
            db: Database session
            user_id: User ID
            category: Optional category filter
            search: Optional search query (searches in description, color, name)
            limit: Optional limit for pagination
            offset: Optional offset for pagination
            
        Returns:
            Tuple of (List of WardrobeItem objects, total count)
        """
        query = db.query(WardrobeItem).filter(WardrobeItem.user_id == user_id)
        
        if category:
            query = query.filter(WardrobeItem.category == category.lower())
        
        if search:
            # Split search into individual words and search for all of them (AND logic)
            search_words = [word.strip() for word in search.lower().split() if word.strip()]
            
            if not search_words:
                # If no valid words, skip search
                pass
            else:
                # Common category keywords
                category_keywords = ['shirt', 'trouser', 'trousers', 'pants', 'blazer', 'jacket', 
                                   'shoes', 'belt', 'tie', 'suit', 'sweater', 'polo', 't-shirt', 
                                   'jeans', 'shorts', 'other']
                
                # Common color keywords
                color_keywords = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey',
                                'brown', 'orange', 'purple', 'pink', 'navy', 'beige', 'tan', 'maroon',
                                'burgundy', 'olive', 'khaki', 'cream', 'ivory', 'silver', 'gold']
                
                # Build conditions for each word
                word_conditions = []
                
                for word in search_words:
                    word_term = f"%{word}%"
                    word_or_conditions = []
                    
                    # Check if word is a category keyword - if so, prioritize category match
                    is_category_keyword = any(cat == word or word in cat for cat in category_keywords)
                    # Check if word is a color keyword - if so, prioritize color match
                    is_color_keyword = any(col == word or word in col for col in color_keywords)
                    
                    # If it's a category keyword, ONLY match in category field (strict)
                    if is_category_keyword:
                        word_or_conditions.append(
                            WardrobeItem.category.ilike(word_term)
                        )
                    # If it's a color keyword, ONLY match in color field (strict)
                    elif is_color_keyword:
                        word_or_conditions.append(
                            and_(
                                WardrobeItem.color.isnot(None),
                                WardrobeItem.color.ilike(word_term)
                            )
                        )
                    # Otherwise, search in all fields
                    else:
                        # Word in description
                        word_or_conditions.append(
                            and_(
                                WardrobeItem.description.isnot(None),
                                WardrobeItem.description.ilike(word_term)
                            )
                        )
                        
                        # Word in color
                        word_or_conditions.append(
                            and_(
                                WardrobeItem.color.isnot(None),
                                WardrobeItem.color.ilike(word_term)
                            )
                        )
                        
                        # Word in name
                        word_or_conditions.append(
                            and_(
                                WardrobeItem.name.isnot(None),
                                WardrobeItem.name.ilike(word_term)
                            )
                        )
                        
                        # Word in category
                        word_or_conditions.append(
                            WardrobeItem.category.ilike(word_term)
                        )
                    
                    # At least one field must contain this word
                    if word_or_conditions:
                        word_conditions.append(or_(*word_or_conditions))
                    else:
                        # If no conditions (shouldn't happen), skip this word
                        continue
                
                # All words must match (AND logic across words)
                if word_conditions:
                    query = query.filter(and_(*word_conditions))
                # If no word conditions (shouldn't happen), search is effectively skipped
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply ordering
        query = query.order_by(WardrobeItem.created_at.desc())
        
        # Apply pagination
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        items = query.all()
        return items, total_count
    
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
        # Get all items for summary directly (no pagination, no search)
        # Query directly instead of calling get_user_wardrobe to avoid any tuple unpacking issues
        query = db.query(WardrobeItem).filter(WardrobeItem.user_id == user_id)
        items = query.all()
        
        # Ensure items is a list
        if not isinstance(items, list):
            items = []
        
        total_count = len(items)
        
        summary = {
            'total_items': total_count,
            'by_category': {},
            'by_color': {},
            'categories': []
        }
        
        # Process each item
        for item in items:
            # Validate item has required attributes (more reliable than isinstance)
            if not hasattr(item, 'category'):
                # Skip if item doesn't have category attribute
                continue
            
            # Count by category (normalize to lowercase for consistency)
            try:
                category = item.category.lower() if item.category else 'other'
                if category not in summary['by_category']:
                    summary['by_category'][category] = 0
                summary['by_category'][category] += 1
            except (AttributeError, TypeError):
                # Skip this item if category access fails
                continue
            
            # Count by color
            try:
                if hasattr(item, 'color') and item.color:
                    if item.color not in summary['by_color']:
                        summary['by_color'][item.color] = 0
                    summary['by_color'][item.color] += 1
            except (AttributeError, TypeError):
                # Skip color counting for this item
                pass
        
        summary['categories'] = list(summary['by_category'].keys())
        
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
            items, _ = self.get_user_wardrobe(
                db=db,
                user_id=user_id,
                category=category.lower(),
                search=None,
                limit=None,
                offset=None
            )
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

