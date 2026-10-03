"""AI-ranked pairings for "How this fits" (rules prefilter → AI rank → validate → fallback)."""

import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import status

from config import get_wardrobe_controller
from controllers.wardrobe_controller import WardrobeController
from main import app
from models.wardrobe import WardrobeItem
from services.wardrobe_ai_service import WardrobeAIService
from services.wardrobe_fit_service import WardrobeFitService
from services.wardrobe_service import WardrobeService


def _item(id_, category, color, description=""):
    return WardrobeItem(id=id_, user_id=1, category=category, color=color, description=description)


class _RecordingRanker:
    def __init__(self, response=None, error=None):
        self.response = response or []
        self.error = error
        self.calls = []

    def __call__(self, candidate, owned_items, goal):
        self.calls.append({"candidate": candidate, "owned": owned_items, "goal": goal})
        if self.error:
            raise self.error
        return self.response


class TestFitServiceAiRanking:
    def test_ai_pairs_replace_rule_pairs_and_counts_come_from_valid_ids(self):
        cand = _item(1, "jacket", "Black", "Work jacket")
        items = [
            _item(2, "shirt", "White", "Oxford shirt"),
            _item(3, "shirt", "Gray", "Shirt"),
            _item(4, "trouser", "Navy", "Chinos"),
            _item(5, "shoes", "Black", "Leather shoes"),
        ]
        ranker = _RecordingRanker(
            [
                {"id": 2, "score": 9, "reason": "Crisp white contrasts the black"},
                {"id": 4, "score": 7, "reason": "Navy chinos keep it smart"},
                {"id": 999, "score": 10, "reason": "Invented item"},
                {"id": 2, "score": 8, "reason": "Duplicate"},
            ]
        )
        result = WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=ranker
        )

        assert result["ranking_source"] == "ai"
        by_cat = {r["category"]: r for r in result["pairs_with"]}
        assert set(by_cat) == {"shirt", "trouser"}
        assert by_cat["shirt"]["count"] == 1
        assert by_cat["shirt"]["items"][0]["id"] == 2
        assert by_cat["shirt"]["items"][0]["reason"] == "Crisp white contrasts the black"
        assert by_cat["trouser"]["count"] == 1
        assert result["outfit_multiplier"] == 2
        assert "one shirt and one pair of trousers" in result["summary_text"]

    def test_prefilter_excludes_same_slot_and_hard_clashes_from_ai(self):
        cand = _item(1, "blazer", "Black", "Formal tailored business suit blazer")
        items = [
            _item(2, "blazer", "Navy", "Blazer"),
            _item(3, "shirt", "White", "Casual graphic sport hoodie"),
            _item(4, "shirt", "White", "Oxford dress shirt"),
            _item(5, "shorts", "Khaki", "Shorts"),
        ]
        ranker = _RecordingRanker([])
        WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=ranker
        )

        sent_ids = {o["id"] for o in ranker.calls[0]["owned"]}
        assert sent_ids == {4}
        assert ranker.calls[0]["goal"]["label"] == "business-casual"

    def test_ai_empty_pairs_is_respected(self):
        cand = _item(1, "jacket", "Black", "Jacket")
        items = [_item(2, "shirt", "White", "Shirt")]
        result = WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=_RecordingRanker([])
        )
        assert result["ranking_source"] == "ai"
        assert result["pairs_with"] == []
        assert result["outfit_multiplier"] == 0

    def test_ranker_error_falls_back_to_rules(self):
        cand = _item(1, "jacket", "Black", "Jacket")
        items = [_item(2, "shirt", "White", "Shirt"), _item(3, "trouser", "Gray", "Trouser")]
        ranker = _RecordingRanker(error=TimeoutError("slow"))
        with_ai = WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=ranker
        )
        rules = WardrobeFitService().evaluate(candidate=cand, wardrobe_items=[cand] + items)

        assert with_ai["ranking_source"] == "rules"
        assert with_ai["pairs_with"] == rules["pairs_with"]

    def test_no_eligible_items_skips_ai_call(self):
        cand = _item(1, "shirt", "White", "Shirt")
        items = [_item(2, "shirt", "Blue", "Shirt")]
        ranker = _RecordingRanker([{"id": 2, "score": 9}])
        result = WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=ranker
        )
        assert ranker.calls == []
        assert result["pairs_with"] == []

    def test_scores_below_pair_threshold_are_not_strong_pairs(self):
        cand = _item(1, "jacket", "Black", "Jacket")
        items = [
            _item(2, "shirt", "White", "Shirt"),
            _item(3, "shirt", "Blue", "Shirt"),
            _item(4, "shirt", "Gray", "Shirt"),
        ]
        ranker = _RecordingRanker(
            [{"id": 2, "score": 6}, {"id": 3, "score": 5}, {"id": 4, "score": 2}]
        )
        result = WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=ranker
        )
        shirt = next(r for r in result["pairs_with"] if r["category"] == "shirt")
        assert shirt["count"] == 1
        assert shirt["items"][0]["id"] == 2
        assert shirt["items"][0]["weak_match"] is False

    def test_owned_category_without_strong_pair_shows_best_as_weak_match(self):
        cand = _item(1, "jacket", "Black", "Overshirt jacket")
        items = [
            _item(2, "shirt", "White", "Shirt"),
            _item(3, "shoes", "Navy", "Running sneakers"),
            _item(4, "shoes", "Black", "Casual sneakers"),
        ]
        ranker = _RecordingRanker(
            [
                {"id": 2, "score": 8},
                {"id": 3, "score": 3, "reason": "Sporty, a bit casual"},
                {"id": 4, "score": 4, "reason": "Clean black works casually"},
            ]
        )
        result = WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=ranker
        )
        shoes = next(r for r in result["pairs_with"] if r["category"] == "shoes")
        assert shoes["count"] == 1
        assert shoes["items"][0]["id"] == 4
        assert shoes["items"][0]["weak_match"] is True
        assert shoes["items"][0]["reason"] == "Clean black works casually"

    def test_category_hidden_when_best_is_below_weak_floor(self):
        cand = _item(1, "jacket", "Black", "Jacket")
        items = [_item(2, "shirt", "White", "Shirt"), _item(3, "shoes", "Red", "Shoes")]
        ranker = _RecordingRanker([{"id": 2, "score": 8}, {"id": 3, "score": 2}])
        result = WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=ranker
        )
        assert [r["category"] for r in result["pairs_with"]] == ["shirt"]

    def test_logs_sent_and_kept_per_category(self, capsys):
        cand = _item(1, "jacket", "Black", "Jacket")
        items = [_item(2, "shirt", "White", "Shirt"), _item(3, "shoes", "Black", "Shoes")]
        ranker = _RecordingRanker([{"id": 2, "score": 8}, {"id": 3, "score": 4}, {"id": 77, "score": 9}])
        WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=ranker
        )
        out = capsys.readouterr().out
        assert "[fit-ai] jacket" in out
        assert "'shoes': 1" in out
        assert "dropped_ids=[77]" in out
        assert "weak" in out

    def test_category_with_more_than_three_pairs_returns_all_best_first(self):
        cand = _item(1, "jacket", "Black", "Jacket")
        items = [_item(i, "shirt", "White", f"Shirt {i}") for i in range(2, 7)]
        ranker = _RecordingRanker(
            [
                {"id": 2, "score": 7},
                {"id": 3, "score": 9},
                {"id": 4, "score": 8},
                {"id": 5, "score": 10},
                {"id": 6, "score": 7.5},
            ]
        )
        result = WardrobeFitService().evaluate(
            candidate=cand, wardrobe_items=[cand] + items, pair_ranker=ranker
        )
        shirt = next(r for r in result["pairs_with"] if r["category"] == "shirt")
        assert shirt["count"] == 5
        assert len(shirt["items"]) == shirt["count"]
        assert [i["id"] for i in shirt["items"]] == [5, 3, 4, 6, 2]

    def test_rules_category_with_more_than_three_pairs_returns_all(self):
        cand = _item(1, "jacket", "Black", "Jacket")
        items = [_item(i, "shirt", "White", "Shirt") for i in range(2, 7)]
        result = WardrobeFitService().evaluate(candidate=cand, wardrobe_items=[cand] + items)
        shirt = next(r for r in result["pairs_with"] if r["category"] == "shirt")
        assert shirt["count"] == 5
        assert len(shirt["items"]) == 5

    def test_without_ranker_source_is_rules(self):
        cand = _item(1, "jacket", "Black", "Jacket")
        result = WardrobeFitService().evaluate(candidate=cand, wardrobe_items=[cand])
        assert result["ranking_source"] == "rules"


