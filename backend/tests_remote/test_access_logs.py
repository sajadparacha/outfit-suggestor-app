import httpx
import pytest


def test_access_logs_list(client: httpx.Client, auth_headers: dict):
    resp = client.get(
        "/api/access-logs/",
        params={"limit": 10},
        headers=auth_headers,
    )
    if resp.status_code == 403:
        pytest.skip("Access logs are admin-only. Provide admin TEST_USERNAME/TEST_PASSWORD to run this test.")
    resp.raise_for_status()
    data = resp.json()
    assert "total" in data
    assert "logs" in data
    assert isinstance(data["logs"], list)


def test_access_logs_usage(client: httpx.Client, auth_headers: dict):
    resp = client.get("/api/access-logs/usage", headers=auth_headers)
    if resp.status_code == 403:
        pytest.skip("Access logs are admin-only. Provide admin TEST_USERNAME/TEST_PASSWORD to run this test.")
    resp.raise_for_status()
    data = resp.json()
    # Shape is flexible; just ensure it is JSON object
    assert isinstance(data, dict)

