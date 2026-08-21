"""Verify Google and Apple ID tokens for OAuth sign-in."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import requests
from jose import JWTError, jwt

from config import Config


@dataclass
class VerifiedOAuthIdentity:
    provider: str
    provider_user_id: str
    email: Optional[str]
    full_name: Optional[str]
    email_verified: bool = True


class OAuthVerificationError(Exception):
    """Raised when a provider ID token cannot be verified."""


def _allowed_audiences(raw: str) -> list[str]:
    return [part.strip() for part in (raw or "").split(",") if part.strip()]


def _looks_like_jwt(token: str) -> bool:
    return token.count(".") == 2


def _google_audience_ok(payload: dict[str, Any], audiences: list[str]) -> bool:
    aud = payload.get("aud")
    azp = payload.get("azp")
    candidates: list[Any] = [azp]
    if isinstance(aud, list):
        candidates.extend(aud)
    else:
        candidates.append(aud)
    return any(value in audiences for value in candidates if isinstance(value, str))


def verify_google_id_token(id_token: str) -> VerifiedOAuthIdentity:
    audiences = _allowed_audiences(Config.GOOGLE_CLIENT_IDS)
    if not audiences:
        raise OAuthVerificationError("Google Sign-In is not configured")

    # GIS custom buttons on iPad/WebKit cannot overlay Google's iframe; web uses
    # oauth2 access tokens. Native iOS still sends a JWT id_token.
    token_param = "id_token" if _looks_like_jwt(id_token) else "access_token"

    try:
        response = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={token_param: id_token},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise OAuthVerificationError(f"Failed to verify Google token: {exc}") from exc

    if response.status_code != 200:
        raise OAuthVerificationError("Invalid Google ID token")

    payload: dict[str, Any] = response.json()
    if not _google_audience_ok(payload, audiences):
        raise OAuthVerificationError("Google token audience mismatch")

    sub = payload.get("sub")
    if not sub:
        raise OAuthVerificationError("Google token missing subject")

    email = payload.get("email")
    email_verified = str(payload.get("email_verified", "true")).lower() in ("true", "1")
    name = payload.get("name")

    return VerifiedOAuthIdentity(
        provider="google",
        provider_user_id=str(sub),
        email=email.lower().strip() if isinstance(email, str) and email.strip() else None,
        full_name=name if isinstance(name, str) else None,
        email_verified=email_verified,
    )


def _apple_jwks() -> dict[str, Any]:
    response = requests.get("https://appleid.apple.com/auth/keys", timeout=10)
    response.raise_for_status()
    return response.json()


def verify_apple_id_token(id_token: str) -> VerifiedOAuthIdentity:
    audiences = _allowed_audiences(Config.APPLE_CLIENT_IDS)
    if not audiences:
        raise OAuthVerificationError("Sign in with Apple is not configured")

    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError as exc:
        raise OAuthVerificationError("Invalid Apple ID token header") from exc

    kid = header.get("kid")
    if not kid:
        raise OAuthVerificationError("Apple token missing key id")

    try:
        jwks = _apple_jwks()
    except requests.RequestException as exc:
        raise OAuthVerificationError(f"Failed to fetch Apple keys: {exc}") from exc

    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        raise OAuthVerificationError("Apple signing key not found")

    try:
        payload = jwt.decode(
            id_token,
            key,
            algorithms=[header.get("alg", "RS256")],
            audience=audiences,
            issuer="https://appleid.apple.com",
            options={"verify_at_hash": False},
        )
    except JWTError as exc:
        raise OAuthVerificationError(f"Invalid Apple ID token: {exc}") from exc

    sub = payload.get("sub")
    if not sub:
        raise OAuthVerificationError("Apple token missing subject")

    email = payload.get("email")
    email_verified_raw = payload.get("email_verified", True)
    if isinstance(email_verified_raw, str):
        email_verified = email_verified_raw.lower() in ("true", "1")
    else:
        email_verified = bool(email_verified_raw)

    return VerifiedOAuthIdentity(
        provider="apple",
        provider_user_id=str(sub),
        email=email.lower().strip() if isinstance(email, str) and email.strip() else None,
        full_name=None,
        email_verified=email_verified,
    )


def verify_oauth_id_token(provider: str, id_token: str) -> VerifiedOAuthIdentity:
    normalized = (provider or "").strip().lower()
    if normalized == "google":
        return verify_google_id_token(id_token)
    if normalized == "apple":
        return verify_apple_id_token(id_token)
    raise OAuthVerificationError(f"Unsupported OAuth provider: {provider}")
