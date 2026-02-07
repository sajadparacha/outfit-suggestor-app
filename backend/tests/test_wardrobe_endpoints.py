"""
Test cases for Wardrobe API endpoints
"""
import pytest
from fastapi import status
from tests.test_helpers import setup_auth_override, clear_auth_override


class TestWardrobeEndpoints:
    """Test suite for /api/wardrobe/* endpoints"""
    
    def test_add_wardrobe_item_unauthorized(self, client, sample_image):
        """Test adding wardrobe item without authentication"""
        files = {"image": sample_image} if sample_image else {}
        data = {
            "category": "shirt",
            "color": "Blue",
            "description": "Test shirt"
        }
        response = client.post("/api/wardrobe", files=files, data=data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_add_wardrobe_item_success(self, client, auth_headers, sample_image):
        """Test successfully adding a wardrobe item"""
        files = {"image": sample_image} if sample_image else {}
        data = {
            "category": "shirt",
            "color": "Blue",
            "description": "Test shirt description"
        }
        response = client.post(
            "/api/wardrobe",
            files=files,
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert data["category"] == "shirt"
        assert data["color"] == "Blue"
        assert data["description"] == "Test shirt description"
    
    def test_add_wardrobe_item_missing_fields(self, client, auth_headers):
        """Test adding wardrobe item with missing required fields"""
        data = {
            "category": "shirt"
            # Missing color and description
        }
        response = client.post(
            "/api/wardrobe",
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_add_wardrobe_item_oversized_image_rejected(self, client, auth_headers, oversized_image):
        """Test adding wardrobe item with oversized image returns 400"""
        files = {"image": oversized_image}
        data = {"category": "shirt", "color": "Blue", "description": "Test"}
        response = client.post(
            "/api/wardrobe",
            files=files,
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data_res = response.json()
        assert "detail" in data_res
        assert "too large" in data_res["detail"].lower()
    
    def test_get_wardrobe_unauthorized(self, client):
        """Test getting wardrobe without authentication"""
        response = client.get("/api/wardrobe")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_wardrobe_success(self, client, auth_headers, wardrobe_item):
        """Test getting wardrobe items with paginated response"""
        response = client.get("/api/wardrobe", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should return paginated response format
        assert "items" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) > 0
        assert any(item["id"] == wardrobe_item.id for item in data["items"])
        assert data["total"] > 0
    
    def test_get_wardrobe_with_category_filter(self, client, auth_headers, wardrobe_item):
        """Test getting wardrobe items filtered by category"""
        response = client.get(
            "/api/wardrobe?category=shirt",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should return paginated response format
        assert "items" in data
        assert isinstance(data["items"], list)
        assert all(item["category"] == "shirt" for item in data["items"])
    
    def test_get_wardrobe_item_unauthorized(self, client, wardrobe_item):
        """Test getting specific wardrobe item without authentication"""
        response = client.get(f"/api/wardrobe/{wardrobe_item.id}")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_wardrobe_item_success(self, client, auth_headers, wardrobe_item):
        """Test getting specific wardrobe item"""
        response = client.get(
            f"/api/wardrobe/{wardrobe_item.id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == wardrobe_item.id
        assert data["category"] == wardrobe_item.category
    
    def test_get_wardrobe_item_nonexistent(self, client, auth_headers):
        """Test getting non-existent wardrobe item"""
        response = client.get(
            "/api/wardrobe/99999",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_wardrobe_item_other_user(self, client, auth_headers, test_user2, db, sample_image):
        """Test getting wardrobe item belonging to another user"""
        from models.wardrobe import WardrobeItem
        import base64
        
        # Create item for another user
        sample_image[1].seek(0)
        image_data = sample_image[1].read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        other_item = WardrobeItem(
            user_id=test_user2.id,
            category="pants",
            color="Black",
            description="Other user's item",
            image_data=image_base64
        )
        db.add(other_item)
        db.commit()
        db.refresh(other_item)
        
        # Try to access it with first user's token
        response = client.get(
            f"/api/wardrobe/{other_item.id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_wardrobe_item_unauthorized(self, client, wardrobe_item):
        """Test updating wardrobe item without authentication"""
        data = {"color": "Red"}
        response = client.put(
            f"/api/wardrobe/{wardrobe_item.id}",
            data=data
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_wardrobe_item_success(self, client, auth_headers, wardrobe_item):
        """Test successfully updating a wardrobe item"""
        data = {
            "color": "Navy Blue",
            "description": "Updated description"
        }
        response = client.put(
            f"/api/wardrobe/{wardrobe_item.id}",
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        updated_data = response.json()
        assert updated_data["color"] == "Navy Blue"
        assert updated_data["description"] == "Updated description"
    
    def test_update_wardrobe_item_nonexistent(self, client, auth_headers):
        """Test updating non-existent wardrobe item"""
        data = {"color": "Red"}
        response = client.put(
            "/api/wardrobe/99999",
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_wardrobe_item_unauthorized(self, client, wardrobe_item):
        """Test deleting wardrobe item without authentication"""
        response = client.delete(f"/api/wardrobe/{wardrobe_item.id}")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_wardrobe_item_success(self, client, auth_headers, wardrobe_item):
        """Test successfully deleting a wardrobe item"""
        item_id = wardrobe_item.id
        response = client.delete(
            f"/api/wardrobe/{item_id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.json()
        
        # Verify item is deleted
        get_response = client.get(
            f"/api/wardrobe/{item_id}",
            headers=auth_headers
        )
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_wardrobe_item_nonexistent(self, client, auth_headers):
        """Test deleting non-existent wardrobe item"""
        response = client.delete(
            "/api/wardrobe/99999",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_wardrobe_summary_unauthorized(self, client):
        """Test getting wardrobe summary without authentication"""
        response = client.get("/api/wardrobe/summary")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_wardrobe_summary_success(self, client, auth_headers, wardrobe_item):
        """Test getting wardrobe summary"""
        response = client.get("/api/wardrobe/summary", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_items" in data
        assert "by_category" in data
        assert isinstance(data["total_items"], int)
        assert data["total_items"] > 0
    
    def test_check_wardrobe_duplicate_unauthorized(self, client, sample_image):
        """Test checking wardrobe duplicate without authentication"""
        files = {"image": sample_image}
        response = client.post("/api/wardrobe/check-duplicate", files=files)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_check_wardrobe_duplicate_success(self, client, auth_headers, sample_image):
        """Test checking wardrobe duplicate"""
        files = {"image": sample_image}
        response = client.post(
            "/api/wardrobe/check-duplicate",
            files=files,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "is_duplicate" in data
        assert isinstance(data["is_duplicate"], bool)
    
    def test_check_wardrobe_duplicate_with_existing(self, client, auth_headers, wardrobe_item, sample_image):
        """Test checking duplicate with existing wardrobe item"""
        # Use the same image as the wardrobe item
        files = {"image": sample_image}
        response = client.post(
            "/api/wardrobe/check-duplicate",
            files=files,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "is_duplicate" in data
    
    def test_analyze_wardrobe_image_unauthorized(self, client, sample_image):
        """Test analyzing wardrobe image without authentication"""
        files = {"image": sample_image}
        data = {"model_type": "blip"}
        response = client.post("/api/wardrobe/analyze-image", files=files, data=data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_analyze_wardrobe_image_success(self, client, auth_headers, sample_image):
        """Test analyzing wardrobe image"""
        files = {"image": sample_image}
        data = {"model_type": "blip"}
        response = client.post(
            "/api/wardrobe/analyze-image",
            files=files,
            data=data,
            headers=auth_headers
        )
        # May fail if AI service not configured, but should not be auth error
        assert response.status_code != status.HTTP_401_UNAUTHORIZED
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert "category" in data or "error" in data
            assert "color" in data or "error" in data
            assert "description" in data or "error" in data
    
    def test_analyze_wardrobe_image_missing_image(self, client, auth_headers):
        """Test analyzing wardrobe image without image file"""
        data = {"model_type": "blip"}
        response = client.post(
            "/api/wardrobe/analyze-image",
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
