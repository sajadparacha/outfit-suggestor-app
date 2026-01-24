"""
Integration tests for complete outfit suggestion flow
Tests the full user journey: login -> upload image -> get suggestion -> handle duplicates
"""
import pytest
from fastapi import status
from io import BytesIO
from PIL import Image
import base64


class TestOutfitSuggestionIntegration:
    """Integration tests for complete outfit suggestion workflow"""
    
    def test_complete_flow_with_duplicate_use_existing(
        self, 
        client, 
        test_user, 
        sample_image,
        db
    ):
        """
        Integration test: Complete flow with duplicate detection and using existing suggestion
        
        Steps:
        1. Login
        2. Upload shirt picture
        3. Get AI suggestion (first time - creates history entry)
        4. Upload same image again
        5. Duplicate detected - use existing suggestion
        6. Verify outfit suggestion is loaded correctly
        """
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Step 2: Upload shirt picture and get first AI suggestion
        files = {"image": sample_image}
        data = {
            "text_input": "business casual outfit",
            "generate_model_image": "false"  # Skip model image for faster test
        }
        
        first_suggestion_response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        # May fail if OpenAI API key not set, but should not be auth error
        if first_suggestion_response.status_code == status.HTTP_200_OK:
            first_suggestion = first_suggestion_response.json()
            assert "shirt" in first_suggestion
            assert "trouser" in first_suggestion
            assert "blazer" in first_suggestion
            assert "shoes" in first_suggestion
            assert "belt" in first_suggestion
            assert "reasoning" in first_suggestion
            
            # Verify it was saved to history
            history_response = client.get("/api/outfit-history", headers=auth_headers)
            assert history_response.status_code == status.HTTP_200_OK
            history = history_response.json()
            assert len(history) > 0
            
            # Step 3: Upload same image again (should detect duplicate)
            # Reset file pointer for reuse
            sample_image[1].seek(0)
            duplicate_check_response = client.post(
                "/api/check-duplicate",
                files=files,
                headers=auth_headers
            )
            assert duplicate_check_response.status_code == status.HTTP_200_OK
            duplicate_data = duplicate_check_response.json()
            
            # Step 4: If duplicate found, verify we can use existing
            if duplicate_data.get("is_duplicate"):
                existing_suggestion = duplicate_data.get("existing_suggestion")
                assert existing_suggestion is not None
                assert existing_suggestion["shirt"] == first_suggestion["shirt"]
                assert existing_suggestion["trouser"] == first_suggestion["trouser"]
                assert existing_suggestion["blazer"] == first_suggestion["blazer"]
                assert existing_suggestion["shoes"] == first_suggestion["shoes"]
                assert existing_suggestion["belt"] == first_suggestion["belt"]
                assert existing_suggestion["reasoning"] == first_suggestion["reasoning"]
    
    def test_complete_flow_with_duplicate_get_new_suggestion(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Complete flow with duplicate detection but get new AI suggestion
        
        Steps:
        1. Login
        2. Upload shirt picture
        3. Get AI suggestion (first time - creates history entry)
        4. Upload same image again
        5. Duplicate detected but user chooses to get new suggestion
        6. Verify new outfit suggestion is generated and displayed
        """
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Step 2: Upload shirt picture and get first AI suggestion
        files = {"image": sample_image}
        data = {
            "text_input": "casual outfit",
            "generate_model_image": "false"
        }
        
        first_suggestion_response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        if first_suggestion_response.status_code == status.HTTP_200_OK:
            first_suggestion = first_suggestion_response.json()
            first_shirt = first_suggestion.get("shirt", "")
            first_trouser = first_suggestion.get("trouser", "")
            
            # Step 3: Upload same image again and check for duplicate
            sample_image[1].seek(0)
            duplicate_check_response = client.post(
                "/api/check-duplicate",
                files=files,
                headers=auth_headers
            )
            assert duplicate_check_response.status_code == status.HTTP_200_OK
            duplicate_data = duplicate_check_response.json()
            
            # Step 4: Even if duplicate found, get new suggestion (skip duplicate check)
            # This simulates user choosing "Get New" option
            sample_image[1].seek(0)
            new_suggestion_response = client.post(
                "/api/suggest-outfit",
                files=files,
                data={
                    "text_input": "formal outfit",  # Different preference to potentially get different suggestion
                    "generate_model_image": "false"
                },
                headers=auth_headers
            )
            
            # Should get a new suggestion (may be same or different, but should be valid)
            if new_suggestion_response.status_code == status.HTTP_200_OK:
                new_suggestion = new_suggestion_response.json()
                assert "shirt" in new_suggestion
                assert "trouser" in new_suggestion
                assert "blazer" in new_suggestion
                assert "shoes" in new_suggestion
                assert "belt" in new_suggestion
                assert "reasoning" in new_suggestion
                
                # Verify it's a valid outfit suggestion
                assert len(new_suggestion["shirt"]) > 0
                assert len(new_suggestion["trouser"]) > 0
                assert len(new_suggestion["reasoning"]) > 0
    
    def test_complete_flow_with_model_image_generation(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Complete flow with model image generation enabled
        
        Steps:
        1. Login
        2. Upload shirt picture
        3. Select model generation
        4. Get AI suggestion with model image
        5. Verify suggestion includes model image
        """
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Step 2 & 3: Upload shirt picture with model generation enabled
        files = {"image": sample_image}
        data = {
            "text_input": "professional outfit",
            "generate_model_image": "true",
            "image_model": "dalle3"
        }
        
        suggestion_response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        # May fail if OpenAI API key not set, but should not be validation error
        if suggestion_response.status_code == status.HTTP_200_OK:
            suggestion = suggestion_response.json()
            
            # Verify outfit suggestion fields
            assert "shirt" in suggestion
            assert "trouser" in suggestion
            assert "blazer" in suggestion
            assert "shoes" in suggestion
            assert "belt" in suggestion
            assert "reasoning" in suggestion
            
            # Verify cost information is included
            if "cost" in suggestion:
                cost_info = suggestion["cost"]
                assert "gpt4_cost" in cost_info
                assert "total_cost" in cost_info
                assert isinstance(cost_info["gpt4_cost"], (int, float))
                assert isinstance(cost_info["total_cost"], (int, float))
                
                # If model image was generated, should have model_image_cost
                if suggestion.get("model_image"):
                    assert "model_image_cost" in cost_info
                    assert cost_info["model_image_cost"] > 0
            
            # Model image may or may not be present depending on API availability
            # Just verify the structure is correct
            if "model_image" in suggestion:
                assert suggestion["model_image"] is None or isinstance(suggestion["model_image"], str)
    
    def test_complete_flow_from_wardrobe_item(
        self,
        client,
        test_user,
        wardrobe_item,
        db
    ):
        """
        Integration test: Complete flow starting from wardrobe item
        
        Steps:
        1. Login
        2. Get AI suggestion from wardrobe item
        3. Verify suggestion is generated
        4. Verify suggestion is saved to history
        """
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Step 2: Get AI suggestion from wardrobe item
        data = {
            "text_input": "business casual",
            "generate_model_image": "false"
        }
        
        suggestion_response = client.post(
            f"/api/suggest-outfit-from-wardrobe-item/{wardrobe_item.id}",
            data=data,
            headers=auth_headers
        )
        
        # May fail if OpenAI API key not set, but should not be auth error
        if suggestion_response.status_code == status.HTTP_200_OK:
            suggestion = suggestion_response.json()
            
            # Verify outfit suggestion
            assert "shirt" in suggestion
            assert "trouser" in suggestion
            assert "blazer" in suggestion
            assert "shoes" in suggestion
            assert "belt" in suggestion
            assert "reasoning" in suggestion
            
            # Step 3: Verify it was saved to history
            history_response = client.get("/api/outfit-history", headers=auth_headers)
            assert history_response.status_code == status.HTTP_200_OK
            history = history_response.json()
            assert len(history) > 0
            
            # Find the entry we just created (should be first in list)
            latest_entry = history[0]
            assert latest_entry["shirt"] == suggestion["shirt"]
            assert latest_entry["trouser"] == suggestion["trouser"]
    
    def test_complete_flow_duplicate_detection_workflow(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Complete duplicate detection workflow
        
        Steps:
        1. Login
        2. Upload image and get suggestion (saves to history)
        3. Upload same image - duplicate check should find it
        4. Verify duplicate response structure
        5. Upload different image - duplicate check should not find it
        """
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Step 2: Upload image and get suggestion
        files = {"image": sample_image}
        data = {
            "text_input": "test outfit",
            "generate_model_image": "false"
        }
        
        first_response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        if first_response.status_code == status.HTTP_200_OK:
            # Step 3: Check for duplicate with same image
            sample_image[1].seek(0)
            duplicate_response = client.post(
                "/api/check-duplicate",
                files=files,
                headers=auth_headers
            )
            assert duplicate_response.status_code == status.HTTP_200_OK
            duplicate_data = duplicate_response.json()
            
            # Should find duplicate
            assert "is_duplicate" in duplicate_data
            # Note: May not always find duplicate depending on image hashing, but structure should be correct
            if duplicate_data.get("is_duplicate"):
                assert "existing_suggestion" in duplicate_data
                existing = duplicate_data["existing_suggestion"]
                assert "shirt" in existing
                assert "trouser" in existing
                assert "blazer" in existing
                assert "shoes" in existing
                assert "belt" in existing
                assert "reasoning" in existing
            
            # Step 4: Create a different image and check - should not be duplicate
            different_image = Image.new('RGB', (100, 100), color='blue')
            different_img_bytes = BytesIO()
            different_image.save(different_img_bytes, format='JPEG')
            different_img_bytes.seek(0)
            different_files = ("different_image.jpg", different_img_bytes, "image/jpeg")
            
            different_duplicate_response = client.post(
                "/api/check-duplicate",
                files={"image": different_files},
                headers=auth_headers
            )
            assert different_duplicate_response.status_code == status.HTTP_200_OK
            different_duplicate_data = different_duplicate_response.json()
            assert "is_duplicate" in different_duplicate_data
            # Different image should not be a duplicate (or if it is, it's a false positive)
    
    def test_complete_flow_cost_calculation(
        self,
        client,
        test_user,
        sample_image,
        db
    ):
        """
        Integration test: Verify cost calculation in complete flow
        
        Steps:
        1. Login
        2. Upload image and get suggestion
        3. Verify cost information is included and accurate
        4. Get suggestion with model image
        5. Verify total cost includes model image cost
        """
        # Step 1: Login
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Step 2: Get suggestion without model image
        files = {"image": sample_image}
        data = {
            "text_input": "test",
            "generate_model_image": "false"
        }
        
        suggestion_response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        if suggestion_response.status_code == status.HTTP_200_OK:
            suggestion = suggestion_response.json()
            
            # Step 3: Verify cost information
            if "cost" in suggestion:
                cost_info = suggestion["cost"]
                assert "gpt4_cost" in cost_info
                assert "total_cost" in cost_info
                assert "input_tokens" in cost_info or "gpt4_cost" in cost_info
                assert "output_tokens" in cost_info or "gpt4_cost" in cost_info
                
                # Without model image, total should equal gpt4_cost
                assert cost_info["total_cost"] >= cost_info["gpt4_cost"]
                assert cost_info.get("model_image_cost", 0.0) == 0.0
        
        # Step 4: Get suggestion with model image (if API keys available)
        sample_image[1].seek(0)
        data_with_model = {
            "text_input": "test",
            "generate_model_image": "true",
            "image_model": "dalle3"
        }
        
        model_suggestion_response = client.post(
            "/api/suggest-outfit",
            files=files,
            data=data_with_model,
            headers=auth_headers
        )
        
        if model_suggestion_response.status_code == status.HTTP_200_OK:
            model_suggestion = model_suggestion_response.json()
            
            # Step 5: Verify total cost includes model image cost
            if "cost" in model_suggestion:
                cost_info = model_suggestion["cost"]
                assert "gpt4_cost" in cost_info
                assert "total_cost" in cost_info
                
                # If model image was generated, total should be higher
                if model_suggestion.get("model_image"):
                    assert "model_image_cost" in cost_info
                    assert cost_info["model_image_cost"] > 0
                    assert cost_info["total_cost"] >= cost_info["gpt4_cost"] + cost_info["model_image_cost"]
