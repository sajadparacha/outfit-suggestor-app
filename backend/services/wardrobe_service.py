"""Wardrobe Service - Business logic for wardrobe operations"""
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime

from models.wardrobe import WardrobeItem
from models.user import User


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

