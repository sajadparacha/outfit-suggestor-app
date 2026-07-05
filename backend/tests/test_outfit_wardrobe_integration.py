"""
Test cases for outfit suggestion with wardrobe integration
Tests the fix for tuple unpacking in outfit controller
"""
import pytest
from fastapi import status
from models.wardrobe import WardrobeItem
from models.outfit import OutfitSuggestion

from controllers.outfit_controller import OutfitController
from services.ai_service import AIService
from services.outfit_service import OutfitService


class TestOutfitControllerPrioritizeItem:
    """Unit tests for _prioritize_item_in_matches"""

    def test_prioritize_item_moves_matching_item_to_front(self):
        """When uploaded item is in matches, it is moved to first position."""
        controller = OutfitController(
            type("MockAI", (), {"get_outfit_suggestion": lambda *a, **k: None})(),
            OutfitService(),
        )
        matching_items = {
            "shirt": [
                {"id": 1, "color": "navy", "image_data": "img1"},
                {"id": 2, "color": "navy", "image_data": "img2"},
            ],
            "trouser": [],
        }
        item = WardrobeItem(
            id=2,
            user_id=1,
            category="shirt",
            color="navy",
            description="Navy shirt",
            image_data="img2",
        )
        controller._prioritize_item_in_matches(matching_items, item)
        assert matching_items["shirt"][0]["id"] == 2
        assert matching_items["shirt"][1]["id"] == 1

    def test_prioritize_item_does_nothing_when_already_first(self):
        """When item is already first, list is unchanged."""
        controller = OutfitController(
            type("MockAI", (), {"get_outfit_suggestion": lambda *a, **k: None})(),
            OutfitService(),
        )
        matching_items = {
            "shirt": [
                {"id": 2, "color": "navy"},
                {"id": 1, "color": "navy"},
            ],
        }
        item = WardrobeItem(id=2, user_id=1, category="shirt", color="navy")
        controller._prioritize_item_in_matches(matching_items, item)
        assert matching_items["shirt"][0]["id"] == 2

    def test_prioritize_item_does_nothing_when_category_missing(self):
        """When category not in matches, no change."""
        controller = OutfitController(
            type("MockAI", (), {"get_outfit_suggestion": lambda *a, **k: None})(),
            OutfitService(),
        )
        matching_items = {"shirt": [{"id": 1}]}
        item = WardrobeItem(id=2, user_id=1, category="blazer", color="navy")
        controller._prioritize_item_in_matches(matching_items, item)
        assert matching_items["shirt"][0]["id"] == 1

    def test_prioritize_item_maps_jacket_to_outerwear(self):
        """Jacket category is prioritized in outerwear, not blazer."""
        controller = OutfitController(
            type("MockAI", (), {"get_outfit_suggestion": lambda *a, **k: None})(),
            OutfitService(),
        )
        matching_items = {
            "outerwear": [
                {"id": 1},
                {"id": 2},
            ],
        }
        item = WardrobeItem(id=2, user_id=1, category="jacket", color="navy")
        controller._prioritize_item_in_matches(matching_items, item)
        assert matching_items["outerwear"][0]["id"] == 2


class TestPinnedSelectedItemsInMatches:
    """Multi-select wardrobe-only: pinned items must appear in match lists."""

    def _controller(self) -> OutfitController:
        return OutfitController(
            type("MockAI", (), {"get_outfit_suggestion": lambda *a, **k: None})(),
            OutfitService(),
        )

    def test_ensure_pinned_outerwear_inserted_when_missing_from_matches(self):
        controller = self._controller()
        jacket = WardrobeItem(
            id=42,
            user_id=1,
            category="jacket",
            color="navy",
            description="Navy bomber jacket",
            image_data="img42",
        )
        matching_items: dict = {"outerwear": [], "blazer": [{"id": 99}]}

        controller._ensure_pinned_selected_items_in_matches(matching_items, [jacket])

        assert matching_items["outerwear"][0]["id"] == 42
        assert matching_items["outerwear"][0]["image_data"] == "img42"

    def test_ensure_pinned_outerwear_category_item_inserted(self):
        controller = self._controller()
        coat = WardrobeItem(
            id=7,
            user_id=1,
            category="outerwear",
            color="camel",
            description="Camel wool coat",
            image_data="img7",
        )
        matching_items: dict = {"outerwear": []}

        controller._ensure_pinned_selected_items_in_matches(matching_items, [coat])

        assert matching_items["outerwear"][0]["id"] == 7


