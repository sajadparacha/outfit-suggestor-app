"""
Test cases for Access Log API endpoints
"""
import pytest
from fastapi import status
from models.access_log import AccessLog


class TestAccessLogEndpoints:
    """Test suite for /api/access-logs/* endpoints"""
    
    def test_get_access_logs_unauthorized(self, client):
        """Test getting access logs without authentication"""
        response = client.get("/api/access-logs/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_access_logs_forbidden_non_admin(self, client, non_admin_auth_headers):
        """Test access logs are admin-only"""
        response = client.get("/api/access-logs/", headers=non_admin_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_access_logs_success(self, client, auth_headers):
        """Test getting access logs with admin authentication"""
        response = client.get("/api/access-logs/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total" in data
        assert "logs" in data
        assert isinstance(data["logs"], list)
        assert isinstance(data["total"], int)
    
    def test_get_access_logs_with_limit(self, client, auth_headers):
        """Test getting access logs with limit parameter"""
        response = client.get(
            "/api/access-logs/?limit=10",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["logs"]) <= 10
        assert data["limit"] == 10
    
    def test_get_access_logs_with_offset(self, client, auth_headers):
        """Test getting access logs with offset parameter"""
        response = client.get(
            "/api/access-logs/?offset=5&limit=10",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["offset"] == 5
    
    def test_get_access_logs_filter_by_operation_type(self, client, auth_headers):
        """Test filtering access logs by operation type"""
        response = client.get(
            "/api/access-logs/?operation_type=ai_outfit_suggestion",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All logs should have the specified operation type
        for log in data["logs"]:
            assert log["operation_type"] == "ai_outfit_suggestion"
    
    def test_get_access_logs_filter_by_endpoint(self, client, auth_headers):
        """Test filtering access logs by endpoint"""
        response = client.get(
            "/api/access-logs/?endpoint=/api/wardrobe",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All logs should contain the endpoint filter
        for log in data["logs"]:
            assert "/api/wardrobe" in log["endpoint"]
    
    def test_get_access_logs_filter_by_user_id(self, client, auth_headers, test_user):
        """Test filtering access logs by user ID"""
        response = client.get(
            f"/api/access-logs/?user_id={test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All logs should have the specified user_id
        for log in data["logs"]:
            assert log["user_id"] == test_user.id

    def test_get_access_logs_filter_by_user_name_case_insensitive(
        self, client, auth_headers, db, test_user
    ):
        """Test filtering by user name/email (case-insensitive contains)."""
        # Insert an access log for test_user
        log_entry = AccessLog(
            ip_address="127.0.0.1",
            endpoint="/api/wardrobe",
            method="GET",
            operation_type="wardrobe_view",
            user_id=test_user.id,
            status_code=200,
        )
        db.add(log_entry)
        db.commit()

        # Query with lowercase partial match on email
        response = client.get(
            "/api/access-logs/?user=test",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] >= 1
        assert any(
            log["user_id"] == test_user.id and "test" in (log.get("user_email") or "").lower()
            for log in data["logs"]
        )
    
    def test_get_access_logs_filter_by_date_range(self, client, auth_headers):
        """Test filtering access logs by date range"""
        response = client.get(
            "/api/access-logs/?start_date=2024-01-01&end_date=2024-12-31",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data["logs"], list)
    
    def test_get_access_logs_invalid_date_format(self, client, auth_headers):
        """Test filtering with invalid date format"""
        response = client.get(
            "/api/access-logs/?start_date=invalid-date",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_get_access_logs_statistics(self, client, auth_headers):
        """Test getting access log statistics"""
        response = client.get("/api/access-logs/stats", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_requests" in data
        assert "unique_ip_addresses" in data
        assert isinstance(data["total_requests"], int)
    
    def test_get_access_logs_statistics_unauthorized(self, client):
        """Test getting statistics without authentication"""
        response = client.get("/api/access-logs/stats")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_access_logs_usage_admin_only(self, client, auth_headers):
        """Test /api/access-logs/usage returns usage stats for admin."""
        response = client.get("/api/access-logs/usage", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "ai_calls" in data
        assert "wardrobe_operations" in data
        assert "outfit_history" in data

    def test_get_access_logs_usage_forbidden_non_admin(self, client, non_admin_auth_headers):
        """Test /api/access-logs/usage is admin-only."""
        response = client.get("/api/access-logs/usage", headers=non_admin_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_access_logs_with_max_limit(self, client, auth_headers):
        """Test getting access logs with maximum limit"""
        response = client.get(
            "/api/access-logs/?limit=1000",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["logs"]) <= 1000
    
    def test_get_access_logs_exceeds_max_limit(self, client, auth_headers):
        """Test getting access logs exceeding maximum limit"""
        response = client.get(
            "/api/access-logs/?limit=1001",
            headers=auth_headers
        )
        # Should either return 422 or cap at 1000
        assert response.status_code in [status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_200_OK]
