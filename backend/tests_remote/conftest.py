import os
from dataclasses import dataclass
from io import BytesIO
from typing import Dict

import pytest
import httpx
from PIL import Image


def _require_env(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise RuntimeError(f"Missing required env var: {name}")
    return val


@pytest.fixture(scope="session")
def api_base_url() -> str:
    # Example: https://web-production-dfcf8.up.railway.app
    url = _require_env("API_BASE_URL").strip().rstrip("/")
    if not (url.startswith("http://") or url.startswith("https://")):
        raise RuntimeError("API_BASE_URL must start with http:// or https://")
    return url


@pytest.fixture(scope="session")
def test_username() -> str:
    return _require_env("TEST_USERNAME")


@pytest.fixture(scope="session")
def test_password() -> str:
    return _require_env("TEST_PASSWORD")


@pytest.fixture(scope="session")
def client(api_base_url: str) -> httpx.Client:
    # Keep timeouts reasonable; Railway cold starts can be slow.
    timeout = httpx.Timeout(connect=20.0, read=60.0, write=60.0, pool=20.0)
    with httpx.Client(base_url=api_base_url, timeout=timeout, follow_redirects=True) as c:
        yield c


@pytest.fixture(scope="session")
def auth_token(client: httpx.Client, test_username: str, test_password: str) -> str:
    # OAuth2PasswordRequestForm expects form-urlencoded with username/password keys.
    resp = client.post(
        "/api/auth/login",
        data={"username": test_username, "password": test_password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise RuntimeError("Login succeeded but access_token missing from response.")
    return token


@pytest.fixture(scope="session")
def auth_headers(auth_token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def sample_image_file_bytes() -> bytes:
    """Create a small JPEG for upload tests."""
    img = Image.new("RGB", (100, 100), color="red")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def sample_image_upload(sample_image_file_bytes: bytes):
    """httpx-compatible multipart tuple: (filename, bytes, content_type)."""
    return ("test_image.jpg", sample_image_file_bytes, "image/jpeg")


@pytest.fixture(scope="session")
def run_ai_tests() -> bool:
    return os.getenv("RUN_AI_TESTS", "").strip() in {"1", "true", "yes", "on"}

