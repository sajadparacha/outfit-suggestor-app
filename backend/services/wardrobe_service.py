"""Wardrobe Service - Business logic for wardrobe operations"""
import random
from typing import Optional, List, Dict, Any, Set, Tuple, Union
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime, timezone
import imagehash
from PIL import Image
import io
import base64

from models.wardrobe import WardrobeItem
from models.user import User

# Default threshold - will be overridden by Config if available
DEFAULT_IMAGE_SIMILARITY_THRESHOLD = 5


class WardrobeService:
    STYLE_LIBRARY: Dict[str, List[str]] = {
        "shirt": ["oxford", "linen", "textured", "smart casual", "overshirt"],
        "trouser": ["chino", "slim-fit", "relaxed-fit", "tailored", "straight-leg"],
        "blazer": ["unstructured", "lightweight", "casual blazer", "linen blazer", "soft shoulder"],
        "sweater": ["crew neck", "v-neck", "cardigan", "merino", "cable knit"],
        "jacket": ["bomber", "denim jacket", "field jacket", "lightweight shell", "harrington"],
        "tie": ["silk", "knit tie", "classic width", "textured", "solid"],
        "shoes": ["loafers", "clean sneakers", "derby shoes", "driving shoes", "minimal leather sneakers"],
        "belt": ["leather", "braided", "reversible", "formal leather", "casual leather"],
    }

    FORMAL_GAP_OCCASIONS: Set[str] = {"business", "formal", "office"}

    BASE_GAP_CATEGORIES: List[str] = [
        "shirt", "trouser", "blazer", "sweater", "jacket", "shoes", "belt",
    ]

    STYLE_ALIASES: Dict[str, List[str]] = {
        "oxford": ["oxford"],
        "linen": ["linen"],
        "textured": ["textured", "herringbone", "waffle", "twill texture"],
        "smart casual": ["smart casual", "smart-casual"],
        "overshirt": ["overshirt", "shirt jacket"],
        "chino": ["chino", "chinos"],
        "slim-fit": ["slim fit", "slim-fit", "slim"],
        "relaxed-fit": ["relaxed fit", "relaxed-fit", "relaxed"],
        "tailored": ["tailored"],
        "straight-leg": ["straight leg", "straight-leg"],
        "unstructured": ["unstructured"],
        "lightweight": ["lightweight", "light weight"],
        "casual blazer": ["casual blazer", "sport coat", "sportcoat"],
        "linen blazer": ["linen blazer"],
        "soft shoulder": ["soft shoulder"],
        "loafers": ["loafer", "loafers"],
        "clean sneakers": ["clean sneakers", "minimal sneakers", "minimal sneaker"],
        "derby shoes": ["derby", "derby shoes"],
        "driving shoes": ["driving shoes", "driving loafers"],
        "minimal leather sneakers": ["leather sneakers", "leather sneaker"],
        "leather": ["leather"],
        "braided": ["braided", "woven"],
        "reversible": ["reversible"],
        "formal leather": ["formal leather", "dress leather"],
        "casual leather": ["casual leather"],
        "crew neck": ["crew neck", "crewneck", "crew-neck"],
        "v-neck": ["v-neck", "v neck", "vneck"],
        "cardigan": ["cardigan", "cardigans"],
        "merino": ["merino", "merino wool"],
        "cable knit": ["cable knit", "cable-knit", "cableknit"],
        "bomber": ["bomber", "bomber jacket"],
        "denim jacket": ["denim jacket", "jean jacket"],
        "field jacket": ["field jacket", "utility jacket"],
        "lightweight shell": ["lightweight shell", "windbreaker", "rain shell"],
        "harrington": ["harrington", "harrington jacket"],
        "silk": ["silk", "silk tie"],
        "knit tie": ["knit tie", "knitted tie"],
        "classic width": ["classic width", "standard width"],
        "solid": ["solid", "plain tie"],
        "trendy": ["trendy", "fashion-forward", "statement"],
    }

    # 0 = casual, 1 = smart-casual, 2 = professional/formal
    STYLE_FORMALITY: Dict[str, Dict[str, int]] = {
        "shirt": {"oxford": 2, "linen": 0, "textured": 1, "smart casual": 1, "overshirt": 0},
        "trouser": {"chino": 1, "slim-fit": 2, "relaxed-fit": 0, "tailored": 2, "straight-leg": 1},
        "blazer": {
            "unstructured": 1,
            "lightweight": 1,
            "casual blazer": 1,
            "linen blazer": 1,
            "soft shoulder": 1,
        },
        "sweater": {"crew neck": 1, "v-neck": 2, "cardigan": 1, "merino": 2, "cable knit": 0},
        "jacket": {
            "bomber": 0,
            "denim jacket": 0,
            "field jacket": 0,
            "lightweight shell": 0,
            "harrington": 1,
        },
        "tie": {"silk": 2, "knit tie": 1, "classic width": 2, "textured": 1, "solid": 2},
        "shoes": {
            "loafers": 1,
            "clean sneakers": 0,
            "derby shoes": 2,
            "driving shoes": 0,
            "minimal leather sneakers": 0,
        },
        "belt": {
            "leather": 1,
            "braided": 0,
            "reversible": 1,
            "formal leather": 2,
            "casual leather": 0,
        },
    }

    PRIORITY_ESSENTIAL = "Essential"
    PRIORITY_USEFUL = "Useful"
    PRIORITY_SKIP = "Skip"
    _PRIORITY_SORT = {"Essential": 0, "Useful": 1, "Skip": 2}
    CATEGORY_DISPLAY_LABELS = {
        "shirt": "Shirts",
        "trouser": "Trousers",
        "shoes": "Shoes",
        "blazer": "Blazers",
        "sweater": "Sweaters",
        "jacket": "Jackets",
        "tie": "Ties",
        "belt": "Belts",
    }

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
        
        item.updated_at = datetime.now(timezone.utc)
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
    
    def get_random_outfit(
        self,
        db: Session,
        user_id: int,
        occasion: str = "casual",
        season: str = "all",
        style: str = "modern"
    ) -> Dict[str, Any]:
        """
        Get a random outfit from user's wardrobe based on occasion, season, and style filters.
        Randomly selects one item per category (shirt, trouser, blazer, shoes, belt).
        
        Args:
            db: Database session
            user_id: User ID
            occasion: Occasion filter (casual, business, formal, etc.)
            season: Season filter (all, spring, summer, fall, winter)
            style: Style filter (modern, classic, etc.)
            
        Returns:
            Dict with shirt, trouser, blazer, shoes, belt, reasoning, matching_wardrobe_items
        """
        categories = ["shirt", "trouser", "blazer", "shoes", "belt"]
        
        # Build search string from filters
        search_parts = [occasion] if occasion else []
        if season and season.lower() != "all":
            search_parts.append(season)
        if style:
            search_parts.append(style)
        search_query = " ".join(search_parts) if search_parts else None
        
        result = {}
        matching_items = {cat: [] for cat in categories}
        
        for category in categories:
            # First try with search filter
            items, _ = self.get_user_wardrobe(
                db=db,
                user_id=user_id,
                category=category,
                search=search_query,
                limit=None,
                offset=None
            )
            # If no items match search, get all items in category
            if not items:
                items, _ = self.get_user_wardrobe(
                    db=db,
                    user_id=user_id,
                    category=category,
                    search=None,
                    limit=None,
                    offset=None
                )
            if items:
                chosen = random.choice(items)
                desc = chosen.description or ""
                color = chosen.color or ""
                text = f"{color} {category}".strip() + (f" - {desc}" if desc else "")
                result[category] = text
                result[f"{category}_id"] = chosen.id
                matching_items[category] = [{
                    "id": chosen.id,
                    "category": chosen.category,
                    "color": chosen.color,
                    "description": chosen.description,
                    "image_data": chosen.image_data
                }]
            else:
                result[category] = f"No {category} in wardrobe"
        
        occasion_label = occasion or "casual"
        season_label = season if season and season.lower() != "all" else "all seasons"
        style_label = style or "modern"
        result["reasoning"] = (
            f"Random outfit from your wardrobe based on your preferences: "
            f"{occasion_label}, {season_label}, {style_label}. "
            "Each item was randomly selected from your collection."
        )
        result["matching_wardrobe_items"] = matching_items
        
        return result

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

    def _phash_distance(self, image1: str, image2: str) -> int:
        """
        Return perceptual hash distance (0 = identical, higher = more different).
        Returns 999 on error.
        """
        try:
            img1_bytes = base64.b64decode(image1)
            img2_bytes = base64.b64decode(image2)
            img1 = Image.open(io.BytesIO(img1_bytes))
            img2 = Image.open(io.BytesIO(img2_bytes))
            if img1.mode != "RGB":
                img1 = img1.convert("RGB")
            if img2.mode != "RGB":
                img2 = img2.convert("RGB")
            return int(imagehash.phash(img1) - imagehash.phash(img2))
        except Exception:
            return 999

    def find_most_similar_wardrobe_item(
        self,
        image_base64: str,
        wardrobe_items: List[WardrobeItem],
        max_distance: int = 15
    ) -> Optional[WardrobeItem]:
        """
        Find the wardrobe item most similar to the uploaded image.
        Uses relaxed threshold (default 15) to handle different compression pipelines.
        Returns None if no item is within max_distance.
        """
        best_item = None
        best_dist = max_distance + 1
        for item in wardrobe_items:
            if not item.image_data:
                continue
            dist = self._phash_distance(image_base64, item.image_data)
            if dist < best_dist:
                best_dist = dist
                best_item = item
        return best_item

    def reorder_matches_by_upload_similarity(
        self,
        matching_items: Dict[str, List[Dict]],
        image_base64: str
    ) -> None:
        """
        For each category with multiple matches that have images, put the item
        most similar to the uploaded image first. Works when perceptual hash
        distance exceeds duplicate threshold (different compression pipelines).
        """
        for category, items in matching_items.items():
            # Only reorder if we have 2+ items with image_data to compare
            with_images = [(i, m) for i, m in enumerate(items) if m.get("image_data")]
            if len(with_images) < 2:
                continue
            best_idx = None
            best_dist = 999
            for i, m in with_images:
                dist = self._phash_distance(image_base64, m["image_data"])
                if dist < best_dist:
                    best_dist = dist
                    best_idx = i
            if best_idx is not None and best_idx > 0:
                items.insert(0, items.pop(best_idx))

    def _normalize_category(self, category: str) -> str:
        """Normalize wardrobe item category for gap analysis (jacket/coat stay distinct from blazer)."""
        normalized = (category or "").strip().lower()
        aliases = {
            "pants": "trouser",
            "pant": "trouser",
            "trousers": "trouser",
            "jeans": "trouser",
            "blazers": "blazer",
            "jackets": "jacket",
            "coats": "coat",
            "shoe": "shoes",
            "belts": "belt",
            "sweaters": "sweater",
            "ties": "tie",
            "outerwear": "jacket",
            "parka": "coat",
            "overcoat": "coat",
        }
        return aliases.get(normalized, normalized)

    def _gap_analysis_categories(self, occasion: str) -> List[str]:
        categories = list(self.BASE_GAP_CATEGORIES)
        if (occasion or "").strip().lower() in self.FORMAL_GAP_OCCASIONS:
            categories.append("tie")
        return categories

    def _normalize_color(self, color: Optional[str]) -> Optional[str]:
        if not color:
            return None
        lowered = color.strip().lower()
        color_aliases = {
            "navy": "blue",
            "sky blue": "blue",
            "light blue": "blue",
            "dark blue": "blue",
            "charcoal": "gray",
            "grey": "gray",
            "off white": "white",
            "ivory": "white",
            "tan": "beige",
            "maroon": "burgundy",
        }
        for alias, canonical in color_aliases.items():
            if alias in lowered:
                return canonical

        first = lowered.split("/")[0].split(",")[0].strip()
        return first if first else lowered

    def _extract_style_tags(self, description: Optional[str]) -> Set[str]:
        if not description:
            return set()
        text = description.lower()
        style_keywords = {
            "casual": ["casual", "relaxed", "everyday"],
            "formal": ["formal", "ceremony", "dressy", "black tie"],
            "business": ["business", "office", "professional", "smart"],
            "slim fit": ["slim fit", "slim-fit", "fitted"],
            "regular fit": ["regular fit", "regular-fit", "classic fit"],
            "oversized": ["oversized", "loose fit", "boxy"],
            "patterned": ["striped", "checked", "pattern", "print", "plaid"],
            "solid": ["solid", "plain"],
            "athleisure": ["athleisure", "sport", "performance", "stretch"],
            "minimalist": ["minimal", "minimalist", "clean look"],
            "classic": ["classic", "timeless", "traditional"],
        }
        tags: Set[str] = set()
        for tag, keywords in style_keywords.items():
            if any(keyword in text for keyword in keywords):
                tags.add(tag)
        for style_name, keywords in self.STYLE_ALIASES.items():
            if any(keyword in text for keyword in keywords):
                tags.add(style_name)
        return tags

    def _target_colors(self, category: str, occasion: str, season: str, style: str) -> List[str]:
        base = {
            "shirt": ["white", "blue", "black"],
            "trouser": ["black", "navy", "gray", "beige"],
            "blazer": ["navy", "gray", "black"],
            "sweater": ["navy", "gray", "beige", "burgundy"],
            "jacket": ["navy", "black", "olive", "tan"],
            "tie": ["navy", "burgundy", "gray", "black"],
            "shoes": ["black", "brown", "white"],
            "belt": ["black", "brown"],
        }.get(category, [])

        if occasion == "business":
            base.extend(["charcoal", "blue"] if category in {"shirt", "trouser", "blazer", "sweater"} else ["black"])
        elif occasion == "formal":
            base.extend(["white", "black"] if category in {"shirt", "shoes", "belt", "tie"} else ["black", "navy"])
        elif occasion == "office":
            base.extend(["charcoal", "navy"] if category in {"shirt", "trouser", "blazer", "tie"} else ["gray"])
        elif occasion == "party":
            base.extend(["burgundy", "olive"] if category in {"shirt", "blazer", "sweater"} else ["tan"])

        if season == "summer":
            base.extend(["white", "beige", "light blue"])
        elif season == "winter":
            base.extend(["black", "charcoal", "navy"])

        if style in {"bold", "trendy"}:
            base.extend(["olive", "burgundy", "brown"])
        elif style in {"minimalist", "classic"}:
            base.extend(["white", "black", "gray"])

        seen = set()
        ordered = []
        for color in base:
            normalized = self._normalize_color(color)
            if normalized and normalized not in seen:
                seen.add(normalized)
                ordered.append(normalized)
        return ordered

    def _allowed_styles_for_category(self, category: str) -> Set[str]:
        return {tag.strip().lower() for tag in self.STYLE_LIBRARY.get(category, []) if tag.strip()}

    def _filter_styles_for_category(self, category: str, styles: List[str]) -> List[str]:
        allowed = self._allowed_styles_for_category(category)
        if not allowed:
            return styles
        filtered: List[str] = []
        seen: Set[str] = set()
        for style_tag in styles:
            tag = style_tag.strip().lower()
            if tag and tag in allowed and tag not in seen:
                seen.add(tag)
                filtered.append(tag)
        return filtered

    def _item_field(self, item: Any, name: str) -> str:
        if isinstance(item, dict):
            value = item.get(name)
        else:
            value = getattr(item, name, None)
        if value is None:
            return ""
        return str(value).strip()

    def _dress_code_list(
        self,
        dress_code: Optional[Union[str, List[str]]] = None,
        occasion: Optional[str] = None,
    ) -> List[str]:
        if isinstance(dress_code, (list, tuple)):
            raw = list(dress_code)
        elif dress_code:
            raw = [dress_code]
        else:
            raw = []
        codes: List[str] = []
        for item in raw:
            code = self._canonical_dress_code(str(item) if item is not None else None, occasion)
            if code not in codes:
                codes.append(code)
        if not codes:
            codes.append(self._canonical_dress_code(None, occasion))
        return codes

    def _canonical_dress_code(self, dress_code: Optional[str], occasion: Optional[str] = None) -> str:
        code = (dress_code or "").strip().lower().replace("_", "-").replace(" ", "-")
        aliases = {
            "smart-casual": "smart-casual",
            "smartcasual": "smart-casual",
            "business-professional": "business-professional",
            "businessprofessional": "business-professional",
            "business": "business-professional",
            "casual": "casual",
            "formal": "formal",
        }
        if code in aliases:
            return aliases[code]
        occ = (occasion or "").strip().lower()
        if occ in {"business", "office"}:
            return "business-professional"
        if occ in {"formal", "black-tie"}:
            return "formal"
        if occ in {"work"}:
            return "smart-casual"
        return "casual"

    def _normalized_lifestyle_mix(
        self,
        lifestyle_mix: Optional[List[str]] = None,
        primary_lifestyle: Optional[str] = None,
    ) -> List[str]:
        mix: List[str] = []
        for item in lifestyle_mix or []:
            value = str(item).strip().lower()
            if value and value not in mix:
                mix.append(value)
            if len(mix) == 3:
                break
        primary = (primary_lifestyle or "").strip().lower()
        if primary:
            if primary in mix:
                mix = [primary] + [item for item in mix if item != primary]
            elif len(mix) < 3:
                mix = [primary] + mix
            elif mix:
                mix[0] = primary
        return mix[:3]

    def rank_missing_style(
        self,
        category: str,
        tag: str,
        *,
        occasion: str = "casual",
        lifestyle_mix: Optional[List[str]] = None,
        primary_lifestyle: Optional[str] = None,
        dress_code: Optional[Union[str, List[str]]] = None,
    ) -> str:
        tag_key = (tag or "").strip().lower()
        mix = self._normalized_lifestyle_mix(lifestyle_mix, primary_lifestyle)
        primary = mix[0] if mix else ""
        codes = self._dress_code_list(dress_code, occasion)
        formality = self.STYLE_FORMALITY.get(category, {}).get(tag_key, 1)
        targets = {"casual": 0, "smart-casual": 1, "business-professional": 2, "formal": 2}
        ranks = []
        for code in codes:
            distance = abs(formality - targets.get(code, 1))
            if distance == 0:
                ranks.append(self.PRIORITY_ESSENTIAL)
            elif distance == 1:
                ranks.append(self.PRIORITY_USEFUL)
            else:
                ranks.append(self.PRIORITY_SKIP)
        rank = min(ranks, key=lambda value: self._PRIORITY_SORT.get(value, 9))

        if primary == "work" and "smart-casual" in codes:
            if (category, tag_key) in {
                ("shirt", "oxford"),
                ("shirt", "smart casual"),
                ("trouser", "chino"),
                ("blazer", "unstructured"),
                ("shoes", "loafers"),
                ("sweater", "merino"),
                ("belt", "leather"),
            }:
                rank = self.PRIORITY_ESSENTIAL
            if (category, tag_key) in {("jacket", "bomber"), ("jacket", "denim jacket"), ("tie", "silk")}:
                rank = self.PRIORITY_SKIP
        if primary == "sport" and category == "jacket" and tag_key in {"field jacket", "lightweight shell"}:
            rank = self.PRIORITY_ESSENTIAL
        if "sport" in mix and category == "jacket" and tag_key in {"field jacket", "lightweight shell"}:
            if rank == self.PRIORITY_SKIP:
                rank = self.PRIORITY_USEFUL
        if "formal" in mix and tag_key in {"silk", "solid", "derby shoes", "formal leather"}:
            if rank == self.PRIORITY_SKIP:
                rank = self.PRIORITY_USEFUL
            if primary == "formal":
                rank = self.PRIORITY_ESSENTIAL
        return rank

    def order_styles_by_priority(
        self,
        styles: List[str],
        priorities: Dict[str, str],
    ) -> List[str]:
        return sorted(
            styles,
            key=lambda tag: (self._PRIORITY_SORT.get(priorities.get(tag, self.PRIORITY_SKIP), 9), tag),
        )

    def _actionable_styles(self, missing_styles: List[str], priorities: Dict[str, str]) -> List[str]:
        return [
            tag
            for tag in missing_styles
            if priorities.get(tag) in {self.PRIORITY_ESSENTIAL, self.PRIORITY_USEFUL}
        ]

    def _apply_cross_category_peer_rules(
        self,
        inventory: Dict[str, Dict[str, Any]],
        mix: List[str],
        dress_code: Optional[Union[str, List[str]]],
        occasion: str,
    ) -> None:
        codes = self._dress_code_list(dress_code, occasion)
        mix_set = set(mix)
        work_smart = ("work" in mix_set or (mix[:1] == ["work"])) and "smart-casual" in codes
        if not work_smart:
            return
        tie_ranks = inventory.get("tie", {}).get("style_priorities", {})
        jacket_ranks = inventory.get("jacket", {}).get("style_priorities", {})
        if "silk" in tie_ranks:
            tie_ranks["silk"] = self.PRIORITY_USEFUL if "formal" in mix_set else self.PRIORITY_SKIP
        if "bomber" in jacket_ranks:
            jacket_ranks["bomber"] = self.PRIORITY_SKIP
        if "denim jacket" in jacket_ranks:
            jacket_ranks["denim jacket"] = self.PRIORITY_SKIP

    def build_style_inventory(
        self,
        items: List[Any],
        *,
        occasion: str,
        lifestyle_mix: Optional[List[str]] = None,
        primary_lifestyle: Optional[str] = None,
        dress_code: Optional[Union[str, List[str]]] = None,
    ) -> Dict[str, Dict[str, Any]]:
        occasion_value = (occasion or "casual").strip().lower()
        categories = self._gap_analysis_categories(occasion_value)
        by_category: Dict[str, List[Any]] = {category: [] for category in categories}
        for item in items:
            category = self._normalize_category(self._item_field(item, "category"))
            if category in by_category:
                by_category[category].append(item)

        mix = self._normalized_lifestyle_mix(lifestyle_mix, primary_lifestyle)
        inventory: Dict[str, Dict[str, Any]] = {}
        for category in categories:
            cat_items = by_category[category]
            owned = self._filter_styles_for_category(
                category,
                sorted({
                    tag
                    for item in cat_items
                    for tag in self._extract_style_tags(self._item_field(item, "description"))
                }),
            )
            catalog = list(self.STYLE_LIBRARY.get(category, []))
            missing = [tag for tag in catalog if tag not in owned]
            priorities = {
                tag: self.rank_missing_style(
                    category,
                    tag,
                    occasion=occasion_value,
                    lifestyle_mix=mix,
                    primary_lifestyle=mix[0] if mix else primary_lifestyle,
                    dress_code=dress_code,
                )
                for tag in missing
            }
            inventory[category] = {
                "owned_styles": owned,
                "missing_styles": missing,
                "style_priorities": priorities,
                "item_count": len(cat_items),
            }
        self._apply_cross_category_peer_rules(inventory, mix, dress_code, occasion_value)
        for data in inventory.values():
            data["missing_styles"] = self.order_styles_by_priority(
                data["missing_styles"],
                data["style_priorities"],
            )
        return inventory

    def apply_style_inventory(
        self,
        analysis_by_category: Dict[str, Dict[str, Any]],
        inventory: Dict[str, Dict[str, Any]],
        ai_priorities: Optional[Dict[str, Dict[str, str]]] = None,
        *,
        occasion: str = "casual",
        lifestyle_mix: Optional[List[str]] = None,
        primary_lifestyle: Optional[str] = None,
        dress_code: Optional[Union[str, List[str]]] = None,
    ) -> Dict[str, Dict[str, Any]]:
        allowed_ranks = {self.PRIORITY_ESSENTIAL, self.PRIORITY_USEFUL, self.PRIORITY_SKIP}
        merged: Dict[str, Dict[str, Any]] = {}
        rank_map: Dict[str, Dict[str, Any]] = {}
        for category, inv in inventory.items():
            entry = analysis_by_category.get(category) if isinstance(analysis_by_category, dict) else {}
            if not isinstance(entry, dict):
                entry = {}
            owned = list(inv.get("owned_styles") or [])
            missing = list(inv.get("missing_styles") or [])
            ranks = dict(inv.get("style_priorities") or {})
            raw_ai = (ai_priorities or {}).get(category) or entry.get("style_priorities") or {}
            if isinstance(raw_ai, dict):
                allowed_missing = {tag.lower(): tag for tag in missing}
                for key, value in raw_ai.items():
                    tag = allowed_missing.get(str(key).strip().lower())
                    rank = str(value).strip().title()
                    if rank == "Skip":
                        rank = self.PRIORITY_SKIP
                    if tag and rank in allowed_ranks:
                        ranks[tag] = rank
            rank_map[category] = {"style_priorities": ranks}
            merged[category] = {
                "category": category,
                "owned_colors": entry.get("owned_colors", []),
                "owned_styles": owned,
                "missing_colors": entry.get("missing_colors", []),
                "missing_styles": missing,
                "recommended_purchases": entry.get("recommended_purchases", []),
                "item_count": inv.get("item_count", entry.get("item_count", 0)),
                "style_priorities": ranks,
            }
        mix = self._normalized_lifestyle_mix(lifestyle_mix, primary_lifestyle)
        self._apply_cross_category_peer_rules(rank_map, mix, dress_code, occasion)
        for category, entry in merged.items():
            ranks = rank_map.get(category, {}).get("style_priorities") or entry.get("style_priorities") or {}
            entry["style_priorities"] = ranks
            entry["missing_styles"] = self.order_styles_by_priority(
                entry.get("missing_styles") or [],
                ranks,
            )
            if category in inventory:
                inventory[category]["style_priorities"] = ranks
                inventory[category]["missing_styles"] = entry["missing_styles"]
        self.reconcile_owned_vs_missing(merged)
        for category, entry in merged.items():
            if category in inventory:
                inventory[category]["missing_colors"] = list(entry.get("missing_colors") or [])
                inventory[category]["missing_styles"] = list(entry.get("missing_styles") or [])
        return merged

    @staticmethod
    def _display_color_key(color: str) -> str:
        text = " ".join(str(color).strip().lower().replace("-", " ").split())
        if text == "grey":
            return "gray"
        return text

    @staticmethod
    def _display_style_key(style: str) -> str:
        return " ".join(str(style).strip().lower().split())

    def reconcile_owned_vs_missing(self, analysis_by_category: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Drop missing colors/styles that are already listed as owned in the same category."""
        for entry in (analysis_by_category or {}).values():
            if not isinstance(entry, dict):
                continue
            owned_color_keys = {
                self._display_color_key(color)
                for color in (entry.get("owned_colors") or [])
                if str(color).strip()
            }
            seen_missing_colors: Set[str] = set()
            missing_colors: List[str] = []
            for color in entry.get("missing_colors") or []:
                key = self._display_color_key(color)
                if not key or key in owned_color_keys or key in seen_missing_colors:
                    continue
                seen_missing_colors.add(key)
                missing_colors.append(color)
            entry["missing_colors"] = missing_colors

            owned_style_keys = {
                self._display_style_key(style)
                for style in (entry.get("owned_styles") or [])
                if str(style).strip()
            }
            seen_missing_styles: Set[str] = set()
            missing_styles: List[str] = []
            for style in entry.get("missing_styles") or []:
                key = self._display_style_key(style)
                if not key or key in owned_style_keys or key in seen_missing_styles:
                    continue
                seen_missing_styles.add(key)
                missing_styles.append(style)
            ranks = entry.get("style_priorities") or {}
            entry["missing_styles"] = self.order_styles_by_priority(missing_styles, ranks) if ranks else missing_styles
        return analysis_by_category

    def _shopping_row_for_category(
        self,
        category: str,
        entry: Dict[str, Any],
        rank: int,
    ) -> Optional[Dict[str, Any]]:
        priorities = entry.get("style_priorities") or {}
        shop_styles = self._actionable_styles(entry.get("missing_styles") or [], priorities)
        colors = list(entry.get("missing_colors") or [])
        if not colors and not shop_styles:
            return None
        score = (
            (len(colors) * 2)
            + (len(shop_styles) * 2)
            + (2 if entry.get("item_count", 0) == 0 else 0)
        )
        occasion = entry.get("occasion") or "your"
        season = entry.get("season") or "all"
        style = entry.get("style") or "classic"
        return {
            "rank": rank,
            "itemName": self._format_item_name(category, colors, shop_styles),
            "category": category,
            "priority": self._priority_label(score),
            "recommendedColors": colors,
            "recommendedStyles": shop_styles,
            "reason": self._generate_why_this_matters(
                category=category,
                missing_colors=colors,
                missing_styles=shop_styles,
                occasion=occasion,
                season=season,
                style=style,
                item_count=int(entry.get("item_count") or 0),
            ),
            "outfitImpact": f"Unlocks more combinations in {category} for {occasion} looks.",
            "actions": ["Add to shopping list", "Show outfit examples"],
        }

    def ensure_shopping_list_covers_gaps(
        self,
        shopping_list: List[Dict[str, Any]],
        analysis_by_category: Dict[str, Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Keep AI/free list items, then append any clothing category that still has a buyable gap."""
        combined: List[Dict[str, Any]] = []
        covered: Set[str] = set()
        for item in shopping_list or []:
            if not isinstance(item, dict):
                continue
            category = str(item.get("category") or "").strip().lower()
            if category:
                covered.add(category)
            combined.append(dict(item))
        for category, entry in (analysis_by_category or {}).items():
            if not isinstance(entry, dict) or category in covered:
                continue
            row = self._shopping_row_for_category(category, entry, rank=len(combined) + 1)
            if row:
                combined.append(row)
        for index, item in enumerate(combined, start=1):
            item["rank"] = index
        return combined

    def constrain_shopping_list_to_inventory(
        self,
        shopping_list: List[Dict[str, Any]],
        inventory: Dict[str, Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        filtered: List[Dict[str, Any]] = []
        seen_categories: Set[str] = set()
        for item in shopping_list or []:
            if not isinstance(item, dict):
                continue
            category = str(item.get("category") or "").strip().lower()
            if not category or category in seen_categories:
                continue
            rewritten = self._rewrite_shopping_item_from_inventory(item, category, inventory.get(category) or {})
            if not rewritten:
                continue
            seen_categories.add(category)
            filtered.append(rewritten)
        for index, item in enumerate(filtered, start=1):
            item["rank"] = index
        return filtered

    def _rewrite_shopping_item_from_inventory(
        self,
        item: Dict[str, Any],
        category: str,
        inv: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        priorities = inv.get("style_priorities") or {}
        shop_styles = self._actionable_styles(inv.get("missing_styles") or [], priorities)
        colors = list(inv.get("missing_colors") or [])
        if not colors:
            colors = list(item.get("recommendedColors") or item.get("recommended_colors") or [])
        if not shop_styles and not colors:
            return None
        next_item = dict(item)
        next_item["category"] = category
        next_item["itemName"] = self._format_item_name(category, colors, shop_styles)
        next_item["recommendedColors"] = colors
        next_item["recommendedStyles"] = shop_styles
        next_item["reason"] = self._generate_why_this_matters(
            category=category,
            missing_colors=colors,
            missing_styles=shop_styles,
            occasion=str(inv.get("occasion") or item.get("occasion") or "your"),
            season=str(inv.get("season") or "all"),
            style=str(inv.get("style") or "classic"),
            item_count=int(inv.get("item_count") or 0),
        )
        return next_item

    def _target_styles(self, category: str, occasion: str, style: str) -> List[str]:
        defaults = list(self.STYLE_LIBRARY.get(category, ["smart casual"]))
        if occasion == "business":
            if category in {"trouser", "belt"}:
                defaults.extend(["tailored", "formal leather"])
            elif category == "shirt":
                defaults.extend(["smart casual"])
            elif category == "sweater":
                defaults.extend(["merino", "v-neck"])
            elif category == "tie":
                defaults.extend(["silk", "classic width"])
        elif occasion == "formal":
            if category in {"trouser", "blazer"}:
                defaults.extend(["tailored"])
            elif category == "belt":
                defaults.extend(["formal leather"])
            elif category == "tie":
                defaults.extend(["silk", "solid"])
            elif category == "sweater":
                defaults.extend(["v-neck", "merino"])
        elif occasion == "office":
            if category in {"trouser", "blazer"}:
                defaults.extend(["tailored"])
            elif category == "tie":
                defaults.extend(["silk", "classic width"])
            elif category == "sweater":
                defaults.extend(["crew neck", "merino"])
        elif occasion == "party":
            if category == "shirt":
                defaults.extend(["textured"])
            elif category == "blazer":
                defaults.extend(["textured", "unstructured"])
            elif category == "jacket":
                defaults.extend(["bomber", "harrington"])
        elif occasion == "casual":
            if category in {"shirt", "trouser", "blazer"}:
                defaults.extend(["relaxed-fit"])
            elif category == "shoes":
                defaults.extend(["clean sneakers"])
            elif category == "sweater":
                defaults.extend(["crew neck", "cardigan"])
            elif category == "jacket":
                defaults.extend(["denim jacket", "field jacket"])

        if style in {"classic", "minimalist"}:
            if category == "shirt":
                defaults.extend(["oxford"])
            elif category in {"trouser", "blazer"}:
                defaults.extend(["tailored"])
            elif category == "sweater":
                defaults.extend(["merino"])
            elif category == "tie":
                defaults.extend(["solid"])
        elif style in {"bold", "trendy"}:
            if category == "shirt":
                defaults.extend(["textured"])
            elif category == "shoes":
                defaults.extend(["driving shoes"])
            elif category == "blazer":
                defaults.extend(["textured"])
            elif category == "jacket":
                defaults.extend(["bomber"])
            elif category == "sweater":
                defaults.extend(["cable knit"])

        seen: Set[str] = set()
        ordered: List[str] = []
        for style_tag in defaults:
            tag = style_tag.strip().lower()
            if tag and tag not in seen:
                seen.add(tag)
                ordered.append(tag)
        return self._filter_styles_for_category(category, ordered)

    def _priority_label(self, score: int) -> str:
        if score >= 8:
            return "High"
        if score >= 4:
            return "Medium"
        return "Low"

    def _category_display_label(self, category: str) -> str:
        key = (category or "").strip().lower()
        if key in self.CATEGORY_DISPLAY_LABELS:
            return self.CATEGORY_DISPLAY_LABELS[key]
        if not key:
            return "Items"
        pretty = key[:1].upper() + key[1:]
        return pretty if pretty.endswith("s") else f"{pretty}s"

    @staticmethod
    def _join_or(values: List[str]) -> str:
        items = [str(value).strip() for value in values if str(value).strip()]
        if not items:
            return ""
        if len(items) == 1:
            return items[0]
        if len(items) == 2:
            return f"{items[0]} or {items[1]}"
        return f"{', '.join(items[:-1])}, or {items[-1]}"

    def _format_item_name(self, category: str, colors: List[str], styles: List[str]) -> str:
        return self._category_display_label(category)

    def _generate_why_this_matters(
        self,
        category: str,
        missing_colors: List[str],
        missing_styles: List[str],
        occasion: str,
        season: str,
        style: str,
        item_count: int = 0,
    ) -> str:
        label = self._category_display_label(category).lower()
        if not missing_colors and not missing_styles:
            return f"Your {label} options are already balanced for {occasion} and {season} dressing."

        first_color = missing_colors[0] if missing_colors else None
        first_style = missing_styles[0] if missing_styles else None
        if first_color and first_style:
            buy_first = f"{first_color} {first_style}"
        elif first_color:
            buy_first = first_color
        else:
            buy_first = first_style

        also_bits: List[str] = []
        rest_colors = missing_colors[1:]
        rest_styles = missing_styles[1:]
        if rest_colors:
            also_bits.append(self._join_or(rest_colors))
        if rest_styles:
            also_bits.append(self._join_or(rest_styles))

        parts: List[str] = []
        if item_count == 0:
            parts.append(f"You own no {label}.")
        parts.append(f"Buy first {buy_first}.")
        if also_bits:
            parts.append(f"Also missing {'; '.join(also_bits)}.")
        return " ".join(parts)

    def _recommendation_line(self, category: str, missing_colors: List[str], missing_styles: List[str], occasion: str) -> str:
        if not missing_colors and not missing_styles:
            return f"No urgent {category} purchase is needed right now."
        lead_style = missing_styles[0] if missing_styles else category
        if missing_colors:
            if len(missing_colors) > 1:
                return (
                    f"Add a {lead_style} {category} in {missing_colors[0]} or {missing_colors[1]} to improve {occasion} outfit options."
                )
            return f"Add a {missing_colors[0]} {lead_style} {category} to improve {occasion} outfit options."
        return f"Add a {lead_style} {category} to improve {occasion} outfit options."

    def _generate_priority_shopping_list(
        self,
        category_analysis: Dict[str, Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        ranked: List[Tuple[str, int]] = []
        for category, entry in category_analysis.items():
            priorities = entry.get("style_priorities") or {}
            shop_styles = self._actionable_styles(entry.get("missing_styles") or [], priorities)
            if not shop_styles:
                shop_styles = []
            score = (
                (len(entry.get("missing_colors") or []) * 2)
                + (len(shop_styles) * 2)
                + (2 if entry.get("item_count", 0) == 0 else 0)
            )
            ranked.append((category, score))
        ranked.sort(key=lambda item: item[1], reverse=True)

        shopping_list: List[Dict[str, Any]] = []
        for idx, (category, score) in enumerate((pair for pair in ranked if pair[1] > 0), start=1):
            entry = category_analysis[category]
            priorities = entry.get("style_priorities") or {}
            shop_styles = self._actionable_styles(entry.get("missing_styles") or [], priorities)
            priority = self._priority_label(score)
            item_name = self._format_item_name(category, entry["missing_colors"], shop_styles)
            reason = self._generate_why_this_matters(
                category=category,
                missing_colors=entry["missing_colors"],
                missing_styles=shop_styles,
                occasion=entry["occasion"],
                season=entry["season"],
                style=entry["style"],
                item_count=int(entry.get("item_count") or 0),
            )
            shopping_list.append(
                {
                    "rank": idx,
                    "itemName": item_name,
                    "category": category,
                    "priority": priority,
                    "recommendedColors": entry["missing_colors"],
                    "recommendedStyles": shop_styles,
                    "reason": reason,
                    "outfitImpact": f"Unlocks more combinations in {category} for {entry['occasion']} looks.",
                    "actions": ["Add to shopping list", "Show outfit examples"],
                }
            )
        return shopping_list

    def analyze_wardrobe_gaps(
        self,
        db: Session,
        user_id: int,
        occasion: str,
        season: str,
        style: str,
        text_input: str = "",
        lifestyle_mix: Optional[List[str]] = None,
        primary_lifestyle: Optional[str] = None,
        dress_code: Optional[Union[str, List[str]]] = None,
    ) -> Dict[str, Any]:
        occasion = (occasion or "casual").strip().lower()
        categories = self._gap_analysis_categories(occasion)
        season = (season or "all").strip().lower()
        style = (style or "modern").strip().lower()
        all_items, _ = self.get_user_wardrobe(
            db=db,
            user_id=user_id,
            category=None,
            search=None,
            limit=None,
            offset=None,
        )

        by_category: Dict[str, List[WardrobeItem]] = {category: [] for category in categories}
        for item in all_items:
            normalized_category = self._normalize_category(item.category or "")
            if normalized_category in by_category:
                by_category[normalized_category].append(item)

        style_inventory = self.build_style_inventory(
            all_items,
            occasion=occasion,
            lifestyle_mix=lifestyle_mix,
            primary_lifestyle=primary_lifestyle,
            dress_code=dress_code,
        )

        analysis_by_category: Dict[str, Dict[str, Any]] = {}
        category_insights: List[Dict[str, Any]] = []
        for category in categories:
            items = by_category[category]
            owned_colors = sorted({
                normalized
                for normalized in (self._normalize_color(item.color) for item in items)
                if normalized
            })
            inventory_entry = style_inventory.get(category, {})
            owned_styles = list(inventory_entry.get("owned_styles") or [])
            missing_styles = list(inventory_entry.get("missing_styles") or [])
            style_priorities = dict(inventory_entry.get("style_priorities") or {})
            actionable_styles = self._actionable_styles(missing_styles, style_priorities)

            target_colors = self._target_colors(category, occasion.lower(), season.lower(), style.lower())
            missing_colors = [color for color in target_colors if color not in owned_colors]

            recommendations: List[str] = []
            recommendation_line = self._recommendation_line(
                category, missing_colors, actionable_styles, occasion
            )
            if items and not owned_styles and missing_styles:
                recommendation_line = (
                    f"Style tags are not evidenced in your {category} descriptions; "
                    f"start with {actionable_styles[0] if actionable_styles else missing_styles[0]} if it fits this wardrobe."
                )
            recommendations.append(recommendation_line)
            why_this_matters = self._generate_why_this_matters(
                category=category,
                missing_colors=missing_colors,
                missing_styles=actionable_styles or missing_styles,
                occasion=occasion,
                season=season,
                style=style,
                item_count=len(items),
            )
            if items and not owned_styles:
                why_this_matters = (
                    f"Style details are not evidenced in your {category} descriptions, "
                    "so catalog tags are treated as not evidenced rather than proven absent."
                )
            if missing_colors:
                recommendations.append(
                    f"{missing_colors[0].capitalize()} tones can pair well with your most-used {category} outfits."
                )
            if actionable_styles:
                recommendations.append(
                    f"Prioritize {actionable_styles[0]} pieces for more mix-and-match options."
                )

            analysis_by_category[category] = {
                "category": category,
                "owned_colors": owned_colors,
                "owned_styles": owned_styles,
                "missing_colors": missing_colors[:5],
                "missing_styles": missing_styles,
                "recommended_purchases": recommendations[:3],
                "item_count": len(items),
                "style_priorities": style_priorities,
                "occasion": occasion,
                "season": season,
                "style": style,
            }
        self.reconcile_owned_vs_missing(analysis_by_category)
        for category, entry in analysis_by_category.items():
            missing_colors = list(entry.get("missing_colors") or [])
            missing_styles = list(entry.get("missing_styles") or [])
            style_priorities = dict(entry.get("style_priorities") or {})
            actionable_styles = self._actionable_styles(missing_styles, style_priorities)
            items = by_category[category]
            why_this_matters = self._generate_why_this_matters(
                category=category,
                missing_colors=missing_colors,
                missing_styles=actionable_styles or missing_styles,
                occasion=occasion,
                season=season,
                style=style,
                item_count=len(items),
            )
            recommendation_line = self._recommendation_line(
                category, missing_colors, actionable_styles, occasion
            )
            score = (len(missing_colors) * 2) + (len(actionable_styles) * 2) + (2 if len(items) == 0 else 0)
            category_insights.append(
                {
                    "category": category,
                    "missingColors": missing_colors[:5],
                    "missingStyles": actionable_styles[:5] or missing_styles[:5],
                    "priority": self._priority_label(score),
                    "whyThisMatters": why_this_matters,
                    "recommendation": recommendation_line,
                    "suggestedActions": ["Add to shopping list", "Show outfit examples"],
                }
            )

        for entry in analysis_by_category.values():
            entry.pop("occasion", None)
            entry.pop("season", None)
            entry.pop("style", None)

        priority_shopping_list = self._generate_priority_shopping_list(
            {
                key: {
                    **value,
                    "occasion": occasion,
                    "season": season,
                    "style": style,
                }
                for key, value in analysis_by_category.items()
            }
        )

        from services.wardrobe_season_rules import apply_wardrobe_gap_season_filters

        analysis_by_category, priority_shopping_list, category_insights = apply_wardrobe_gap_season_filters(
            season=season,
            occasion=occasion,
            analysis_by_category=analysis_by_category,
            priority_shopping_list=priority_shopping_list,
            category_insights=category_insights,
        )
        priority_shopping_list = self.ensure_shopping_list_covers_gaps(
            priority_shopping_list,
            {
                key: {
                    **value,
                    "occasion": occasion,
                    "season": season,
                    "style": style,
                }
                for key, value in analysis_by_category.items()
            },
        )

        if priority_shopping_list:
            top_items = ", ".join(item["itemName"] for item in priority_shopping_list[:5])
            summary = (
                f"Your wardrobe is close to complete for {occasion} in {season}. "
                f"Start with {top_items} to unlock the most {style} outfit combinations."
            )
        else:
            summary = (
                f"Your wardrobe has strong coverage for {occasion}, {season}, and {style}. "
                "No urgent purchase is needed right now."
            )
        if text_input.strip():
            summary += " Your extra notes were included in the recommendation priorities."

        return {
            "occasion": occasion,
            "season": season,
            "style": style,
            "analysis_mode": "free",
            "analysis_by_category": analysis_by_category,
            "overall_summary": summary,
            "summaryText": summary,
            "analysisDepth": "Basic",
            "priorityShoppingList": priority_shopping_list,
            "categoryInsights": category_insights,
        }