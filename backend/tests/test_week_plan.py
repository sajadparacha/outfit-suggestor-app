"""Tests for Week Outfit Planner API."""
from unittest.mock import patch

import pytest  # noqa: F401 — pytest discovery

PLAN_URL = "/api/week-plan"
GENERATE_URL = "/api/week-plan/generate"
TODAY_URL = "/api/week-plan/today"


def _sample_plan_body(**overrides):
    body = {
        "reminder_time": "07:30",
        "timezone": "UTC",
        "shared_style": "classic",
        "shared_season": "all-season",
        "days": [
            {
                "day_of_week": 0,
                "enabled": True,
                "occasion": "work",
                "style": "classic",
                "use_wardrobe_only": True,
            },
            {
                "day_of_week": 1,
                "enabled": True,
                "occasion": "everyday",
                "style": "minimal",
                "use_wardrobe_only": True,
            },
            {
                "day_of_week": 2,
                "enabled": False,
                "occasion": "party",
                "style": "classic",
                "use_wardrobe_only": True,
            },
            {
                "day_of_week": 3,
                "enabled": False,
                "occasion": "everyday",
                "style": "classic",
                "use_wardrobe_only": True,
            },
            {
                "day_of_week": 4,
                "enabled": True,
                "occasion": "date-night",
                "style": "elegant",
                "use_wardrobe_only": True,
            },
            {
                "day_of_week": 5,
                "enabled": False,
                "occasion": "everyday",
                "style": "classic",
                "use_wardrobe_only": True,
            },
            {
                "day_of_week": 6,
                "enabled": False,
                "occasion": "lounge",
                "style": "classic",
                "use_wardrobe_only": True,
            },
        ],
    }
    body.update(overrides)
    return body


class TestWeekPlanAuth:
    def test_get_unauthorized(self, client):
        assert client.get(PLAN_URL).status_code == 401

    def test_put_unauthorized(self, client):
        assert client.put(PLAN_URL, json=_sample_plan_body()).status_code == 401

    def test_generate_unauthorized(self, client):
        assert client.post(GENERATE_URL, json={}).status_code == 401

    def test_today_unauthorized(self, client):
        assert client.get(TODAY_URL).status_code == 401

    def test_delete_unauthorized(self, client):
        assert client.delete(PLAN_URL).status_code == 401


