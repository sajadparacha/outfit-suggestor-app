"""Tests for POST /api/auth/oauth (Google / Apple)."""
from unittest.mock import patch

import pytest
from fastapi import status

from models.user import User
from utils.oauth_verify import OAuthVerificationError, VerifiedOAuthIdentity


@pytest.fixture
def google_identity():
    return VerifiedOAuthIdentity(
        provider="google",
        provider_user_id="google-sub-1",
        email="oauth.user@example.com",
        full_name="OAuth User",
        email_verified=True,
    )


class TestOAuthAuthEndpoints:
    def test_oauth_creates_new_user(self, client, db, google_identity):
        with patch(
            "utils.oauth_verify.verify_oauth_id_token",
            return_value=google_identity,
        ):
            response = client.post(
                "/api/auth/oauth",
                json={"provider": "google", "id_token": "fake-google-token"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["token_type"] == "bearer"
        assert "access_token" in data
        assert data["user"]["email"] == "oauth.user@example.com"

        user = db.query(User).filter(User.email == "oauth.user@example.com").one()
        assert user.hashed_password is None
        assert user.auth_provider == "google"
        assert user.provider_user_id == "google-sub-1"
        assert user.email_verified is True

    def test_oauth_links_existing_email_user(self, client, db, test_user, google_identity):
        linked = VerifiedOAuthIdentity(
            provider="google",
            provider_user_id="google-sub-linked",
            email=test_user.email,
            full_name="Linked Name",
            email_verified=True,
        )
        with patch(
            "utils.oauth_verify.verify_oauth_id_token",
            return_value=linked,
        ):
            response = client.post(
                "/api/auth/oauth",
                json={"provider": "google", "id_token": "fake-google-token"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["user"]["email"] == test_user.email
        assert data["user"]["id"] == test_user.id

        db.refresh(test_user)
        assert test_user.auth_provider == "google"
        assert test_user.provider_user_id == "google-sub-linked"
        assert test_user.hashed_password is not None  # password login still possible

    def test_oauth_reuses_provider_identity(self, client, db, google_identity):
        with patch(
            "utils.oauth_verify.verify_oauth_id_token",
            return_value=google_identity,
        ):
            first = client.post(
                "/api/auth/oauth",
                json={"provider": "google", "id_token": "t1"},
            )
            second = client.post(
                "/api/auth/oauth",
                json={"provider": "google", "id_token": "t2"},
            )

        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_200_OK
        assert first.json()["user"]["id"] == second.json()["user"]["id"]
        assert db.query(User).filter(User.email == google_identity.email).count() == 1

    def test_oauth_unsupported_provider(self, client):
        with patch(
            "utils.oauth_verify.verify_oauth_id_token",
            side_effect=OAuthVerificationError("Unsupported OAuth provider: facebook"),
        ):
            response = client.post(
                "/api/auth/oauth",
                json={"provider": "facebook", "id_token": "x"},
            )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_oauth_bad_token(self, client):
        with patch(
            "utils.oauth_verify.verify_oauth_id_token",
            side_effect=OAuthVerificationError("Invalid Google ID token"),
        ):
            response = client.post(
                "/api/auth/oauth",
                json={"provider": "google", "id_token": "bad"},
            )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_oauth_missing_email_on_create(self, client):
        identity = VerifiedOAuthIdentity(
            provider="apple",
            provider_user_id="apple-sub-1",
            email=None,
            full_name=None,
            email_verified=False,
        )
        with patch(
            "utils.oauth_verify.verify_oauth_id_token",
            return_value=identity,
        ):
            response = client.post(
                "/api/auth/oauth",
                json={"provider": "apple", "id_token": "apple-token"},
            )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.json()["detail"].lower()
