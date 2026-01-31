import httpx


def test_auth_me(client: httpx.Client, auth_headers: dict):
    resp = client.get("/api/auth/me", headers=auth_headers)
    resp.raise_for_status()
    data = resp.json()
    assert "id" in data
    assert "email" in data
    assert data.get("is_active") in (True, False)