def kwargs_system_prompt(create_mock):
    return create_mock.call_args.kwargs["messages"][0]["content"]


def _fake_openai_response(content):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


def _service_with_mock_client(content):
    service = WardrobeAIService.__new__(WardrobeAIService)
    service.fit_model = "gpt-4o-mini"
    service.fit_timeout_seconds = 5
    from collections import OrderedDict

    service._fit_cache = OrderedDict()
    create = MagicMock(return_value=_fake_openai_response(content))
    client = MagicMock()
    client.with_options.return_value.chat.completions.create = create
    service.client = client
    return service, create


class TestWardrobeAIServiceRankPairings:
    CANDIDATE = {"category": "jacket", "color": "Black", "description": "Jacket", "image_data": "xx"}
    OWNED = [
        {"id": 2, "category": "shirt", "color": "White", "description": "Oxford"},
        {"id": 3, "category": "trouser", "color": "Navy", "description": "Chinos"},
    ]
    GOAL = {"label": "business-casual"}

    def test_parses_all_scores_and_skips_bad_rows(self):
        content = json.dumps(
            {
                "pairs": [
                    {"id": 2, "score": 8, "reason": "Classic contrast"},
                    {"id": 3, "score": 4, "reason": "Possible"},
                    {"id": "nope", "score": 9},
                    "garbage",
                ]
            }
        )
        service, create = _service_with_mock_client(content)
        pairs = service.rank_pairings(self.CANDIDATE, self.OWNED, self.GOAL)

        assert pairs == [
            {"id": 2, "score": 8.0, "reason": "Classic contrast"},
            {"id": 3, "score": 4.0, "reason": "Possible"},
        ]
        assert "EVERY owned item" in kwargs_system_prompt(create)
        kwargs = create.call_args.kwargs
        assert kwargs["model"] == "gpt-4o-mini"
        assert kwargs["response_format"] == {"type": "json_object"}
        user_msg = kwargs["messages"][1]["content"]
        assert "image_data" not in user_msg
        service.client.with_options.assert_called_with(timeout=5, max_retries=0)

    def test_parses_compact_scores_format(self):
        content = json.dumps(
            {
                "scores": {"2": 8, "3": 2, "x": 9},
                "reasons": {"2": "Clean contrast"},
            }
        )
        service, _ = _service_with_mock_client(content)
        pairs = service.rank_pairings(self.CANDIDATE, self.OWNED, self.GOAL)
        assert pairs == [
            {"id": 2, "score": 8.0, "reason": "Clean contrast"},
            {"id": 3, "score": 2.0, "reason": None},
        ]

    def test_caches_identical_requests(self):
        service, create = _service_with_mock_client(json.dumps({"pairs": []}))
        service.rank_pairings(self.CANDIDATE, self.OWNED, self.GOAL)
        service.rank_pairings(self.CANDIDATE, self.OWNED, self.GOAL)
        assert create.call_count == 1

    def test_missing_pairs_key_raises(self):
        service, _ = _service_with_mock_client(json.dumps({"result": []}))
        with pytest.raises(ValueError):
            service.rank_pairings(self.CANDIDATE, self.OWNED, self.GOAL)


