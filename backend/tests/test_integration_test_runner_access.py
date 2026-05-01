from fastapi import status

from config import Config


def test_integration_test_runner_list_admin_when_enabled(client, auth_headers, monkeypatch):
    monkeypatch.setattr(Config, "ENABLE_ADMIN_TEST_RUNNER", True)
    response = client.get("/api/admin/integration-tests/", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "tests" in data
    assert isinstance(data["tests"], list)
    assert len(data["tests"]) > 0


def test_integration_test_runner_list_forbidden_for_non_admin(client, non_admin_auth_headers, monkeypatch):
    monkeypatch.setattr(Config, "ENABLE_ADMIN_TEST_RUNNER", True)
    response = client.get("/api/admin/integration-tests/", headers=non_admin_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_integration_test_runner_hidden_when_disabled(client, auth_headers, monkeypatch):
    monkeypatch.setattr(Config, "ENABLE_ADMIN_TEST_RUNNER", False)
    response = client.get("/api/admin/integration-tests/", headers=auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
