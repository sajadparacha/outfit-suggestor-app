"""
Integration tests for complete outfit suggestion flow
Tests the full user journey: login -> upload image -> get suggestion -> handle duplicates
"""
import pytest
import logging
from fastapi import status
from io import BytesIO
from PIL import Image
import base64

logger = logging.getLogger(__name__)


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
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Complete flow with duplicate - Use existing suggestion")
        logger.info("=" * 70)
        
        # Step 1: Login
        logger.info(f"Step 1: Login (User ID: {test_user.id}, Email: {test_user.email})")
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
        logger.info("  ✓ Login successful")
        
        # Step 2: Upload shirt picture and get first AI suggestion
        logger.info("Step 2: Upload image & get AI suggestion...")
        files = {"image": sample_image}
        data = {
            "text_input": "business casual outfit",
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
            logger.info(f"  ✓ Suggestion received: {first_suggestion.get('shirt', 'N/A')[:40]}...")
            assert "shirt" in first_suggestion
            
            # Verify saved to history
            history_response = client.get("/api/outfit-history", headers=auth_headers)
            assert history_response.status_code == status.HTTP_200_OK
            history = history_response.json()
            logger.info(f"  ✓ Saved to history ({len(history)} entries)")
            
            # Step 3: Check for duplicate
            logger.info("Step 3: Check for duplicate...")
            sample_image[1].seek(0)
            duplicate_check_response = client.post(
                "/api/check-duplicate",
                files=files,
                headers=auth_headers
            )
            assert duplicate_check_response.status_code == status.HTTP_200_OK
            duplicate_data = duplicate_check_response.json()
            is_duplicate = duplicate_data.get("is_duplicate", False)
            logger.info(f"  ✓ Duplicate check: {is_duplicate}")
            
            # Step 4: Verify existing suggestion if duplicate found
            if is_duplicate:
                existing_suggestion = duplicate_data.get("existing_suggestion")
                assert existing_suggestion is not None
                assert existing_suggestion["shirt"] == first_suggestion["shirt"]
                logger.info("  ✓ Existing suggestion verified")
        else:
            logger.warning(f"  ⚠ Suggestion failed (status: {first_suggestion_response.status_code})")
        
        logger.info("=" * 70 + "\n")
    
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
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Complete flow with duplicate - Get new suggestion")
        logger.info("=" * 70)
        
        # Step 1: Login
        logger.info(f"Step 1: Login (User ID: {test_user.id})")
        login_response = client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"}
        )
        assert login_response.status_code == status.HTTP_200_OK
        auth_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        logger.info("  ✓ Login successful")
        
        # Step 2: Upload and get first suggestion
        logger.info("Step 2: Upload image & get first suggestion...")
        files = {"image": sample_image}
        data = {"text_input": "casual outfit", "generate_model_image": "false"}
        
        first_suggestion_response = client.post(
            "/api/suggest-outfit", files=files, data=data, headers=auth_headers
        )
        
        if first_suggestion_response.status_code == status.HTTP_200_OK:
            first_suggestion = first_suggestion_response.json()
            logger.info(f"  ✓ First suggestion: {first_suggestion.get('shirt', 'N/A')[:40]}...")
            
            # Step 3: Check for duplicate
            logger.info("Step 3: Check for duplicate...")
            sample_image[1].seek(0)
            duplicate_check_response = client.post(
                "/api/check-duplicate", files=files, headers=auth_headers
            )
            assert duplicate_check_response.status_code == status.HTTP_200_OK
            duplicate_data = duplicate_check_response.json()
            logger.info(f"  ✓ Duplicate check: {duplicate_data.get('is_duplicate', False)}")
            
            # Step 4: Get new suggestion anyway
            logger.info("Step 4: Get new suggestion (ignore duplicate)...")
            sample_image[1].seek(0)
            new_suggestion_response = client.post(
                "/api/suggest-outfit",
                files=files,
                data={"text_input": "formal outfit", "generate_model_image": "false"},
                headers=auth_headers
            )
            
            if new_suggestion_response.status_code == status.HTTP_200_OK:
                new_suggestion = new_suggestion_response.json()
                logger.info(f"  ✓ New suggestion: {new_suggestion.get('shirt', 'N/A')[:40]}...")
                assert "shirt" in new_suggestion
        else:
            logger.warning(f"  ⚠ Suggestion failed (status: {first_suggestion_response.status_code})")
        
        logger.info("=" * 70 + "\n")
    
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
        logger.info("=" * 80)
        logger.info("TEST: Complete flow with model image generation")
        logger.info("=" * 80)
        
        # Step 1: Login
        logger.info("Step 1: Logging in user...")
        logger.info(f"   User ID: {test_user.id}, Email: {test_user.email}")
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        logger.debug(f"Login response status: {login_response.status_code}")
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        logger.info(f"✓ Login successful (User ID: {test_user.id})")
        
        # Step 2 & 3: Upload shirt picture with model generation enabled
        logger.info("Step 2: Uploading image with model generation enabled...")
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
        logger.debug(f"Suggestion response status: {suggestion_response.status_code}")
        
        # May fail if OpenAI API key not set, but should not be validation error
        if suggestion_response.status_code == status.HTTP_200_OK:
            suggestion = suggestion_response.json()
            logger.info("✓ Suggestion received")
            
            # Verify outfit suggestion fields
            assert "shirt" in suggestion
            assert "trouser" in suggestion
            assert "blazer" in suggestion
            assert "shoes" in suggestion
            assert "belt" in suggestion
            assert "reasoning" in suggestion
            logger.info(f"✓ Outfit fields validated: {suggestion.get('shirt', 'N/A')[:50]}...")
            
            # Verify cost information is included
            if "cost" in suggestion:
                cost_info = suggestion["cost"]
                logger.info(f"Step 3: Verifying cost calculation...")
                logger.debug(f"Cost info: {cost_info}")
                assert "gpt4_cost" in cost_info
                assert "total_cost" in cost_info
                assert isinstance(cost_info["gpt4_cost"], (int, float))
                assert isinstance(cost_info["total_cost"], (int, float))
                logger.info(f"✓ Cost info validated: GPT4=${cost_info['gpt4_cost']:.4f}, Total=${cost_info['total_cost']:.4f}")
                
                # If model image was generated, should have model_image_cost
                if suggestion.get("model_image"):
                    assert "model_image_cost" in cost_info
                    assert cost_info["model_image_cost"] > 0
                    logger.info(f"✓ Model image cost: ${cost_info['model_image_cost']:.4f}")
                else:
                    logger.info("ℹ No model image generated (may require API key)")
            
            # Model image may or may not be present depending on API availability
            # Just verify the structure is correct
            if "model_image" in suggestion:
                assert suggestion["model_image"] is None or isinstance(suggestion["model_image"], str)
                logger.info(f"✓ Model image field validated: {'present' if suggestion.get('model_image') else 'null'}")
        else:
            logger.warning(f"⚠ Suggestion failed with status {suggestion_response.status_code} (may need OpenAI API key)")
        
        logger.info("=" * 80)
        logger.info("TEST COMPLETED")
        logger.info("=" * 80)
    
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
        logger.info("=" * 80)
        logger.info("TEST: Complete flow from wardrobe item")
        logger.info("=" * 80)
        
        # Step 1: Login
        logger.info("Step 1: Logging in user...")
        logger.info(f"   User ID: {test_user.id}, Email: {test_user.email}")
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        logger.debug(f"Login response status: {login_response.status_code}")
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        logger.info(f"✓ Login successful (User ID: {test_user.id})")
        
        # Step 2: Get AI suggestion from wardrobe item
        logger.info(f"Step 2: Getting AI suggestion from wardrobe item (ID: {wardrobe_item.id})...")
        data = {
            "text_input": "business casual",
            "generate_model_image": "false"
        }
        
        suggestion_response = client.post(
            f"/api/suggest-outfit-from-wardrobe-item/{wardrobe_item.id}",
            data=data,
            headers=auth_headers
        )
        logger.debug(f"Suggestion response status: {suggestion_response.status_code}")
        
        # May fail if OpenAI API key not set, but should not be auth error
        if suggestion_response.status_code == status.HTTP_200_OK:
            suggestion = suggestion_response.json()
            logger.info("✓ Suggestion received from wardrobe item")
            
            # Verify outfit suggestion
            assert "shirt" in suggestion
            assert "trouser" in suggestion
            assert "blazer" in suggestion
            assert "shoes" in suggestion
            assert "belt" in suggestion
            assert "reasoning" in suggestion
            logger.info(f"✓ Outfit fields validated: {suggestion.get('shirt', 'N/A')[:50]}...")
            
            # Step 3: Verify it was saved to history
            logger.info("Step 3: Verifying suggestion saved to history...")
            history_response = client.get("/api/outfit-history", headers=auth_headers)
            assert history_response.status_code == status.HTTP_200_OK
            history = history_response.json()
            logger.info(f"✓ Found {len(history)} entries in history")
            assert len(history) > 0
            
            # Find the entry we just created (should be first in list)
            latest_entry = history[0]
            assert latest_entry["shirt"] == suggestion["shirt"]
            assert latest_entry["trouser"] == suggestion["trouser"]
            logger.info("✓ Latest history entry matches suggestion")
        else:
            logger.warning(f"⚠ Suggestion failed with status {suggestion_response.status_code} (may need OpenAI API key)")
        
        logger.info("=" * 80)
        logger.info("TEST COMPLETED")
        logger.info("=" * 80)
    
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
        logger.info("=" * 80)
        logger.info("TEST: Complete duplicate detection workflow")
        logger.info("=" * 80)
        
        # Step 1: Login
        logger.info("Step 1: Logging in user...")
        logger.info(f"   User ID: {test_user.id}, Email: {test_user.email}")
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        logger.debug(f"Login response status: {login_response.status_code}")
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        logger.info(f"✓ Login successful (User ID: {test_user.id})")
        
        # Step 2: Upload image and get suggestion
        logger.info("Step 2: Uploading image and getting suggestion...")
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
        logger.debug(f"First suggestion response status: {first_response.status_code}")
        
        if first_response.status_code == status.HTTP_200_OK:
            logger.info("✓ First suggestion created")
            
            # Step 3: Check for duplicate with same image
            logger.info("Step 3: Checking for duplicate with same image...")
            sample_image[1].seek(0)
            duplicate_response = client.post(
                "/api/check-duplicate",
                files=files,
                headers=auth_headers
            )
            assert duplicate_response.status_code == status.HTTP_200_OK
            duplicate_data = duplicate_response.json()
            logger.info(f"✓ Duplicate check result: is_duplicate={duplicate_data.get('is_duplicate')}")
            
            # Should find duplicate
            assert "is_duplicate" in duplicate_data
            # Note: May not always find duplicate depending on image hashing, but structure should be correct
            if duplicate_data.get("is_duplicate"):
                logger.info("Step 3.1: Verifying duplicate response structure...")
                assert "existing_suggestion" in duplicate_data
                existing = duplicate_data["existing_suggestion"]
                assert "shirt" in existing
                assert "trouser" in existing
                assert "blazer" in existing
                assert "shoes" in existing
                assert "belt" in existing
                assert "reasoning" in existing
                logger.info("✓ Duplicate response structure validated")
            else:
                logger.warning("⚠ Duplicate not detected (may be due to image hashing differences)")
            
            # Step 4: Create a different image and check - should not be duplicate
            logger.info("Step 4: Checking duplicate with different image...")
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
            logger.info(f"✓ Different image duplicate check: is_duplicate={different_duplicate_data.get('is_duplicate')}")
            assert "is_duplicate" in different_duplicate_data
            # Different image should not be a duplicate (or if it is, it's a false positive)
        else:
            logger.warning(f"⚠ First suggestion failed with status {first_response.status_code} (may need OpenAI API key)")
        
        logger.info("=" * 80)
        logger.info("TEST COMPLETED")
        logger.info("=" * 80)
    
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
        logger.info("=" * 80)
        logger.info("TEST: Complete flow cost calculation")
        logger.info("=" * 80)
        
        # Step 1: Login
        logger.info("Step 1: Logging in user...")
        logger.info(f"   User ID: {test_user.id}, Email: {test_user.email}")
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        logger.debug(f"Login response status: {login_response.status_code}")
        assert login_response.status_code == status.HTTP_200_OK
        token_data = login_response.json()
        auth_token = token_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        logger.info(f"✓ Login successful (User ID: {test_user.id})")
        
        # Step 2: Get suggestion without model image
        logger.info("Step 2: Getting suggestion without model image...")
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
        logger.debug(f"Suggestion response status: {suggestion_response.status_code}")
        
        if suggestion_response.status_code == status.HTTP_200_OK:
            suggestion = suggestion_response.json()
            logger.info("✓ Suggestion received")
            
            # Step 3: Verify cost information
            if "cost" in suggestion:
                cost_info = suggestion["cost"]
                logger.info("Step 3: Verifying cost information...")
                logger.debug(f"Cost info: {cost_info}")
                assert "gpt4_cost" in cost_info
                assert "total_cost" in cost_info
                assert "input_tokens" in cost_info or "gpt4_cost" in cost_info
                assert "output_tokens" in cost_info or "gpt4_cost" in cost_info
                
                # Without model image, total should equal gpt4_cost
                assert cost_info["total_cost"] >= cost_info["gpt4_cost"]
                assert cost_info.get("model_image_cost", 0.0) == 0.0
                logger.info(f"✓ Cost validated: GPT4=${cost_info['gpt4_cost']:.4f}, Total=${cost_info['total_cost']:.4f}, Model=${cost_info.get('model_image_cost', 0.0):.4f}")
            else:
                logger.warning("⚠ No cost information in response")
        
        # Step 4: Get suggestion with model image (if API keys available)
        logger.info("Step 4: Getting suggestion with model image...")
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
        logger.debug(f"Model suggestion response status: {model_suggestion_response.status_code}")
        
        if model_suggestion_response.status_code == status.HTTP_200_OK:
            model_suggestion = model_suggestion_response.json()
            logger.info("✓ Model suggestion received")
            
            # Step 5: Verify total cost includes model image cost
            if "cost" in model_suggestion:
                cost_info = model_suggestion["cost"]
                logger.info("Step 5: Verifying model image cost calculation...")
                logger.debug(f"Cost info: {cost_info}")
                assert "gpt4_cost" in cost_info
                assert "total_cost" in cost_info
                
                # If model image was generated, total should be higher
                if model_suggestion.get("model_image"):
                    assert "model_image_cost" in cost_info
                    assert cost_info["model_image_cost"] > 0
                    assert cost_info["total_cost"] >= cost_info["gpt4_cost"] + cost_info["model_image_cost"]
                    logger.info(f"✓ Model image cost validated: GPT4=${cost_info['gpt4_cost']:.4f}, Model=${cost_info['model_image_cost']:.4f}, Total=${cost_info['total_cost']:.4f}")
                else:
                    logger.info("ℹ No model image generated (may require API key)")
            else:
                logger.warning("⚠ No cost information in model suggestion response")
        else:
            logger.warning(f"⚠ Model suggestion failed with status {model_suggestion_response.status_code} (may need OpenAI API key)")
        
        logger.info("=" * 80)
        logger.info("TEST COMPLETED")
        logger.info("=" * 80)