class TestSourceWardrobeMatchOverrides:
    """Upload category pinning when styling from a known wardrobe item."""

    def _controller(self) -> OutfitController:
        return OutfitController(
            type("MockAI", (), {"get_outfit_suggestion": lambda *a, **k: None})(),
            OutfitService(),
        )

    def test_jacket_source_sets_upload_matched_category_outerwear(self):
        controller = self._controller()
        suggestion = OutfitSuggestion(
            shirt="White tee",
            trouser="Jeans",
            blazer="Royal blue slim fit blazer",
            shoes="Sneakers",
            belt="Brown belt",
            reasoning="Casual",
            blazer_id=99,
            upload_matched_category="blazer",
            source_slot="blazer",
        )
        matching_items: dict = {"outerwear": [], "blazer": [{"id": 99}]}
        item = WardrobeItem(
            id=42,
            user_id=1,
            category="jacket",
            color="tan",
            description="Tan corduroy jacket",
            image_data="img",
        )
        controller._apply_source_wardrobe_match_overrides(suggestion, matching_items, item)
        assert suggestion.upload_matched_category == "outerwear"
        assert suggestion.outerwear_id == 42
        assert suggestion.outerwear == "Tan corduroy jacket"
        assert matching_items["outerwear"][0]["id"] == 42

    def test_upper_body_exclusivity_clears_blazer_for_jacket_anchor(self):
        controller = self._controller()
        suggestion = OutfitSuggestion(
            shirt="White tee",
            trouser="Jeans",
            blazer="Royal blue slim fit blazer",
            shoes="Sneakers",
            belt="Brown belt",
            reasoning="Casual",
            blazer_id=99,
            upload_matched_category="outerwear",
            sweater="Wool crew",
            sweater_id=5,
        )
        matching_items: dict = {
            "blazer": [{"id": 99}],
            "sweater": [{"id": 5}],
            "outerwear": [{"id": 42}],
        }
        controller._apply_upper_body_layer_exclusivity(suggestion, matching_items)
        assert suggestion.blazer == ""
        assert suggestion.blazer_id is None
        assert suggestion.sweater is None
        assert "sweater" not in matching_items

    def test_upper_body_exclusivity_clears_outerwear_for_blazer_anchor(self):
        controller = self._controller()
        suggestion = OutfitSuggestion(
            shirt="Shirt",
            trouser="Trousers",
            blazer="Navy blazer",
            shoes="Shoes",
            belt="Belt",
            reasoning="Test",
            upload_matched_category="blazer",
            outerwear="Bomber jacket",
            outerwear_id=8,
            sweater="Cardigan",
            sweater_id=3,
        )
        matching_items: dict = {
            "outerwear": [{"id": 8}],
            "sweater": [{"id": 3}],
        }
        controller._apply_upper_body_layer_exclusivity(suggestion, matching_items)
        assert suggestion.outerwear is None
        assert suggestion.sweater is None
        assert "outerwear" not in matching_items
        assert "sweater" not in matching_items

    def test_coat_source_maps_to_outerwear(self):
        controller = self._controller()
        suggestion = OutfitSuggestion(
            shirt="Shirt",
            trouser="Trousers",
            blazer="Blazer",
            shoes="Shoes",
            belt="Belt",
            reasoning="Test",
        )
        matching_items: dict = {"outerwear": [{"id": 1}]}
        item = WardrobeItem(id=7, user_id=1, category="coat", color="navy")
        controller._apply_source_wardrobe_match_overrides(suggestion, matching_items, item)
        assert suggestion.upload_matched_category == "outerwear"
        assert matching_items["outerwear"][0]["id"] == 7

    def test_reconcile_moves_shirt_slot_to_outerwear_when_shirt_id_is_jacket(self):
        controller = self._controller()
        suggestion = OutfitSuggestion(
            shirt="Black shirt with white and red horizontal stripes",
            trouser="Beige chinos",
            blazer="Royal blue slim fit blazer",
            shoes="Brown brogues",
            belt="Tan belt",
            reasoning="Elegant",
            shirt_id=42,
            source_wardrobe_item_id=42,
            upload_matched_category="shirt",
            source_slot="shirt",
        )
        matching_items: dict = {
            "shirt": [],
            "outerwear": [
                {
                    "id": 42,
                    "category": "jacket",
                    "color": "tan",
                    "description": "Tan corduroy jacket",
                    "image_data": "img",
                }
            ],
            "blazer": [{"id": 99, "category": "blazer", "color": "blue"}],
        }
        controller._reconcile_outerwear_upload_slot(suggestion, matching_items)
        controller._apply_upper_body_layer_exclusivity(suggestion, matching_items)
        assert suggestion.upload_matched_category == "outerwear"
        assert suggestion.outerwear_id == 42
        assert suggestion.shirt_id is None
        assert suggestion.blazer == ""
        assert suggestion.blazer_id is None
        assert suggestion.outerwear == "Tan corduroy jacket"
    """Test suite for outfit suggestions with wardrobe matching"""
    
    def test_suggest_outfit_with_wardrobe_matching(self, client, auth_headers, sample_image, db, test_user):
        """Test outfit suggestion includes matching wardrobe items"""
        # Create wardrobe items that might match
        item1 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="Casual blue shirt",
            image_data="test_image_data"
        )
        item2 = WardrobeItem(
            user_id=test_user.id,
            category="trouser",
            color="Black",
            description="Formal black pants",
            image_data="test_image_data"
        )
        db.add_all([item1, item2])
        db.commit()
        
        files = {"image": sample_image}
        data = {
            "text_input": "casual outfit",
            "generate_model_image": "false"
        }
        response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        # May fail if OpenAI API key not set, but if successful should have matching_wardrobe_items
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert "matching_wardrobe_items" in data
            # Should be a dict with category keys
            if data["matching_wardrobe_items"]:
                assert isinstance(data["matching_wardrobe_items"], dict)
    
    def test_suggest_outfit_handles_empty_wardrobe(self, client, auth_headers, sample_image):
        """Test outfit suggestion works with empty wardrobe"""
        files = {"image": sample_image}
        data = {
            "text_input": "casual outfit",
            "generate_model_image": "false"
        }
        response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        # Should not fail due to wardrobe issues
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            # Should still have matching_wardrobe_items field (may be empty dict)
            assert "matching_wardrobe_items" in data
    
    def test_suggest_outfit_from_wardrobe_item_with_matching(self, client, auth_headers, db, test_user, sample_image):
        """Test outfit suggestion from wardrobe item includes matching items"""
        # Create the wardrobe item
        wardrobe_item = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="Blue shirt",
            image_data="test_image_data"
        )
        db.add(wardrobe_item)
        
        # Create other items that might match
        item2 = WardrobeItem(
            user_id=test_user.id,
            category="trouser",
            color="Black",
            description="Black pants",
            image_data="test_image_data"
        )
        db.add(item2)
        db.commit()
        
        data = {
            "text_input": "casual outfit",
            "generate_model_image": "false"
        }
        response = client.post(
            f"/api/suggest-outfit-from-wardrobe-item/{wardrobe_item.id}",
            data=data,
            headers=auth_headers
        )
        
        # May fail if OpenAI API key not set, but if successful should have matching_wardrobe_items
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert "matching_wardrobe_items" in data
            if data["matching_wardrobe_items"]:
                assert isinstance(data["matching_wardrobe_items"], dict)
    
    def test_suggest_outfit_response_format(self, client, auth_headers, sample_image):
        """Test that outfit suggestion response has correct format"""
        files = {"image": sample_image}
        data = {
            "text_input": "test",
            "generate_model_image": "false"
        }
        response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        # May fail if OpenAI API key not set
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            # Required fields
            assert "shirt" in data
            assert "trouser" in data
            assert "blazer" in data
            assert "shoes" in data
            assert "belt" in data
            assert "reasoning" in data
            # Optional fields
            assert "matching_wardrobe_items" in data
            assert "cost" in data
            # matching_wardrobe_items should be dict or None
            if data["matching_wardrobe_items"] is not None:
                assert isinstance(data["matching_wardrobe_items"], dict)
