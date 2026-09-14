"""Tests for error event ingest and admin APIs."""
from fastapi import status

from models.error_event import ErrorEvent
from error_solutions import lookup_solution


class TestErrorSolutions:
    def test_known_code(self):
        sol = lookup_solution("guest_limit_reached")
        assert "limit" in sol["cause"].lower()
        assert sol["solution"]

    def test_http_status_alias(self):
        sol = lookup_solution("500")
        assert "server" in sol["cause"].lower()

    def test_default_fallback(self):
        sol = lookup_solution("totally_unknown_xyz")
        assert "Unrecognized" in sol["cause"]


class TestErrorEventEndpoints:
    def test_admin_list_unauthorized(self, client):
        response = client.get("/api/admin/error-events")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_list_forbidden_non_admin(self, client, non_admin_auth_headers):
        response = client.get("/api/admin/error-events", headers=non_admin_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_client_ingest_and_admin_list_with_solution(self, client, auth_headers, db):
        ingest = client.post(
            "/api/error-events",
            json={
                "error_code": "client_render_error",
                "message": "Cannot read properties of undefined",
                "stack": "Error: boom\n    at Foo",
                "route": "/wardrobe",
                "platform": "web",
                "context": {"label": "Wardrobe", "password": "secret"},
            },
        )
        assert ingest.status_code == status.HTTP_201_CREATED
        body = ingest.json()
        assert "id" in body
        assert "fingerprint" in body

        listed = client.get("/api/admin/error-events", headers=auth_headers)
        assert listed.status_code == status.HTTP_200_OK
        data = listed.json()
        assert data["total"] >= 1
        match = next(e for e in data["events"] if e["id"] == body["id"])
        assert match["source"] == "client"
        assert match["error_code"] == "client_render_error"
        assert match["suggested_cause"]
        assert match["suggested_solution"]
        assert "render" in match["suggested_cause"].lower()
        # secrets redacted in stored context
        stored = db.query(ErrorEvent).filter(ErrorEvent.id == body["id"]).first()
        assert stored is not None
        assert stored.context_json is not None
        assert "secret" not in stored.context_json
        assert "[redacted]" in stored.context_json

    def test_admin_get_detail_and_resolve(self, client, auth_headers):
        ingest = client.post(
            "/api/error-events",
            json={
                "error_code": "network_error",
                "message": "Failed to fetch",
                "route": "/admin/reports",
            },
        )
        event_id = ingest.json()["id"]

        detail = client.get(f"/api/admin/error-events/{event_id}", headers=auth_headers)
        assert detail.status_code == status.HTTP_200_OK
        payload = detail.json()
        assert payload["id"] == event_id
        assert "API" in payload["suggested_cause"] or "reach" in payload["suggested_cause"].lower()
        assert payload["resolved"] is False

        resolved = client.patch(
            f"/api/admin/error-events/{event_id}/resolved?resolved=true",
            headers=auth_headers,
        )
        assert resolved.status_code == status.HTTP_200_OK
        assert resolved.json()["resolved"] is True
        assert resolved.json()["resolved_at"] is not None

    def test_api_http_exception_creates_event(self, client, db):
        before = db.query(ErrorEvent).count()
        response = client.get("/api/access-logs/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        after = db.query(ErrorEvent).count()
        assert after >= before + 1
        latest = db.query(ErrorEvent).order_by(ErrorEvent.id.desc()).first()
        assert latest.source == "api"
        assert latest.error_code == "http_401"
        assert latest.status_code == 401

    def test_summary_endpoint(self, client, auth_headers):
        client.post(
            "/api/error-events",
            json={"error_code": "api_client_error", "message": "HTTP 500"},
        )
        response = client.get("/api/admin/error-events/summary", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "by_code" in data
        assert isinstance(data["by_code"], list)

    def test_filter_by_source(self, client, auth_headers):
        client.post(
            "/api/error-events",
            json={"error_code": "network_error", "message": "offline"},
        )
        response = client.get(
            "/api/admin/error-events?source=client",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        for event in response.json()["events"]:
            assert event["source"] == "client"

    def test_client_ingest_attributes_expired_token_user(self, client, auth_headers, test_user, db):
        from datetime import timedelta

        from utils.auth import create_access_token

        expired = create_access_token(
            {"sub": str(test_user.id)},
            expires_delta=timedelta(minutes=-5),
        )
        ingest = client.post(
            "/api/error-events",
            headers={"Authorization": f"Bearer {expired}"},
            json={
                "error_code": "api_client_error",
                "message": "Could not validate credentials",
                "status_code": 401,
                "endpoint": "/api/wardrobe/summary",
            },
        )
        assert ingest.status_code == status.HTTP_201_CREATED
        event_id = ingest.json()["id"]
        stored = db.query(ErrorEvent).filter(ErrorEvent.id == event_id).first()
        assert stored is not None
        assert stored.user_id == test_user.id

        detail = client.get(f"/api/admin/error-events/{event_id}", headers=auth_headers)
        assert detail.status_code == status.HTTP_200_OK
        payload = detail.json()
        assert payload["user_id"] == test_user.id
        assert payload["user_email"] == test_user.email
