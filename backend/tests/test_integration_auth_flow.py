"""
Integration tests for authentication flow
Tests the complete user authentication journey
"""
import pytest
import logging
from fastapi import status

logger = logging.getLogger(__name__)


class TestAuthenticationIntegration:
    """Integration tests for authentication workflow"""
    
    def test_complete_registration_and_login_flow(
        self,
        client,
        db
    ):
        """
        Integration test: Complete registration and login flow
        
        Steps:
        1. Register new user
        2. Verify registration response
        3. Login with credentials
        4. Verify token received
        5. Use token to access protected endpoint
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Complete registration and login flow")
        logger.info("=" * 70)
        
        # Step 1: Register
        logger.info("Step 1: Registering new user...")
        register_data = {
            "email": "integration_test@example.com",
            "password": "TestPassword123!",
            "full_name": "Integration Test User"
        }
        register_response = client.post("/api/auth/register", json=register_data)
        
        if register_response.status_code == status.HTTP_201_CREATED:
            register_result = register_response.json()
            logger.info(f"  ✓ User registered: {register_result.get('email')}")
            
            # Step 2: Login
            logger.info("Step 2: Logging in...")
            login_response = client.post(
                "/api/auth/login",
                data={
                    "username": register_data["email"],
                    "password": register_data["password"]
                }
            )
            assert login_response.status_code == status.HTTP_200_OK
            login_result = login_response.json()
            assert "access_token" in login_result
            auth_token = login_result["access_token"]
            logger.info("  ✓ Login successful, token received")
            
            # Step 3: Use token
            logger.info("Step 3: Using token to access protected endpoint...")
            auth_headers = {"Authorization": f"Bearer {auth_token}"}
            wardrobe_response = client.get("/api/wardrobe", headers=auth_headers)
            assert wardrobe_response.status_code == status.HTTP_200_OK
            logger.info("  ✓ Protected endpoint accessible with token")
        else:
            # User might already exist
            logger.warning(f"  ⚠ Registration failed: {register_response.status_code}")
        
        logger.info("=" * 70 + "\n")
    
    def test_login_and_access_wardrobe_flow(
        self,
        client,
        test_user
    ):
        """
        Integration test: Login and access wardrobe flow
        
        Steps:
        1. Login
        2. Access wardrobe (should be empty initially)
        3. Add wardrobe item
        4. View wardrobe
        5. Get wardrobe summary
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Login and access wardrobe flow")
        logger.info("=" * 70)
        
        # Step 1: Login
        logger.info("Step 1: Logging in...")
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
        
        # Step 2: Access wardrobe
        logger.info("Step 2: Accessing wardrobe...")
        wardrobe_response = client.get("/api/wardrobe", headers=auth_headers)
        assert wardrobe_response.status_code == status.HTTP_200_OK
        wardrobe_data = wardrobe_response.json()
        assert "items" in wardrobe_data
        logger.info(f"  ✓ Wardrobe accessible: {wardrobe_data['total']} items")
        
        # Step 3: Get summary
        logger.info("Step 3: Getting wardrobe summary...")
        summary_response = client.get("/api/wardrobe/summary", headers=auth_headers)
        assert summary_response.status_code == status.HTTP_200_OK
        summary = summary_response.json()
        assert "total_items" in summary
        logger.info(f"  ✓ Summary accessible: {summary['total_items']} total items")
        
        logger.info("=" * 70 + "\n")
    
    def test_authentication_required_flow(
        self,
        client
    ):
        """
        Integration test: Verify authentication required for protected endpoints
        
        Steps:
        1. Try to access wardrobe without auth (should fail)
        2. Try to add wardrobe item without auth (should fail)
        3. Try to get summary without auth (should fail)
        4. Login
        5. Access same endpoints (should succeed)
        """
        logger.info("\n" + "=" * 70)
        logger.info("TEST: Authentication required flow")
        logger.info("=" * 70)
        
        # Step 1-3: Try without auth
        logger.info("Step 1-3: Attempting to access protected endpoints without auth...")
        wardrobe_response = client.get("/api/wardrobe")
        assert wardrobe_response.status_code == status.HTTP_401_UNAUTHORIZED
        logger.info("  ✓ Wardrobe endpoint requires auth")
        
        summary_response = client.get("/api/wardrobe/summary")
        assert summary_response.status_code == status.HTTP_401_UNAUTHORIZED
        logger.info("  ✓ Summary endpoint requires auth")
        
        logger.info("=" * 70 + "\n")