class _AiRankingWardrobeAIService:
    def extract_item_properties(self, image_base64):
        return {"category": "shirt", "color": "red", "description": "mock", "model_used": "mock"}

    def rank_pairings(self, candidate, owned_items, goal):
        return [
            {"id": o["id"], "score": 8, "reason": f"pairs with {o['category']}"}
            for o in owned_items
            if o["category"] == "shirt"
        ]


class TestEvaluateFitEndpointAiRanking:
    def test_endpoint_returns_ai_ranked_pairs_with_reasons(self, client, auth_headers, db, test_user):
        app.dependency_overrides[get_wardrobe_controller] = lambda: WardrobeController(
            WardrobeService(), _AiRankingWardrobeAIService()
        )
        jacket = WardrobeItem(user_id=test_user.id, category="jacket", color="Black", description="Jacket")
        db.add_all(
            [
                jacket,
                WardrobeItem(user_id=test_user.id, category="shirt", color="White", description="Oxford"),
                WardrobeItem(user_id=test_user.id, category="trouser", color="Gray", description="Wool"),
            ]
        )
        db.commit()
        db.refresh(jacket)

        response = client.post(
            "/api/wardrobe/evaluate-fit",
            headers=auth_headers,
            json={"wardrobe_item_id": jacket.id},
        )
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload["ranking_source"] == "ai"
        assert [r["category"] for r in payload["pairs_with"]] == ["shirt"]
        assert payload["pairs_with"][0]["items"][0]["reason"] == "pairs with shirt"

    def test_endpoint_without_ranker_uses_rules(self, client, auth_headers, db, test_user):
        jacket = WardrobeItem(user_id=test_user.id, category="jacket", color="Black", description="Jacket")
        db.add(jacket)
        db.commit()
        db.refresh(jacket)
        response = client.post(
            "/api/wardrobe/evaluate-fit",
            headers=auth_headers,
            json={"wardrobe_item_id": jacket.id},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["ranking_source"] == "rules"
