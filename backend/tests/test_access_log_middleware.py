"""
Tests for access logging middleware behavior.
Verifies that only defined operation types are persisted.
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAccessLogMiddlewareOperationFiltering:
    """Test that middleware only logs defined operation types."""

    def test_health_request_does_not_create_db_session(self, client):
        """Requests to /health have no operation_type; middleware should not open DB session."""
        with patch("middleware.access_logging.SessionLocal") as mock_session_local:
            response = client.get("/health")
            assert response.status_code == 200
            mock_session_local.assert_not_called()

    def test_auth_me_request_does_not_create_db_session(self, client, auth_headers):
        """Requests to /api/auth/me have no operation_type; middleware should not open DB session."""
        with patch("middleware.access_logging.SessionLocal") as mock_session_local:
            response = client.get("/api/auth/me", headers=auth_headers)
            assert response.status_code == 200
            mock_session_local.assert_not_called()

    def test_login_request_creates_access_log(self, client, db, test_user):
        """POST /api/auth/login has operation_type auth_login; should persist log (uses test db)."""
        from models.access_log import AccessLog

        mock_db = MagicMock(wraps=db)
        mock_db.close = MagicMock()  # Prevent middleware from closing shared test session

        with patch("middleware.access_logging.SessionLocal", return_value=mock_db):
            count_before = db.query(AccessLog).count()
            response = client.post(
                "/api/auth/login",
                data={"username": test_user.email, "password": "testpassword123"},
            )
            assert response.status_code == 200
            count_after = db.query(AccessLog).count()
            assert count_after > count_before
            new_log = db.query(AccessLog).order_by(AccessLog.id.desc()).first()
            assert new_log.operation_type == "auth_login"


class TestDetermineOperationType:
    """Unit tests for operation type mapping."""

    def test_ai_outfit_suggestion(self):
        from main import app
        from middleware.access_logging import AccessLoggingMiddleware

        mw = AccessLoggingMiddleware(app=app)
        assert mw._determine_operation_type("/api/suggest-outfit", "POST") == "ai_outfit_suggestion"

    def test_ai_wardrobe_analysis(self):
        from main import app
        from middleware.access_logging import AccessLoggingMiddleware

        mw = AccessLoggingMiddleware(app=app)
        assert mw._determine_operation_type("/api/wardrobe/analyze-image", "POST") == "ai_wardrobe_analysis"

    def test_wardrobe_view(self):
        from main import app
        from middleware.access_logging import AccessLoggingMiddleware

        mw = AccessLoggingMiddleware(app=app)
        assert mw._determine_operation_type("/api/wardrobe", "GET") == "wardrobe_view"

    def test_wardrobe_add(self):
        from main import app
        from middleware.access_logging import AccessLoggingMiddleware

        mw = AccessLoggingMiddleware(app=app)
        assert mw._determine_operation_type("/api/wardrobe", "POST") == "wardrobe_add"

    def test_outfit_history_view(self):
        from main import app
        from middleware.access_logging import AccessLoggingMiddleware

        mw = AccessLoggingMiddleware(app=app)
        assert mw._determine_operation_type("/api/outfit-history", "GET") == "outfit_history_view"

    def test_auth_login(self):
        from main import app
        from middleware.access_logging import AccessLoggingMiddleware

        mw = AccessLoggingMiddleware(app=app)
        assert mw._determine_operation_type("/api/auth/login", "POST") == "auth_login"

    def test_health_returns_none(self):
        from main import app
        from middleware.access_logging import AccessLoggingMiddleware

        mw = AccessLoggingMiddleware(app=app)
        assert mw._determine_operation_type("/health", "GET") is None

    def test_auth_me_returns_none(self):
        from main import app
        from middleware.access_logging import AccessLoggingMiddleware

        mw = AccessLoggingMiddleware(app=app)
        assert mw._determine_operation_type("/api/auth/me", "GET") is None
