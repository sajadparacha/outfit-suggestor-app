import pytest
import httpx


def test_health(client: httpx.Client):
    resp = client.get("/health")
    resp.raise_for_status()
    data = resp.json()
    assert data.get("status") == "healthy"


def test_openapi_served(client: httpx.Client):
    resp = client.get("/openapi.json")
    resp.raise_for_status()
    data = resp.json()
    assert "openapi" in data
    assert "paths" in data

