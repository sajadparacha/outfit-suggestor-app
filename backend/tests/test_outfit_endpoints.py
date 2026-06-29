"""
Test cases for Outfit API endpoints
"""
import pytest
from fastapi import status
import base64
from io import BytesIO
from PIL import Image

from models.wardrobe import WardrobeItem


def _create_wardrobe_item(db, user_id, category, color, description):
    item = WardrobeItem(
        user_id=user_id,
        category=category,
        color=color,
        description=description,
        image_data=base64.b64encode(f"{category}-{color}".encode("utf-8")).decode("utf-8"),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


class TestOutfitEndpoints:
    """Test suite for /api/suggest-outfit and related endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        assert "status" in data
    
    def test_suggest_outfit_unauthorized(self, client, sample_image):
        """Test outfit suggestion without authentication (should work for anonymous)"""
        files = {"image": sample_image}
        data = {
            "text_input": "casual outfit",
            "generate_model_image": "false"
        }
        # Note: This may fail if OpenAI API key is not set, but should not be 401
        response = client.post("/api/suggest-outfit", files=files, data=data)
        # Should not be unauthorized (anonymous allowed)
        assert response.status_code != status.HTTP_401_UNAUTHORIZED
    
    def test_suggest_outfit_authenticated(self, client, auth_headers, sample_image):
        """Test outfit suggestion with authentication"""
        files = {"image": sample_image}
        data = {
            "text_input": "business casual",
            "generate_model_image": "false"
        }
        response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        # May fail if OpenAI API key not set, but should not be auth error
        assert response.status_code != status.HTTP_401_UNAUTHORIZED

    def test_suggest_outfit_echoes_source_wardrobe_item_id(self, client, auth_headers, sample_image):
        """Client can send source_wardrobe_item_id; response echoes it for UI correlation."""
        files = {"image": sample_image}
        data = {
            "text_input": "casual",
            "generate_model_image": "false",
            "source_wardrobe_item_id": "42",
        }
        response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body.get("source_wardrobe_item_id") == 42
    
    def test_suggest_outfit_missing_image(self, client, auth_headers):
        """Test outfit suggestion without image"""
        data = {"text_input": "test"}
        response = client.post(
            "/api/suggest-outfit",
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_suggest_outfit_oversized_image_rejected(self, client, auth_headers, oversized_image):
        """Test outfit suggestion with oversized image returns 400"""
        files = {"image": oversized_image}
        data = {"text_input": "casual", "generate_model_image": "false"}
        response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data_res = response.json()
        assert "detail" in data_res
        assert "too large" in data_res["detail"].lower()
    
    def test_check_duplicate_no_auth(self, client, sample_image):
        """Test duplicate check without authentication (should work for anonymous)"""
        files = {"image": sample_image}
        response = client.post("/api/check-duplicate", files=files)
        # Should return is_duplicate: false for anonymous users
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "is_duplicate" in data
    
    def test_check_duplicate_authenticated(self, client, auth_headers, sample_image):
        """Test duplicate check with authentication"""
        files = {"image": sample_image}
        response = client.post(
            "/api/check-duplicate",
            files=files,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "is_duplicate" in data
        assert isinstance(data["is_duplicate"], bool)
    
    def test_check_duplicate_missing_image(self, client, auth_headers):
        """Test duplicate check without image"""
        response = client.post("/api/check-duplicate", headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_get_outfit_history_unauthorized(self, client):
        """Test getting outfit history without authentication"""
        response = client.get("/api/outfit-history")
        # Should return empty list for anonymous users
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_outfit_history_authenticated(self, client, auth_headers, outfit_history_entry):
        """Test getting outfit history with authentication"""
        response = client.get("/api/outfit-history", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        first = data[0]
        assert "shirt_id" in first
        assert "trouser_id" in first
        assert "blazer_id" in first
        assert "shoes_id" in first
        assert "belt_id" in first
        assert "source_wardrobe_item_id" in first
        assert "matching_wardrobe_items" in first
    
    def test_get_outfit_history_with_limit(self, client, auth_headers):
        """Test getting outfit history with limit parameter"""
        response = client.get(
            "/api/outfit-history?limit=5",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_delete_outfit_history_unauthorized(self, client):
        """Test deleting outfit history without authentication"""
        response = client.delete("/api/outfit-history/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_outfit_history_authenticated(self, client, auth_headers, outfit_history_entry):
        """Test deleting outfit history entry"""
        entry_id = outfit_history_entry.id
        response = client.delete(
            f"/api/outfit-history/{entry_id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.json()
    
    def test_delete_outfit_history_nonexistent(self, client, auth_headers):
        """Test deleting non-existent outfit history entry"""
        response = client.delete(
            "/api/outfit-history/99999",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_suggest_outfit_from_wardrobe_item_unauthorized(self, client, wardrobe_item):
        """Test suggesting outfit from wardrobe item without authentication"""
        response = client.post(
            f"/api/suggest-outfit-from-wardrobe-item/{wardrobe_item.id}",
            data={"generate_model_image": "false"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_suggest_outfit_from_wardrobe_item_authenticated(self, client, auth_headers, wardrobe_item):
        """Test suggesting outfit from wardrobe item with authentication"""
        data = {
            "text_input": "casual outfit",
            "generate_model_image": "false"
        }
        response = client.post(
            f"/api/suggest-outfit-from-wardrobe-item/{wardrobe_item.id}",
            data=data,
            headers=auth_headers
        )
        # May fail if OpenAI API key not set, but should not be auth error
        assert response.status_code != status.HTTP_401_UNAUTHORIZED
    
    def test_suggest_outfit_from_wardrobe_item_nonexistent(self, client, auth_headers):
        """Test suggesting outfit from non-existent wardrobe item"""
        data = {"generate_model_image": "false"}
        response = client.post(
            "/api/suggest-outfit-from-wardrobe-item/99999",
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_suggest_outfit_with_model_image(self, client, auth_headers, sample_image):
        """Test outfit suggestion with model image generation"""
        files = {"image": sample_image}
        data = {
            "text_input": "formal outfit",
            "generate_model_image": "true",
            "image_model": "dalle3"
        }
        response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        # May fail if OpenAI API key not set, but should not be validation error
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_suggest_outfit_from_wardrobe_only_unauthorized(self, client):
        """Wardrobe-only suggestion should require authentication"""
        payload = {
            "occasion": "casual",
            "season": "all",
            "style": "modern",
            "text_input": "test wardrobe-only suggestion"
        }
        response = client.post("/api/suggest-outfit-from-wardrobe", json=payload)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_suggest_outfit_from_selected_wardrobe_items_unauthorized(self, client):
        """Selected wardrobe item completion should require authentication."""
        payload = {
            "occasion": "work",
            "season": "all-season",
            "style": "smart-casual",
            "selected_wardrobe_item_ids": [1, 2],
        }
        response = client.post("/api/suggest-outfit-from-wardrobe", json=payload)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_suggest_outfit_from_wardrobe_only_authenticated(self, client, auth_headers, wardrobe_item):
        """
        Wardrobe-only suggestion with authentication.
        May fail due to OpenAI issues, but must not be a 401/403 auth failure.
        """
        payload = {
            "occasion": "casual",
            "season": "all",
            "style": "modern",
            "text_input": "Prefer something comfortable and modern"
        }
        response = client.post(
            "/api/suggest-outfit-from-wardrobe",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code != status.HTTP_401_UNAUTHORIZED
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_suggest_outfit_from_wardrobe_only_no_items(self, client, auth_headers):
        """
        Wardrobe-only suggestion when user has an empty wardrobe.
        May return 500 due to AI issues, but must not be 401/403 and must not crash validation.
        """
        payload = {
            "occasion": "casual",
            "season": "all",
            "style": "modern",
            "text_input": "Trying wardrobe-only with no items"
        }
        response = client.post(
            "/api/suggest-outfit-from-wardrobe",
            json=payload,
            headers=auth_headers
        )
        # Auth must still succeed
        assert response.status_code != status.HTTP_401_UNAUTHORIZED
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_suggest_outfit_from_selected_wardrobe_items_pins_selected_slots(
        self,
        client,
        auth_headers,
        db,
        test_user,
        wardrobe_item,
    ):
        """Two selected wardrobe items are locked into the completed outfit response."""
        trouser = _create_wardrobe_item(
            db,
            test_user.id,
            "trouser",
            "Black",
            "Tailored black wool trousers",
        )
        payload = {
            "occasion": "work",
            "season": "all-season",
            "style": "smart-casual",
            "text_input": "Keep my selected pieces",
            "selected_wardrobe_item_ids": [wardrobe_item.id, trouser.id],
        }

        response = client.post(
            "/api/suggest-outfit-from-wardrobe",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["shirt_id"] == wardrobe_item.id
        assert body["trouser_id"] == trouser.id
        assert body["source_wardrobe_item_id"] == wardrobe_item.id
        assert body["matching_wardrobe_items"]["shirt"][0]["id"] == wardrobe_item.id
        assert body["matching_wardrobe_items"]["trouser"][0]["id"] == trouser.id
        assert "REQUIRED SELECTED WARDROBE ITEMS" in body["ai_prompt"]

    def test_suggest_outfit_from_selected_wardrobe_items_accepts_shirt_and_trouser_aliases(
        self,
        client,
        auth_headers,
        db,
        test_user,
    ):
        """Polo/T-shirt-like items map to shirt; jeans/pants-like items map to trouser."""
        polo = _create_wardrobe_item(
            db,
            test_user.id,
            "polo",
            "Navy",
            "Navy knit polo shirt",
        )
        jeans = _create_wardrobe_item(
            db,
            test_user.id,
            "jeans",
            "Black",
            "Black straight-leg jeans",
        )
        payload = {
            "occasion": "work",
            "season": "all-season",
            "style": "smart-casual",
            "selected_wardrobe_item_ids": [polo.id, jeans.id],
        }

        response = client.post(
            "/api/suggest-outfit-from-wardrobe",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["shirt_id"] == polo.id
        assert body["trouser_id"] == jeans.id
        assert body["matching_wardrobe_items"]["shirt"][0]["id"] == polo.id
        assert body["matching_wardrobe_items"]["trouser"][0]["id"] == jeans.id

    def test_suggest_outfit_from_selected_wardrobe_items_allows_one_item(
        self,
        client,
        auth_headers,
        wardrobe_item,
    ):
        payload = {
            "occasion": "work",
            "season": "all-season",
            "style": "smart-casual",
            "selected_wardrobe_item_ids": [wardrobe_item.id],
        }

        response = client.post(
            "/api/suggest-outfit-from-wardrobe",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["shirt_id"] == wardrobe_item.id
        assert body["source_wardrobe_item_id"] == wardrobe_item.id
        assert body["matching_wardrobe_items"]["shirt"][0]["id"] == wardrobe_item.id

    def test_suggest_outfit_from_selected_wardrobe_items_rejects_other_user_item(
        self,
        client,
        auth_headers,
        db,
        test_user,
        test_user2,
        wardrobe_item,
    ):
        other_user_trouser = _create_wardrobe_item(
            db,
            test_user2.id,
            "trouser",
            "Charcoal",
            "Other user's trousers",
        )
        payload = {
            "occasion": "work",
            "season": "all-season",
            "style": "smart-casual",
            "selected_wardrobe_item_ids": [wardrobe_item.id, other_user_trouser.id],
        }

        response = client.post(
            "/api/suggest-outfit-from-wardrobe",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_suggest_outfit_from_selected_wardrobe_items_rejects_duplicate_slot(
        self,
        client,
        auth_headers,
        db,
        test_user,
        wardrobe_item,
    ):
        second_shirt = _create_wardrobe_item(
            db,
            test_user.id,
            "shirt",
            "White",
            "White oxford shirt",
        )
        payload = {
            "occasion": "work",
            "season": "all-season",
            "style": "smart-casual",
            "selected_wardrobe_item_ids": [wardrobe_item.id, second_shirt.id],
        }

        response = client.post(
            "/api/suggest-outfit-from-wardrobe",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "one item per outfit slot" in response.json()["detail"]

    def test_suggest_outfit_from_selected_wardrobe_items_rejects_unsupported_category(
        self,
        client,
        auth_headers,
        db,
        test_user,
        wardrobe_item,
    ):
        tie = _create_wardrobe_item(
            db,
            test_user.id,
            "tie",
            "Navy",
            "Navy silk tie",
        )
        payload = {
            "occasion": "work",
            "season": "all-season",
            "style": "smart-casual",
            "selected_wardrobe_item_ids": [wardrobe_item.id, tie.id],
        }

        response = client.post(
            "/api/suggest-outfit-from-wardrobe",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "shirt, trouser, blazer, shoes, or belt" in response.json()["detail"]

    def test_suggest_outfit_from_wardrobe_only_accepts_previous_outfit_text(
        self, client, auth_headers, wardrobe_item
    ):
        """Wardrobe-only endpoint accepts variety fields for session dedupe."""
        payload = {
            "occasion": "casual",
            "season": "all",
            "style": "modern",
            "text_input": "Comfortable look",
            "previous_outfit_text": "Shirt: white\nTrousers: navy",
            "avoid_outfit_texts": ["Shirt: blue\nTrousers: grey"],
        }
        response = client.post(
            "/api/suggest-outfit-from-wardrobe",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code != status.HTTP_401_UNAUTHORIZED
        assert response.status_code != status.HTTP_403_FORBIDDEN
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            prompt = data.get("ai_prompt") or ""
            assert "PREV:Shirt: white" in prompt or "white" in prompt.lower()


class TestOutfitSuggestionOptionalLayers:
    """Schema tests for optional sweater/outerwear/tie fields."""

    def test_outfit_suggestion_model_serializes_optional_layers(self):
        from models.outfit import OutfitSuggestion

        suggestion = OutfitSuggestion(
            shirt="White shirt",
            trouser="Navy chinos",
            blazer="Grey blazer",
            shoes="Brown shoes",
            belt="Brown belt",
            reasoning="Layered look.",
            sweater="Navy merino",
            outerwear="Olive jacket",
            tie=None,
            sweater_id=10,
            outerwear_id=11,
            tie_id=None,
        )
        data = suggestion.model_dump()
        assert data["sweater"] == "Navy merino"
        assert data["outerwear"] == "Olive jacket"
        assert data["tie"] is None
        assert data["sweater_id"] == 10
        assert data["outerwear_id"] == 11
        assert data["tie_id"] is None
