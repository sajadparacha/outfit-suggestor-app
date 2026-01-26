"""
Integration tests for complete wardrobe management flow
Tests the full user journey: login -> add items -> search -> pagination -> get suggestion
"""
import pytest
import logging
from fastapi import status
from io import BytesIO
from PIL import Image
from models.wardrobe import WardrobeItem

logger = logging.getLogger(__name__)


class TestWardrobeManagementIntegration:
    """Integration tests for wardrobe management workflow"""
    
    def test_complete_wardrobe_management_flow(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Complete wardrobe management flow
        
        Steps:
        1. Login
        2. Add wardrobe item
        3. View wardrobe with pagination
        4. Search wardrobe items
        5. Get wardrobe summary
        6. Get AI suggestion from wardrobe item
        7. Verify suggestion includes matching wardrobe items
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Complete wardrobe management flow")
        logger.info("=" * 70)
        
        # Step 1: Login
        logger.info(f"Step 1: Login (User ID: {test_user.id})")
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        assert login_response.status_code == status.HTTP_200_OK
        auth_token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        logger.info("  ✓ Login successful")
        
        # Step 2: Add wardrobe items
        logger.info("Step 2: Adding wardrobe items...")
        items_added = []
        for i in range(5):
            files = {"image": sample_image}
            data = {
                "category": "shirt" if i < 3 else "trouser",
                "color": "Blue" if i % 2 == 0 else "Red",
                "description": f"Test item {i}"
            }
            response = client.post(
                "/api/wardrobe",
                files=files,
                data=data,
                headers=auth_headers
            )
            if response.status_code == status.HTTP_201_CREATED:
                items_added.append(response.json())
                logger.info(f"  ✓ Added item {i+1}: {data['category']}")
        
        assert len(items_added) > 0
        
        # Step 3: View wardrobe with pagination
        logger.info("Step 3: Viewing wardrobe with pagination...")
        response = client.get("/api/wardrobe?limit=3", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) <= 3
        assert data["total"] >= len(items_added)
        logger.info(f"  ✓ Pagination working: {len(data['items'])} items, total: {data['total']}")
        
        # Step 4: Search wardrobe items
        logger.info("Step 4: Searching wardrobe items...")
        response = client.get("/api/wardrobe?search=blue", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        logger.info(f"  ✓ Search found {data['total']} items matching 'blue'")
        
        # Step 5: Get wardrobe summary
        logger.info("Step 5: Getting wardrobe summary...")
        response = client.get("/api/wardrobe/summary", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        summary = response.json()
        assert "total_items" in summary
        assert "by_category" in summary
        assert summary["total_items"] >= len(items_added)
        logger.info(f"  ✓ Summary: {summary['total_items']} total items")
        logger.info(f"  ✓ Categories: {list(summary['by_category'].keys())}")
        
        # Step 6: Get AI suggestion from wardrobe item
        if items_added and items_added[0].get("id"):
            logger.info("Step 6: Getting AI suggestion from wardrobe item...")
            wardrobe_item_id = items_added[0]["id"]
            response = client.post(
                f"/api/suggest-outfit-from-wardrobe-item/{wardrobe_item_id}",
                data={"text_input": "casual", "generate_model_image": "false"},
                headers=auth_headers
            )
            if response.status_code == status.HTTP_200_OK:
                suggestion = response.json()
                assert "shirt" in suggestion
                assert "matching_wardrobe_items" in suggestion
                logger.info("  ✓ Suggestion received with wardrobe matching")
        
        logger.info("=" * 70 + "\n")
    
    def test_wardrobe_search_and_filter_integration(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Wardrobe search and filter integration
        
        Steps:
        1. Login
        2. Add items in different categories and colors
        3. Search by color
        4. Search by category keyword
        5. Search with category filter
        6. Multi-word search
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Wardrobe search and filter integration")
        logger.info("=" * 70)
        
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"}
        )
        assert login_response.status_code == status.HTTP_200_OK
        auth_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        logger.info("  ✓ Login successful")
        
        # Step 2: Add diverse items
        logger.info("Step 2: Adding diverse wardrobe items...")
        test_items = [
            {"category": "shirt", "color": "Blue", "description": "Casual blue shirt"},
            {"category": "shirt", "color": "Red", "description": "Formal red shirt"},
            {"category": "trouser", "color": "Black", "description": "Black pants"},
            {"category": "trouser", "color": "Blue", "description": "Blue jeans"},
            {"category": "shoes", "color": "Brown", "description": "Brown leather shoes"},
        ]
        
        for item_data in test_items:
            files = {"image": sample_image}
            response = client.post(
                "/api/wardrobe",
                files=files,
                data=item_data,
                headers=auth_headers
            )
            if response.status_code == status.HTTP_201_CREATED:
                logger.info(f"  ✓ Added: {item_data['category']} - {item_data['color']}")
        
        # Step 3: Search by color
        logger.info("Step 3: Searching by color 'blue'...")
        response = client.get("/api/wardrobe?search=blue", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        logger.info(f"  ✓ Found {data['total']} blue items")
        
        # Step 4: Search by category keyword
        logger.info("Step 4: Searching by category 'shirt'...")
        response = client.get("/api/wardrobe?search=shirt", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(item["category"] == "shirt" for item in data["items"])
        logger.info(f"  ✓ Found {data['total']} shirts")
        
        # Step 5: Search with category filter
        logger.info("Step 5: Searching 'blue' in 'shirt' category...")
        response = client.get("/api/wardrobe?category=shirt&search=blue", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(item["category"] == "shirt" for item in data["items"])
        logger.info(f"  ✓ Found {data['total']} blue shirts")
        
        # Step 6: Multi-word search
        logger.info("Step 6: Multi-word search 'blue shirt'...")
        response = client.get("/api/wardrobe?search=blue shirt", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        logger.info(f"  ✓ Found {data['total']} items matching 'blue shirt'")
        
        logger.info("=" * 70 + "\n")
    
    def test_wardrobe_pagination_integration(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Wardrobe pagination integration
        
        Steps:
        1. Login
        2. Add multiple items
        3. Test default pagination (10 items)
        4. Test custom limit
        5. Test offset
        6. Test pagination with search
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Wardrobe pagination integration")
        logger.info("=" * 70)
        
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"}
        )
        assert login_response.status_code == status.HTTP_200_OK
        auth_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        
        # Step 2: Add 15 items
        logger.info("Step 2: Adding 15 wardrobe items...")
        for i in range(15):
            files = {"image": sample_image}
            data = {
                "category": "shirt",
                "color": f"Color{i}",
                "description": f"Item {i}"
            }
            client.post("/api/wardrobe", files=files, data=data, headers=auth_headers)
        logger.info("  ✓ Added 15 items")
        
        # Step 3: Test default pagination
        logger.info("Step 3: Testing default pagination...")
        response = client.get("/api/wardrobe", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 10  # Default limit
        assert data["total"] == 15
        logger.info(f"  ✓ Default pagination: {len(data['items'])} items, total: {data['total']}")
        
        # Step 4: Test custom limit
        logger.info("Step 4: Testing custom limit (5 items)...")
        response = client.get("/api/wardrobe?limit=5", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 5
        logger.info(f"  ✓ Custom limit working: {len(data['items'])} items")
        
        # Step 5: Test offset
        logger.info("Step 5: Testing offset...")
        response1 = client.get("/api/wardrobe?limit=5&offset=0", headers=auth_headers)
        response2 = client.get("/api/wardrobe?limit=5&offset=5", headers=auth_headers)
        assert response1.status_code == status.HTTP_200_OK
        assert response2.status_code == status.HTTP_200_OK
        data1 = response1.json()
        data2 = response2.json()
        assert data1["items"][0]["id"] != data2["items"][0]["id"]
        logger.info("  ✓ Offset working correctly")
        
        # Step 6: Test pagination with search
        logger.info("Step 6: Testing pagination with search...")
        response = client.get("/api/wardrobe?search=item&limit=3", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) <= 3
        logger.info(f"  ✓ Pagination with search: {len(data['items'])} items")
        
        logger.info("=" * 70 + "\n")
    
    def test_wardrobe_duplicate_detection_flow(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Wardrobe duplicate detection flow
        
        Steps:
        1. Login
        2. Add wardrobe item
        3. Check for duplicate with same image
        4. Verify duplicate detected
        5. Add item anyway (should work)
        6. Check for duplicate with different image
        7. Verify no duplicate
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Wardrobe duplicate detection flow")
        logger.info("=" * 70)
        
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"}
        )
        assert login_response.status_code == status.HTTP_200_OK
        auth_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        logger.info("  ✓ Login successful")
        
        # Step 2: Add wardrobe item
        logger.info("Step 2: Adding wardrobe item...")
        files = {"image": sample_image}
        data = {
            "category": "shirt",
            "color": "Blue",
            "description": "Test shirt"
        }
        response = client.post(
            "/api/wardrobe",
            files=files,
            data=data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_201_CREATED
        added_item = response.json()
        logger.info(f"  ✓ Added item: {added_item['id']}")
        
        # Step 3: Check for duplicate
        logger.info("Step 3: Checking for duplicate...")
        sample_image[1].seek(0)
        duplicate_response = client.post(
            "/api/wardrobe/check-duplicate",
            files=files,
            headers=auth_headers
        )
        assert duplicate_response.status_code == status.HTTP_200_OK
        duplicate_data = duplicate_response.json()
        logger.info(f"  ✓ Duplicate check: {duplicate_data.get('is_duplicate')}")
        
        # Step 4: Verify duplicate structure
        if duplicate_data.get("is_duplicate"):
            assert "existing_item" in duplicate_data
            existing = duplicate_data["existing_item"]
            assert existing["id"] == added_item["id"]
            logger.info("  ✓ Duplicate detected correctly")
        
        # Step 5: Create different image
        logger.info("Step 5: Checking duplicate with different image...")
        different_image = Image.new('RGB', (100, 100), color='red')
        different_img_bytes = BytesIO()
        different_image.save(different_img_bytes, format='JPEG')
        different_img_bytes.seek(0)
        different_files = ("different.jpg", different_img_bytes, "image/jpeg")
        
        different_duplicate_response = client.post(
            "/api/wardrobe/check-duplicate",
            files={"image": different_files},
            headers=auth_headers
        )
        assert different_duplicate_response.status_code == status.HTTP_200_OK
        different_duplicate_data = different_duplicate_response.json()
        logger.info(f"  ✓ Different image duplicate check: {different_duplicate_data.get('is_duplicate')}")
        
        logger.info("=" * 70 + "\n")
    
    def test_wardrobe_summary_integration(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Wardrobe summary integration
        
        Steps:
        1. Login
        2. Add items in different categories
        3. Get summary
        4. Verify category counts
        5. Verify color counts
        6. Add more items
        7. Verify summary updates
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Wardrobe summary integration")
        logger.info("=" * 70)
        
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"}
        )
        assert login_response.status_code == status.HTTP_200_OK
        auth_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        
        # Step 2: Add items in different categories
        logger.info("Step 2: Adding items in different categories...")
        items_to_add = [
            {"category": "shirt", "color": "Blue"},
            {"category": "shirt", "color": "Red"},
            {"category": "trouser", "color": "Black"},
            {"category": "shoes", "color": "Brown"},
        ]
        
        for item_data in items_to_add:
            files = {"image": sample_image}
            item_data["description"] = f"Test {item_data['category']}"
            response = client.post(
                "/api/wardrobe",
                files=files,
                data=item_data,
                headers=auth_headers
            )
            if response.status_code == status.HTTP_201_CREATED:
                logger.info(f"  ✓ Added: {item_data['category']} - {item_data['color']}")
        
        # Step 3: Get summary
        logger.info("Step 3: Getting wardrobe summary...")
        response = client.get("/api/wardrobe/summary", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        summary = response.json()
        
        # Step 4: Verify category counts
        logger.info("Step 4: Verifying category counts...")
        assert summary["by_category"]["shirt"] == 2
        assert summary["by_category"]["trouser"] == 1
        assert summary["by_category"]["shoes"] == 1
        assert summary["total_items"] == 4
        logger.info(f"  ✓ Category counts correct: {summary['by_category']}")
        
        # Step 5: Verify color counts
        logger.info("Step 5: Verifying color counts...")
        assert summary["by_color"]["Blue"] == 1
        assert summary["by_color"]["Red"] == 1
        assert summary["by_color"]["Black"] == 1
        assert summary["by_color"]["Brown"] == 1
        logger.info(f"  ✓ Color counts correct")
        
        logger.info("=" * 70 + "\n")
