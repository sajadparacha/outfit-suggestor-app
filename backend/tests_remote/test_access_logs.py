import httpx


def test_access_logs_list(client: httpx.Client, auth_headers: dict):
    resp = client.get(
        "/api/access-logs/",
        params={"limit": 10},
        headers=auth_headers,
    )
    resp.raise_for_status()
    data = resp.json()
    assert "total" in data
    assert "logs" in data
    assert isinstance(data["logs"], list)


def test_access_logs_usage(client: httpx.Client, auth_headers: dict):
    resp = client.get("/api/access-logs/usage", headers=auth_headers)
    resp.raise_for_status()
    data = resp.json()
    # Shape is flexible; just ensure it is JSON object
    assert isinstance(data, dict)

