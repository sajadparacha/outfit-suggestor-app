"""
Test cases for Outfit API endpoints
"""
import pytest
from fastapi import status
import base64
from io import BytesIO
from PIL import Image


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
