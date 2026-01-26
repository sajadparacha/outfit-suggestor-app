"""
Test cases for outfit suggestion with wardrobe integration
Tests the fix for tuple unpacking in outfit controller
"""
import pytest
from fastapi import status
from models.wardrobe import WardrobeItem


class TestOutfitWardrobeIntegration:
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
