"""
Test cases for Authentication API endpoints
"""
import pytest
from fastapi import status


class TestAuthEndpoints:
    """Test suite for /api/auth/* endpoints"""
    
    def test_register_success(self, client):
        """Test successful user registration"""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "securepassword123",
                "full_name": "New User"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["full_name"] == "New User"
    
    def test_register_duplicate_email(self, client, test_user):
        """Test registration with duplicate email"""
        response = client.post(
            "/api/auth/register",
            json={
                "email": test_user.email,
                "password": "password123",
                "full_name": "Duplicate User"
            }
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email format"""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "notanemail",
                "password": "password123",
                "full_name": "Invalid User"
            }
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_register_missing_fields(self, client):
        """Test registration with missing required fields"""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "user@example.com"
                # Missing password
            }
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_login_success(self, client, test_user):
        """Test successful login"""
        response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "testpassword123"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == test_user.email
    
    def test_login_invalid_credentials(self, client, test_user):
        """Test login with invalid password"""
        response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "wrongpassword"
            }
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user"""
        response = client.post(
            "/api/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_current_user_success(self, client, auth_headers):
        """Test getting current user info with valid token"""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "email" in data
        assert "id" in data
        assert "is_active" in data
    
    def test_get_current_user_unauthorized(self, client):
        """Test getting current user without token"""
        response = client.get("/api/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_change_password_success(self, client, auth_headers, test_user, db):
        """Test successful password change"""
        response = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "testpassword123",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.json()
        
        # Verify new password works
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.email,
                "password": "newpassword123"
            }
        )
        assert login_response.status_code == status.HTTP_200_OK
    
    def test_change_password_wrong_current(self, client, auth_headers):
        """Test password change with wrong current password"""
        response = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        # Wrong password returns 401 Unauthorized (not 400 Bad Request)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_change_password_unauthorized(self, client):
        """Test password change without authentication"""
        response = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "testpassword123",
                "new_password": "newpassword123"
            }
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_activate_account_invalid_token(self, client):
        """Test account activation with invalid token"""
        response = client.get("/api/auth/activate/invalid_token")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
