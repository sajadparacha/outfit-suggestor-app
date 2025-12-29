"""Service for matching wardrobe items to outfit suggestions"""
from typing import List, Dict, Optional
from models.wardrobe import WardrobeItem
from models.outfit import OutfitSuggestion


class WardrobeMatcher:
    """Service for matching user's wardrobe items to outfit suggestions"""
    
    def match_wardrobe_to_outfit(
        self,
        outfit_suggestion: OutfitSuggestion,
        wardrobe_items: List[WardrobeItem]
    ) -> Dict[str, List[Dict]]:
        """
        Match wardrobe items to outfit suggestion
        
        Args:
            outfit_suggestion: The suggested outfit
            wardrobe_items: List of user's wardrobe items
            
        Returns:
            Dictionary mapping outfit categories to matching wardrobe items
            Format: {
                "shirt": [wardrobe_item_dict, ...],
                "trouser": [wardrobe_item_dict, ...],
                "blazer": [wardrobe_item_dict, ...],
                "shoes": [wardrobe_item_dict, ...],
                "belt": [wardrobe_item_dict, ...]
            }
        """
        matches = {
            "shirt": [],
            "trouser": [],
            "blazer": [],
            "shoes": [],
            "belt": []
        }
        
        if not wardrobe_items:
            return matches
        
        # Extract suggested items
        suggested_shirt = outfit_suggestion.shirt.lower() if outfit_suggestion.shirt else ""
        suggested_trouser = outfit_suggestion.trouser.lower() if outfit_suggestion.trouser else ""
        suggested_blazer = outfit_suggestion.blazer.lower() if outfit_suggestion.blazer else ""
        suggested_shoes = outfit_suggestion.shoes.lower() if outfit_suggestion.shoes else ""
        suggested_belt = outfit_suggestion.belt.lower() if outfit_suggestion.belt else ""
        
        # Match each wardrobe item
        for item in wardrobe_items:
            item_category = item.category.lower()
            item_color = (item.color or "").lower()
            item_description = (item.description or "").lower()
            
            # Check if item matches suggested outfit by category and keywords
            if item_category == "shirt" and self._matches_suggestion(item, suggested_shirt):
                matches["shirt"].append(self._item_to_dict(item))
            elif item_category == "trouser" and self._matches_suggestion(item, suggested_trouser):
                matches["trouser"].append(self._item_to_dict(item))
            elif item_category in ["blazer", "jacket"] and self._matches_suggestion(item, suggested_blazer):
                matches["blazer"].append(self._item_to_dict(item))
            elif item_category == "shoes" and self._matches_suggestion(item, suggested_shoes):
                matches["shoes"].append(self._item_to_dict(item))
            elif item_category == "belt" and self._matches_suggestion(item, suggested_belt):
                matches["belt"].append(self._item_to_dict(item))
        
        return matches
    
    def _matches_suggestion(self, item: WardrobeItem, suggested_text: str) -> bool:
        """
        Check if a wardrobe item matches the suggested outfit item
        Uses strict matching: requires color match (primary requirement)
        
        Args:
            item: Wardrobe item to check
            suggested_text: Suggested outfit item description
            
        Returns:
            True if item matches, False otherwise
        """
        if not suggested_text:
            return False
        
        item_color = (item.color or "").lower().strip()
        item_description = (item.description or "").lower()
        suggested_lower = suggested_text.lower()
        
        # If item has no color, don't match
        if not item_color or item_color == "unknown":
            return False
        
        # Extract colors from suggestion
        suggestion_colors = self._extract_colors(suggested_lower)
        
        # Check if item color matches any color in suggestion
        # Split item color into words to handle "navy blue" type colors
        item_color_words = item_color.split()
        color_match = False
        
        # Check each word in item color against suggestion colors
        for color_word in item_color_words:
            if len(color_word) < 3:  # Skip very short words
                continue
            # Check if this color word appears in any suggestion color
            for suggestion_color in suggestion_colors:
                if color_word in suggestion_color or suggestion_color in color_word:
                    color_match = True
                    break
            if color_match:
                break
        
        # Also check if the full item color phrase appears in suggestion
        if not color_match and item_color in suggested_lower:
            # Use word boundary to avoid partial matches
            import re
            # Escape special regex characters in color
            escaped_color = re.escape(item_color)
            pattern = r'\b' + escaped_color + r'\b'
            if re.search(pattern, suggested_lower):
                color_match = True
        
        # Require color match - this is the primary requirement
        return color_match
    
    def _extract_colors(self, text: str) -> List[str]:
        """Extract color keywords from text"""
        colors = ["black", "white", "gray", "grey", "navy", "blue", "red", "green", 
                  "yellow", "orange", "purple", "pink", "brown", "beige", "tan",
                  "burgundy", "maroon", "charcoal", "olive", "khaki", "cream", "ivory"]
        
        found_colors = []
        text_lower = text.lower()
        
        for color in colors:
            if color in text_lower:
                found_colors.append(color)
        
        return found_colors
    
    def _extract_styles(self, text: str) -> List[str]:
        """Extract style keywords from text"""
        styles = ["formal", "casual", "business", "slim", "classic", "modern", 
                  "tailored", "relaxed", "fitted", "loose", "tight", "professional"]
        
        found_styles = []
        text_lower = text.lower()
        
        for style in styles:
            if style in text_lower:
                found_styles.append(style)
        
        return found_styles
    
    def _item_to_dict(self, item: WardrobeItem) -> Dict:
        """Convert wardrobe item to dictionary for JSON response"""
        return {
            "id": item.id,
            "category": item.category,
            "color": item.color,
            "description": item.description,
            "image_data": item.image_data
        }

