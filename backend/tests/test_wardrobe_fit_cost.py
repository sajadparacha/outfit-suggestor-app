"""Admin-only AI cost on POST /api/wardrobe/evaluate-fit ("How this fits")."""

import json
from collections import OrderedDict
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import status

from config import get_wardrobe_controller
from controllers.wardrobe_controller import WardrobeController
from main import app
from models.wardrobe import WardrobeItem
from services.wardrobe_ai_service import WardrobeAIService
from services.wardrobe_service import WardrobeService
from utils.cost_calculator import CostCalculator

USAGE = {
    "model": "gpt-4o-mini",
    "input_tokens": 1000,
    "output_tokens": 200,
    "gpt4_cost": 0.00027,
    "total_cost": 0.00027,
    "cached": False,
}


class TestCalculateChatCost:
    def test_gpt4o_mini_pricing(self):
        # 1M input * $0.15 + 1M output * $0.60
        assert CostCalculator.calculate_chat_cost("gpt-4o-mini", 1_000_000, 1_000_000) == 0.75

    def test_unknown_model_falls_back_to_gpt4o(self):
        assert CostCalculator.calculate_chat_cost("mystery", 1_000_000, 0) == 2.5

    def test_zero_tokens_is_free(self):
        assert CostCalculator.calculate_chat_cost("gpt-4o-mini", 0, 0) == 0.0


def _service(content, usage):
    service = WardrobeAIService.__new__(WardrobeAIService)
    service.fit_model = "gpt-4o-mini"
    service.fit_timeout_seconds = 5
    service._fit_cache = OrderedDict()
    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=usage,
    )
    create = MagicMock(return_value=response)
    client = MagicMock()
    client.with_options.return_value.chat.completions.create = create
    service.client = client
    return service, create


class TestRankPairingsWithUsage:
    CANDIDATE = {"category": "jacket", "color": "Black", "description": "Jacket"}
    OWNED = [{"id": 2, "category": "shirt", "color": "White", "description": "Oxford"}]
    GOAL = {"label": "business-casual"}

    def test_reports_tokens_and_cost(self):
        service, _ = _service(
            json.dumps({"scores": {"2": 8}}),
            SimpleNamespace(prompt_tokens=1000, completion_tokens=200),
        )
        pairs, usage = service.rank_pairings_with_usage(self.CANDIDATE, self.OWNED, self.GOAL)
        assert pairs == [{"id": 2, "score": 8.0, "reason": None}]
        assert usage == USAGE

    def test_cache_hit_is_free_and_flagged(self):
        service, create = _service(
            json.dumps({"scores": {"2": 8}}),
            SimpleNamespace(prompt_tokens=1000, completion_tokens=200),
        )
        service.rank_pairings_with_usage(self.CANDIDATE, self.OWNED, self.GOAL)
        _, usage = service.rank_pairings_with_usage(self.CANDIDATE, self.OWNED, self.GOAL)
        assert create.call_count == 1
        assert usage["cached"] is True
        assert usage["total_cost"] == 0.0
        assert usage["input_tokens"] == 0

    def test_missing_usage_reports_zero(self):
        service, _ = _service(json.dumps({"scores": {"2": 8}}), None)
        _, usage = service.rank_pairings_with_usage(self.CANDIDATE, self.OWNED, self.GOAL)
        assert usage["total_cost"] == 0.0
        assert usage["cached"] is False

    def test_rank_pairings_still_returns_pairs_only(self):
        service, _ = _service(
            json.dumps({"scores": {"2": 8}}),
            SimpleNamespace(prompt_tokens=10, completion_tokens=5),
        )
        assert service.rank_pairings(self.CANDIDATE, self.OWNED, self.GOAL) == [
            {"id": 2, "score": 8.0, "reason": None}
        ]


class _UsageReportingAIService:
    def extract_item_properties(self, image_base64):
        return {"category": "shirt", "color": "red", "description": "mock", "model_used": "mock"}

    def rank_pairings_with_usage(self, candidate, owned_items, goal):
        pairs = [
            {"id": o["id"], "score": 8, "reason": "pairs well"}
            for o in owned_items
            if o["category"] == "shirt"
        ]
        return pairs, dict(USAGE)


class _FailingAIService(_UsageReportingAIService):
    def rank_pairings_with_usage(self, candidate, owned_items, goal):
        raise TimeoutError("AI timed out")


def _seed(db, user_id):
    jacket = WardrobeItem(user_id=user_id, category="jacket", color="Black", description="Jacket")
    db.add_all(
        [
            jacket,
            WardrobeItem(user_id=user_id, category="shirt", color="White", description="Oxford"),
        ]
    )
    db.commit()
    db.refresh(jacket)
    return jacket


@pytest.fixture
def usage_controller():
    app.dependency_overrides[get_wardrobe_controller] = lambda: WardrobeController(
        WardrobeService(), _UsageReportingAIService()
    )
    yield
    app.dependency_overrides.pop(get_wardrobe_controller, None)


class TestEvaluateFitAdminCost:
    def test_admin_gets_ai_cost(self, client, auth_headers, db, test_user, usage_controller):
        jacket = _seed(db, test_user.id)
        response = client.post(
            "/api/wardrobe/evaluate-fit", headers=auth_headers, json={"wardrobe_item_id": jacket.id}
        )
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload["ranking_source"] == "ai"
        assert payload["cost"] == USAGE

    def test_non_admin_gets_no_cost(
        self, client, non_admin_auth_headers, db, test_user2, usage_controller
    ):
        jacket = _seed(db, test_user2.id)
        response = client.post(
            "/api/wardrobe/evaluate-fit",
            headers=non_admin_auth_headers,
            json={"wardrobe_item_id": jacket.id},
        )
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload["ranking_source"] == "ai"
        assert payload["cost"] is None

    def test_admin_rules_fallback_reports_zero_cost(self, client, auth_headers, db, test_user):
        app.dependency_overrides[get_wardrobe_controller] = lambda: WardrobeController(
            WardrobeService(), _FailingAIService()
        )
        try:
            jacket = _seed(db, test_user.id)
            response = client.post(
                "/api/wardrobe/evaluate-fit",
                headers=auth_headers,
                json={"wardrobe_item_id": jacket.id},
            )
        finally:
            app.dependency_overrides.pop(get_wardrobe_controller, None)
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload["ranking_source"] == "rules"
        assert payload["cost"]["total_cost"] == 0.0
        assert payload["cost"]["cached"] is False

    def test_admin_attribute_candidate_gets_cost(
        self, client, auth_headers, db, test_user, usage_controller
    ):
        _seed(db, test_user.id)
        response = client.post(
            "/api/wardrobe/evaluate-fit",
            headers=auth_headers,
            json={"category": "jacket", "color": "Navy"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["cost"] == USAGE
