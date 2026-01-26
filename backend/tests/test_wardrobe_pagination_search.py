"""
Test cases for Wardrobe pagination and search features
"""
import pytest
from fastapi import status
from models.wardrobe import WardrobeItem
import base64


class TestWardrobePagination:
    """Test suite for wardrobe pagination"""
    
    def test_get_wardrobe_default_limit(self, client, auth_headers, db, test_user):
        """Test that default limit is 10 items"""
        # Create 15 items
        for i in range(15):
            item = WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color=f"Color{i}",
                description=f"Item {i}",
                image_data="test_image_data"
            )
            db.add(item)
        db.commit()
        
        response = client.get("/api/wardrobe", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Should return paginated response
        assert "items" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert len(data["items"]) == 10  # Default limit
        assert data["limit"] == 10
        assert data["total"] == 15
    
    def test_get_wardrobe_with_custom_limit(self, client, auth_headers, db, test_user):
        """Test wardrobe with custom limit"""
        # Create 20 items
        for i in range(20):
            item = WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color=f"Color{i}",
                description=f"Item {i}",
                image_data="test_image_data"
            )
            db.add(item)
        db.commit()
        
        response = client.get("/api/wardrobe?limit=5", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 5
        assert data["limit"] == 5
        assert data["total"] == 20
    
    def test_get_wardrobe_with_offset(self, client, auth_headers, db, test_user):
        """Test wardrobe with offset"""
        # Create 10 items
        for i in range(10):
            item = WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color=f"Color{i}",
                description=f"Item {i}",
                image_data="test_image_data"
            )
            db.add(item)
        db.commit()
        
        # Get first 5
        response1 = client.get("/api/wardrobe?limit=5&offset=0", headers=auth_headers)
        assert response1.status_code == status.HTTP_200_OK
        data1 = response1.json()
        first_item_id = data1["items"][0]["id"]
        
        # Get next 5
        response2 = client.get("/api/wardrobe?limit=5&offset=5", headers=auth_headers)
        assert response2.status_code == status.HTTP_200_OK
        data2 = response2.json()
        
        # Should be different items
        assert data2["items"][0]["id"] != first_item_id
        assert len(data2["items"]) == 5
        assert data2["offset"] == 5
    
    def test_get_wardrobe_offset_beyond_total(self, client, auth_headers, db, test_user):
        """Test offset beyond total items returns empty list"""
        # Create 5 items
        for i in range(5):
            item = WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color=f"Color{i}",
                description=f"Item {i}",
                image_data="test_image_data"
            )
            db.add(item)
        db.commit()
        
        response = client.get("/api/wardrobe?limit=10&offset=100", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 0
        assert data["total"] == 5
    
    def test_get_wardrobe_limit_max(self, client, auth_headers, db, test_user):
        """Test that limit cannot exceed 100"""
        response = client.get("/api/wardrobe?limit=200", headers=auth_headers)
        # Should return 422 or clamp to 100
        assert response.status_code in [status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_200_OK]
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert data["limit"] <= 100
    
    def test_get_wardrobe_pagination_with_category(self, client, auth_headers, db, test_user):
        """Test pagination with category filter"""
        # Create items in different categories
        for i in range(5):
            item = WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color=f"Color{i}",
                description=f"Shirt {i}",
                image_data="test_image_data"
            )
            db.add(item)
        for i in range(3):
            item = WardrobeItem(
                user_id=test_user.id,
                category="trouser",
                color=f"Color{i}",
                description=f"Trouser {i}",
                image_data="test_image_data"
            )
            db.add(item)
        db.commit()
        
        response = client.get("/api/wardrobe?category=shirt&limit=3", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 3
        assert data["total"] == 5
        assert all(item["category"] == "shirt" for item in data["items"])


class TestWardrobeSearch:
    """Test suite for wardrobe search functionality"""
    
    def test_search_by_description(self, client, auth_headers, db, test_user):
        """Test searching by description"""
        # Create items with different descriptions
        item1 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="Casual blue shirt",
            image_data="test_image_data"
        )
        item2 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Red",
            description="Formal red shirt",
            image_data="test_image_data"
        )
        item3 = WardrobeItem(
            user_id=test_user.id,
            category="trouser",
            color="Black",
            description="Casual black pants",
            image_data="test_image_data"
        )
        db.add_all([item1, item2, item3])
        db.commit()
        
        response = client.get("/api/wardrobe?search=casual", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 2
        assert all("casual" in item["description"].lower() for item in data["items"])
    
    def test_search_by_color(self, client, auth_headers, db, test_user):
        """Test searching by color"""
        item1 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="Shirt 1",
            image_data="test_image_data"
        )
        item2 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Red",
            description="Shirt 2",
            image_data="test_image_data"
        )
        item3 = WardrobeItem(
            user_id=test_user.id,
            category="trouser",
            color="Blue",
            description="Pants",
            image_data="test_image_data"
        )
        db.add_all([item1, item2, item3])
        db.commit()
        
        response = client.get("/api/wardrobe?search=blue", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 2
        assert all(item["color"].lower() == "blue" for item in data["items"])
    
    def test_search_by_category_keyword(self, client, auth_headers, db, test_user):
        """Test searching by category keyword (shirt, trouser, etc.)"""
        item1 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="A shirt",
            image_data="test_image_data"
        )
        item2 = WardrobeItem(
            user_id=test_user.id,
            category="trouser",
            color="Black",
            description="Some pants",
            image_data="test_image_data"
        )
        db.add_all([item1, item2])
        db.commit()
        
        response = client.get("/api/wardrobe?search=shirt", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "shirt"
    
    def test_search_multi_word_and_logic(self, client, auth_headers, db, test_user):
        """Test multi-word search with AND logic"""
        # Red shirt - should match
        item1 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Red",
            description="A red shirt",
            image_data="test_image_data"
        )
        # Blue shirt - should NOT match (has shirt but not red)
        item2 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="A blue shirt",
            image_data="test_image_data"
        )
        # Red trouser - should NOT match (has red but not shirt)
        item3 = WardrobeItem(
            user_id=test_user.id,
            category="trouser",
            color="Red",
            description="Red pants",
            image_data="test_image_data"
        )
        db.add_all([item1, item2, item3])
        db.commit()
        
        response = client.get("/api/wardrobe?search=red shirt", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "shirt"
        assert data["items"][0]["color"].lower() == "red"
    
    def test_search_with_pagination(self, client, auth_headers, db, test_user):
        """Test search with pagination"""
        # Create 15 items matching search
        for i in range(15):
            item = WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color="Blue",
                description=f"Blue shirt {i}",
                image_data="test_image_data"
            )
            db.add(item)
        db.commit()
        
        response = client.get("/api/wardrobe?search=blue&limit=5", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 5
        assert data["total"] == 15
        assert data["limit"] == 5
    
    def test_search_with_category_filter(self, client, auth_headers, db, test_user):
        """Test search combined with category filter"""
        # Shirts
        item1 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="Blue shirt",
            image_data="test_image_data"
        )
        item2 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Red",
            description="Red shirt",
            image_data="test_image_data"
        )
        # Trousers
        item3 = WardrobeItem(
            user_id=test_user.id,
            category="trouser",
            color="Blue",
            description="Blue pants",
            image_data="test_image_data"
        )
        db.add_all([item1, item2, item3])
        db.commit()
        
        response = client.get("/api/wardrobe?category=shirt&search=blue", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "shirt"
        assert data["items"][0]["color"].lower() == "blue"
    
    def test_search_empty_results(self, client, auth_headers, db, test_user):
        """Test search that returns no results"""
        item = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="Blue shirt",
            image_data="test_image_data"
        )
        db.add(item)
        db.commit()
        
        response = client.get("/api/wardrobe?search=nonexistent", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 0
        assert len(data["items"]) == 0
    
    def test_search_case_insensitive(self, client, auth_headers, db, test_user):
        """Test that search is case insensitive"""
        item = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="Casual Blue Shirt",
            image_data="test_image_data"
        )
        db.add(item)
        db.commit()
        
        # Test uppercase
        response1 = client.get("/api/wardrobe?search=BLUE", headers=auth_headers)
        assert response1.status_code == status.HTTP_200_OK
        assert response1.json()["total"] == 1
        
        # Test mixed case
        response2 = client.get("/api/wardrobe?search=BlUe", headers=auth_headers)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.json()["total"] == 1


