"""Tests for guest AI usage limits."""
import uuid

import pytest
from fastapi.testclient import TestClient

from services.guest_usage_service import GUEST_AI_LIMIT, GuestUsageService


@pytest.fixture
def guest_session_id():
    return str(uuid.uuid4())


def test_get_guest_usage_starts_at_zero(client: TestClient, guest_session_id: str):
    response = client.get(
        "/api/guest-usage",
        headers={"X-Guest-Session-Id": guest_session_id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == GUEST_AI_LIMIT
    assert data["used"] == 0
    assert data["remaining"] == GUEST_AI_LIMIT
    assert data["requires_signup"] is False


def test_guest_usage_requires_valid_session_header(client: TestClient):
    response = client.get("/api/guest-usage")
    assert response.status_code == 400


def test_guest_usage_service_records_calls(db):
    service = GuestUsageService()
    session_id = str(uuid.uuid4())
    service.record_successful_ai_call(db, session_id)
    usage = service.get_usage(db, session_id)
    assert usage["used"] == 1
    assert usage["remaining"] == GUEST_AI_LIMIT - 1


def test_guest_usage_service_blocks_after_limit(db):
    service = GuestUsageService()
    session_id = str(uuid.uuid4())
    for _ in range(GUEST_AI_LIMIT):
        service.record_successful_ai_call(db, session_id)
    with pytest.raises(Exception):
        service.assert_can_use_ai(db, session_id)