class TestWeekPlanCrud:
    def test_get_empty_plan_defaults(self, client, auth_headers):
        res = client.get(PLAN_URL, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["reminder_time"] == "07:30"
        assert len(data["days"]) == 7
        assert all(not d["enabled"] for d in data["days"])

    def test_put_then_get_persists(self, client, auth_headers):
        put = client.put(PLAN_URL, json=_sample_plan_body(), headers=auth_headers)
        assert put.status_code == 200
        data = put.json()
        assert data["reminder_time"] == "07:30"
        enabled = [d for d in data["days"] if d["enabled"]]
        assert len(enabled) == 3
        assert data["days"][0]["occasion"] == "work"
        assert data["days"][4]["occasion"] == "date-night"

        get = client.get(PLAN_URL, headers=auth_headers)
        assert get.status_code == 200
        again = get.json()
        assert again["days"][0]["enabled"] is True
        assert again["days"][0]["occasion"] == "work"
        assert again["shared_style"] == "classic"

    def test_put_invalid_reminder_time(self, client, auth_headers):
        res = client.put(
            PLAN_URL,
            json=_sample_plan_body(reminder_time="25:99"),
            headers=auth_headers,
        )
        assert res.status_code == 400

    def test_delete_plan(self, client, auth_headers):
        client.put(PLAN_URL, json=_sample_plan_body(), headers=auth_headers)
        deleted = client.delete(PLAN_URL, headers=auth_headers)
        assert deleted.status_code == 200
        assert deleted.json()["deleted"] is True
        get = client.get(PLAN_URL, headers=auth_headers)
        assert get.status_code == 200
        assert all(not d["enabled"] for d in get.json()["days"])


class TestWeekPlanGenerate:
    def test_generate_requires_saved_plan(self, client, auth_headers, wardrobe_item):
        res = client.post(GENERATE_URL, json={}, headers=auth_headers)
        assert res.status_code == 400

    def test_generate_empty_wardrobe(self, client, auth_headers):
        client.put(PLAN_URL, json=_sample_plan_body(), headers=auth_headers)
        res = client.post(GENERATE_URL, json={}, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["wardrobe_empty"] is True
        assert "wardrobe" in (data.get("message") or "").lower()
        enabled_with_outfit = [
            d for d in data["days"] if d["enabled"] and d.get("outfit")
        ]
        assert enabled_with_outfit == []

    def test_generate_creates_outfits_for_enabled_days(
        self, client, auth_headers, wardrobe_item
    ):
        client.put(PLAN_URL, json=_sample_plan_body(), headers=auth_headers)
        res = client.post(GENERATE_URL, json={}, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data.get("wardrobe_empty") is False
        enabled = [d for d in data["days"] if d["enabled"]]
        assert len(enabled) == 3
        for day in enabled:
            assert day["outfit"] is not None
            assert day["outfit"]["shirt"]
            assert day["outfit"]["summary"]
        disabled = [d for d in data["days"] if not d["enabled"]]
        for day in disabled:
            assert day.get("outfit") is None

    def test_generate_single_day(self, client, auth_headers, wardrobe_item):
        client.put(PLAN_URL, json=_sample_plan_body(), headers=auth_headers)
        client.post(GENERATE_URL, json={}, headers=auth_headers)
        res = client.post(
            GENERATE_URL, json={"day_of_week": 0}, headers=auth_headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data["days"][0]["outfit"] is not None
        assert data["days"][1]["outfit"] is not None  # still present from full generate

    def test_generate_disabled_day_rejected(self, client, auth_headers, wardrobe_item):
        client.put(PLAN_URL, json=_sample_plan_body(), headers=auth_headers)
        res = client.post(
            GENERATE_URL, json={"day_of_week": 2}, headers=auth_headers
        )
        assert res.status_code == 400


class TestWeekPlanToday:
    def test_today_no_plan(self, client, auth_headers):
        res = client.get(TODAY_URL, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["has_plan"] is False
        assert data["enabled"] is False

    def test_today_returns_correct_weekday(self, client, auth_headers, wardrobe_item):
        body = _sample_plan_body(timezone="UTC")
        for d in body["days"]:
            d["enabled"] = d["day_of_week"] == 2
            if d["day_of_week"] == 2:
                d["occasion"] = "workout"
        client.put(PLAN_URL, json=body, headers=auth_headers)
        client.post(GENERATE_URL, json={}, headers=auth_headers)

        with patch(
            "services.week_plan_service.WeekPlanService.local_day_of_week",
            return_value=2,
        ):
            res = client.get(TODAY_URL, headers=auth_headers)

        assert res.status_code == 200
        data = res.json()
        assert data["has_plan"] is True
        assert data["day_of_week"] == 2
        assert data["enabled"] is True
        assert data["occasion"] == "workout"
        assert data["outfit"] is not None
        assert data["outfit"]["summary"]


class TestWeekPlanUseWardrobeOnly:
    def test_put_persists_use_wardrobe_only_flag(self, client, auth_headers):
        body = _sample_plan_body()
        body["days"][0]["use_wardrobe_only"] = False
        body["days"][1]["use_wardrobe_only"] = True
        put = client.put(PLAN_URL, json=body, headers=auth_headers)
        assert put.status_code == 200
        assert put.json()["days"][0]["use_wardrobe_only"] is False
        assert put.json()["days"][1]["use_wardrobe_only"] is True

        get = client.get(PLAN_URL, headers=auth_headers)
        assert get.status_code == 200
        assert get.json()["days"][0]["use_wardrobe_only"] is False
        assert get.json()["days"][1]["use_wardrobe_only"] is True

    def test_put_persists_per_day_style(self, client, auth_headers):
        body = _sample_plan_body()
        body["days"][0]["style"] = "streetwear"
        body["days"][1]["style"] = "preppy"
        put = client.put(PLAN_URL, json=body, headers=auth_headers)
        assert put.status_code == 200
        assert put.json()["days"][0]["style"] == "streetwear"
        assert put.json()["days"][1]["style"] == "preppy"
        get = client.get(PLAN_URL, headers=auth_headers)
        assert get.json()["days"][0]["style"] == "streetwear"
        assert get.json()["days"][1]["style"] == "preppy"

    def test_generate_wardrobe_only_empty_wardrobe(self, client, auth_headers):
        body = _sample_plan_body()
        for d in body["days"]:
            d["enabled"] = d["day_of_week"] == 0
            d["use_wardrobe_only"] = True
        client.put(PLAN_URL, json=body, headers=auth_headers)
        res = client.post(GENERATE_URL, json={}, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["wardrobe_empty"] is True
        assert data["days"][0].get("outfit") is None

    def test_generate_open_without_wardrobe(self, client, auth_headers):
        body = _sample_plan_body()
        for d in body["days"]:
            d["enabled"] = d["day_of_week"] == 0
            d["use_wardrobe_only"] = False
        client.put(PLAN_URL, json=body, headers=auth_headers)
        res = client.post(GENERATE_URL, json={}, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["days"][0]["outfit"] is not None
        assert data["days"][0]["outfit"]["shirt"]
        assert data.get("wardrobe_empty") is not True

    def test_generate_wardrobe_only_with_items(
        self, client, auth_headers, wardrobe_item
    ):
        body = _sample_plan_body()
        for d in body["days"]:
            d["enabled"] = d["day_of_week"] == 0
            d["use_wardrobe_only"] = True
        client.put(PLAN_URL, json=body, headers=auth_headers)
        res = client.post(GENERATE_URL, json={}, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["days"][0]["outfit"] is not None
