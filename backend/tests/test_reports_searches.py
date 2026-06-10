"""Tests for /api/reports/searches and outfit_history filter persistence."""
from datetime import datetime

import pytest
from fastapi import status
from sqlalchemy import text

from models.outfit import OutfitSuggestion
from services.outfit_service import OutfitService


class TestReportsSearchesEndpoint:
    def test_searches_unauthorized(self, client):
        response = client.get("/api/reports/searches")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_searches_forbidden_non_admin(self, client, non_admin_auth_headers):
        response = client.get("/api/reports/searches", headers=non_admin_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_searches_success_empty(self, client, auth_headers):
        response = client.get("/api/reports/searches", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_searches"] == 0
        assert "by_occasion" in data
        assert "by_season" in data
        assert "by_style" in data
        assert "timeline" in data
        assert "recent" in data

    def test_searches_filters_and_aggregates(self, client, auth_headers, db, test_user):
        db.execute(
            text(
                """
                INSERT INTO outfit_history
                (created_at, user_id, text_input, shirt, trouser, blazer, shoes, belt, reasoning,
                 occasion, season, style)
                VALUES
                (:created_at, :user_id, 'ctx', 's', 't', 'b', 'sh', 'be', 'r', 'business', 'summer', 'modern'),
                (:created_at2, :user_id, 'ctx', 's', 't', 'b', 'sh', 'be', 'r', 'casual', 'winter', 'classic')
                """
            ),
            {
                "created_at": datetime(2026, 6, 1, 10, 0, 0),
                "created_at2": datetime(2026, 6, 2, 10, 0, 0),
                "user_id": test_user.id,
            },
        )
        db.commit()

        response = client.get(
            "/api/reports/searches?occasion=business",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_searches"] == 1
        assert data["by_occasion"] == [{"occasion": "business", "count": 1}]
        assert len(data["recent"]) == 1
        assert data["recent"][0]["occasion"] == "business"

    def test_searches_invalid_date(self, client, auth_headers):
        response = client.get(
            "/api/reports/searches?start_date=not-a-date",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_searches_filters_by_user_email(self, client, auth_headers, db, test_user):
        db.execute(
            text(
                """
                INSERT INTO outfit_history
                (created_at, user_id, text_input, shirt, trouser, blazer, shoes, belt, reasoning,
                 occasion, season, style)
                VALUES
                (:created_at, :user_id, 'ctx', 's', 't', 'b', 'sh', 'be', 'r', 'business', 'summer', 'modern')
                """
            ),
            {
                "created_at": datetime(2026, 6, 1, 10, 0, 0),
                "user_id": test_user.id,
            },
        )
        db.commit()

        response = client.get(
            "/api/reports/searches?user=test",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_searches"] == 1
        assert data["recent"][0]["user_email"] == test_user.email


def test_save_outfit_history_persists_filter_fields(db, test_user):
    service = OutfitService()
    suggestion = OutfitSuggestion(
        shirt="White oxford shirt",
        trouser="Navy chinos",
        blazer="Grey blazer",
        shoes="Brown loafers",
        belt="Brown belt",
        reasoning="Balanced smart casual outfit.",
    )

    service.save_outfit_history(
        db=db,
        user_id=test_user.id,
        text_input="business casual",
        image_data="base64-image",
        model_image=None,
        suggestion=suggestion,
        occasion="business",
        season="summer",
        style="modern",
    )

    row = db.execute(
        text(
            """
            SELECT occasion, season, style
            FROM outfit_history
            ORDER BY id DESC
            LIMIT 1
            """
        )
    ).fetchone()
    assert row is not None
    assert row.occasion == "business"
    assert row.season == "summer"
    assert row.style == "modern"
