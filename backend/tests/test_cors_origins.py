"""CORS allowed-origin coverage for web clients."""
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://closiq.me",
        "https://www.closiq.me",
    ],
)
def test_cors_preflight_allows_common_web_origins(client: TestClient, origin: str):
    response = client.options(
        "/api/access-logs/stats",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
