"""Unit tests for Google token verification (JWT id_token and OAuth access_token)."""
from unittest.mock import Mock, patch

import pytest

from utils.oauth_verify import OAuthVerificationError, verify_google_id_token


WEB_CLIENT_ID = "web-client.apps.googleusercontent.com"


def _tokeninfo_ok(payload: dict) -> Mock:
    response = Mock()
    response.status_code = 200
    response.json.return_value = payload
    return response


class TestVerifyGoogleIdToken:
    def test_jwt_id_token_uses_id_token_param(self):
        jwt_token = "aaa.bbb.ccc"
        payload = {
            "aud": WEB_CLIENT_ID,
            "sub": "google-sub-1",
            "email": "user@example.com",
            "email_verified": "true",
            "name": "User",
        }

        with patch("utils.oauth_verify.Config.GOOGLE_CLIENT_IDS", WEB_CLIENT_ID), patch(
            "utils.oauth_verify.requests.get", return_value=_tokeninfo_ok(payload)
        ) as get:
            identity = verify_google_id_token(jwt_token)

        get.assert_called_once()
        assert get.call_args.kwargs["params"] == {"id_token": jwt_token}
        assert identity.provider_user_id == "google-sub-1"
        assert identity.email == "user@example.com"

    def test_access_token_uses_access_token_param_and_azp(self):
        access_token = "ya29.a0ASfakeAccessToken"
        payload = {
            "aud": "https://www.googleapis.com/oauth2/v2/tokeninfo",
            "azp": WEB_CLIENT_ID,
            "sub": "google-sub-2",
            "email": "pad@example.com",
            "email_verified": "true",
        }

        with patch("utils.oauth_verify.Config.GOOGLE_CLIENT_IDS", WEB_CLIENT_ID), patch(
            "utils.oauth_verify.requests.get", return_value=_tokeninfo_ok(payload)
        ) as get:
            identity = verify_google_id_token(access_token)

        get.assert_called_once()
        assert get.call_args.kwargs["params"] == {"access_token": access_token}
        assert identity.provider_user_id == "google-sub-2"
        assert identity.email == "pad@example.com"

    def test_audience_mismatch_rejected(self):
        with patch("utils.oauth_verify.Config.GOOGLE_CLIENT_IDS", WEB_CLIENT_ID), patch(
            "utils.oauth_verify.requests.get",
            return_value=_tokeninfo_ok({"aud": "other-client", "sub": "x"}),
        ):
            with pytest.raises(OAuthVerificationError, match="audience mismatch"):
                verify_google_id_token("aaa.bbb.ccc")