class TestWardrobeSummary:
    """Test suite for wardrobe summary with category counts"""
    
    def test_summary_category_counts(self, client, auth_headers, db, test_user):
        """Test that summary returns correct category counts"""
        # Create items in different categories
        for i in range(5):
            item = WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color="Blue",
                description=f"Shirt {i}",
                image_data="test_image_data"
            )
            db.add(item)
        for i in range(3):
            item = WardrobeItem(
                user_id=test_user.id,
                category="trouser",
                color="Black",
                description=f"Trouser {i}",
                image_data="test_image_data"
            )
            db.add(item)
        for i in range(2):
            item = WardrobeItem(
                user_id=test_user.id,
                category="shoes",
                color="Brown",
                description=f"Shoes {i}",
                image_data="test_image_data"
            )
            db.add(item)
        db.commit()
        
        response = client.get("/api/wardrobe/summary", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total_items"] == 10
        assert data["by_category"]["shirt"] == 5
        assert data["by_category"]["trouser"] == 3
        assert data["by_category"]["shoes"] == 2
        assert "shirt" in data["categories"]
        assert "trouser" in data["categories"]
        assert "shoes" in data["categories"]
    
    def test_summary_by_color(self, client, auth_headers, db, test_user):
        """Test that summary includes color counts"""
        item1 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="Shirt 1",
            image_data="test_image_data"
        )
        item2 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="Blue",
            description="Shirt 2",
            image_data="test_image_data"
        )
        item3 = WardrobeItem(
            user_id=test_user.id,
            category="trouser",
            color="Black",
            description="Trouser",
            image_data="test_image_data"
        )
        db.add_all([item1, item2, item3])
        db.commit()
        
        response = client.get("/api/wardrobe/summary", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "by_color" in data
        assert data["by_color"]["Blue"] == 2
        assert data["by_color"]["Black"] == 1
    
    def test_summary_empty_wardrobe(self, client, auth_headers):
        """Test summary with empty wardrobe"""
        response = client.get("/api/wardrobe/summary", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total_items"] == 0
        assert data["by_category"] == {}
        assert data["by_color"] == {}
        assert data["categories"] == []
    
    def test_summary_category_normalization(self, client, auth_headers, db, test_user):
        """Test that categories are normalized to lowercase in summary"""
        # Create items with mixed case categories (if supported)
        item1 = WardrobeItem(
            user_id=test_user.id,
            category="Shirt",  # Uppercase
            color="Blue",
            description="Shirt",
            image_data="test_image_data"
        )
        item2 = WardrobeItem(
            user_id=test_user.id,
            category="shirt",  # Lowercase
            color="Red",
            description="Shirt",
            image_data="test_image_data"
        )
        db.add_all([item1, item2])
        db.commit()
        
        response = client.get("/api/wardrobe/summary", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Should normalize to lowercase
        assert "shirt" in data["by_category"]
        # Both items should be counted together
        assert data["by_category"]["shirt"] == 2
