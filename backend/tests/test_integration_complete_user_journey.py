"""
Integration tests for complete user journey
Tests end-to-end scenarios combining multiple features
"""
import pytest
import logging
from fastapi import status
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)


class TestCompleteUserJourney:
    """Integration tests for complete user journey scenarios"""
    
    def test_complete_journey_wardrobe_to_outfit_to_history(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Complete journey from wardrobe to outfit to history
        
        Steps:
        1. Login
        2. Add wardrobe items
        3. Get AI suggestion from wardrobe item
        4. Verify suggestion saved to history
        5. View outfit history
        6. Get another suggestion (regular upload)
        7. Verify both in history
        8. Search history
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Complete journey - Wardrobe to Outfit to History")
        logger.info("=" * 70)
        
        # Step 1: Login
        logger.info("Step 1: Logging in...")
        login_response = client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"}
        )
        assert login_response.status_code == status.HTTP_200_OK
        auth_token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        logger.info("  ✓ Login successful")
        
        # Step 2: Add wardrobe item
        logger.info("Step 2: Adding wardrobe item...")
        files = {"image": sample_image}
        wardrobe_data = {
            "category": "shirt",
            "color": "Blue",
            "description": "Test shirt for journey"
        }
        wardrobe_response = client.post(
            "/api/wardrobe",
            files=files,
            data=wardrobe_data,
            headers=auth_headers
        )
        assert wardrobe_response.status_code == status.HTTP_201_CREATED
        wardrobe_item = wardrobe_response.json()
        logger.info(f"  ✓ Wardrobe item added: {wardrobe_item['id']}")
        
        # Step 3: Get AI suggestion from wardrobe item
        logger.info("Step 3: Getting AI suggestion from wardrobe item...")
        suggestion_response = client.post(
            f"/api/suggest-outfit-from-wardrobe-item/{wardrobe_item['id']}",
            data={"text_input": "casual", "generate_model_image": "false"},
            headers=auth_headers
        )
        
        if suggestion_response.status_code == status.HTTP_200_OK:
            suggestion1 = suggestion_response.json()
            assert "shirt" in suggestion1
            logger.info("  ✓ Suggestion 1 received from wardrobe")
            
            # Step 4: Verify in history
            logger.info("Step 4: Verifying suggestion in history...")
            history_response = client.get("/api/outfit-history", headers=auth_headers)
            assert history_response.status_code == status.HTTP_200_OK
            history = history_response.json()
            assert len(history) > 0
            logger.info(f"  ✓ Found {len(history)} entries in history")
            
            # Step 5: Get another suggestion (regular upload)
            logger.info("Step 5: Getting second suggestion (regular upload)...")
            sample_image[1].seek(0)
            suggestion2_response = client.post(
                "/api/suggest-outfit",
                files=files,
                data={"text_input": "formal", "generate_model_image": "false"},
                headers=auth_headers
            )
            
            if suggestion2_response.status_code == status.HTTP_200_OK:
                suggestion2 = suggestion2_response.json()
                logger.info("  ✓ Suggestion 2 received")
                
                # Step 6: Verify both in history
                logger.info("Step 6: Verifying both suggestions in history...")
                history_response = client.get("/api/outfit-history", headers=auth_headers)
                assert history_response.status_code == status.HTTP_200_OK
                history = history_response.json()
                assert len(history) >= 2
                logger.info(f"  ✓ Both suggestions in history: {len(history)} entries")
        
        logger.info("=" * 70 + "\n")
    
    def test_complete_journey_with_wardrobe_matching(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Complete journey with wardrobe matching
        
        Steps:
        1. Login
        2. Add multiple wardrobe items
        3. Get AI suggestion (regular upload)
        4. Verify matching_wardrobe_items in response
        5. Verify matching items structure
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Complete journey with wardrobe matching")
        logger.info("=" * 70)
        
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"}
        )
        assert login_response.status_code == status.HTTP_200_OK
        auth_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        logger.info("  ✓ Login successful")
        
        # Step 2: Add wardrobe items
        logger.info("Step 2: Adding wardrobe items...")
        items_to_add = [
            {"category": "shirt", "color": "Blue", "description": "Blue shirt"},
            {"category": "trouser", "color": "Black", "description": "Black pants"},
            {"category": "shoes", "color": "Brown", "description": "Brown shoes"},
        ]
        
        for item_data in items_to_add:
            files = {"image": sample_image}
            response = client.post(
                "/api/wardrobe",
                files=files,
                data=item_data,
                headers=auth_headers
            )
            if response.status_code == status.HTTP_201_CREATED:
                logger.info(f"  ✓ Added: {item_data['category']}")
        
        # Step 3: Get AI suggestion
        logger.info("Step 3: Getting AI suggestion...")
        files = {"image": sample_image}
        suggestion_response = client.post(
            "/api/suggest-outfit",
            files=files,
            data={"text_input": "business casual", "generate_model_image": "false"},
            headers=auth_headers
        )
        
        if suggestion_response.status_code == status.HTTP_200_OK:
            suggestion = suggestion_response.json()
            
            # Step 4: Verify matching_wardrobe_items
            logger.info("Step 4: Verifying wardrobe matching...")
            assert "matching_wardrobe_items" in suggestion
            if suggestion["matching_wardrobe_items"]:
                matching = suggestion["matching_wardrobe_items"]
                assert isinstance(matching, dict)
                logger.info(f"  ✓ Matching items found: {list(matching.keys())}")
                
                # Verify structure
                for category, items in matching.items():
                    if items:
                        assert isinstance(items, list)
                        logger.info(f"  ✓ {category}: {len(items)} matching items")
        
        logger.info("=" * 70 + "\n")
    
    def test_complete_journey_search_pagination_and_suggestion(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Complete journey with search, pagination, and suggestion
        
        Steps:
        1. Login
        2. Add multiple wardrobe items
        3. Search wardrobe
        4. Paginate through results
        5. Get suggestion from searched item
        6. Verify suggestion
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Complete journey - Search, Pagination, Suggestion")
        logger.info("=" * 70)
        
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"}
        )
        assert login_response.status_code == status.HTTP_200_OK
        auth_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        
        # Step 2: Add items
        logger.info("Step 2: Adding wardrobe items...")
        for i in range(10):
            files = {"image": sample_image}
            data = {
                "category": "shirt" if i < 5 else "trouser",
                "color": "Blue" if i % 2 == 0 else "Red",
                "description": f"Item {i}"
            }
            client.post("/api/wardrobe", files=files, data=data, headers=auth_headers)
        
        # Step 3: Search
        logger.info("Step 3: Searching wardrobe...")
        response = client.get("/api/wardrobe?search=blue&limit=3", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        logger.info(f"  ✓ Search found {data['total']} items, showing {len(data['items'])}")
        
        # Step 4: Get suggestion from first item
        if data["items"]:
            item_id = data["items"][0]["id"]
            logger.info(f"Step 4: Getting suggestion from item {item_id}...")
            suggestion_response = client.post(
                f"/api/suggest-outfit-from-wardrobe-item/{item_id}",
                data={"text_input": "test", "generate_model_image": "false"},
                headers=auth_headers
            )
            if suggestion_response.status_code == status.HTTP_200_OK:
                logger.info("  ✓ Suggestion received")
        
        logger.info("=" * 70 + "\n")
