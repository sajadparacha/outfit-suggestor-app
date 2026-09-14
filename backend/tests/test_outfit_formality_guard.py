"""Tests for Week Planner / wardrobe-only formality guard."""
from types import SimpleNamespace

from models.outfit import OutfitSuggestion
from services.ai_service import AIService
from services.outfit_formality_guard import (
    SHOE_GAP_COPY,
    apply_formality_post_check,
    filter_wardrobe_slots_for_formality,
    requires_formality_guard,
)


def _item(item_id: int, category: str, description: str):
    return SimpleNamespace(
        id=item_id,
        category=category,
        name=None,
        description=description,
        color="black",
        tags=None,
        brand=None,
    )


def test_requires_formality_for_work_and_classic():
    assert requires_formality_guard(occasion="work", style="casual")
    assert requires_formality_guard(occasion="casual", style="classic")
    assert requires_formality_guard(occasion="formal", style="elegant")
    assert not requires_formality_guard(occasion="casual", style="casual")


def test_filter_drops_athletic_shoes_and_joggers_for_work():
    wardrobe = {
        "shoes": [
            _item(1, "shoes", "white athletic sneakers"),
            _item(2, "shoes", "brown leather loafers"),
        ],
        "trouser": [
            _item(3, "trouser", "navy joggers"),
            _item(4, "trouser", "charcoal tailored trousers"),
        ],
        "shirt": [_item(5, "shirt", "white oxford")],
    }
    filtered = filter_wardrobe_slots_for_formality(
        wardrobe, occasion="work", style="classic"
    )
    shoe_ids = {i.id for i in filtered["shoes"]}
    trouser_ids = {i.id for i in filtered["trouser"]}
    assert shoe_ids == {2}
    assert trouser_ids == {4}
    assert filtered["shirt"][0].id == 5


def test_filter_keeps_sneakers_for_casual_occasion():
    wardrobe = {
        "shoes": [_item(1, "shoes", "running shoes")],
        "trouser": [_item(2, "trouser", "black sweatpants")],
    }
    filtered = filter_wardrobe_slots_for_formality(
        wardrobe, occasion="casual", style="casual"
    )
    assert {i.id for i in filtered["shoes"]} == {1}
    assert {i.id for i in filtered["trouser"]} == {2}


def test_filter_preserves_pinned_athletic_shoe():
    wardrobe = {
        "shoes": [
            _item(1, "shoes", "gym sneakers"),
            _item(2, "shoes", "derby shoes"),
        ]
    }
    filtered = filter_wardrobe_slots_for_formality(
        wardrobe, occasion="business", style="formal", protect_ids={1}
    )
    assert {i.id for i in filtered["shoes"]} == {1, 2}


def test_post_check_replaces_sneaker_with_gap_on_blazer_look():
    suggestion = OutfitSuggestion(
        shirt="White shirt",
        trouser="Navy trousers",
        blazer="Navy structured blazer",
        shoes="White athletic sneakers",
        belt="Black belt",
        reasoning="test",
        shoes_id=99,
        blazer_id=7,
    )
    matching = {"shoes": [{"id": 99, "description": "athletic sneakers"}]}
    apply_formality_post_check(
        suggestion,
        matching,
        occasion="work",
        style="classic",
    )
    assert suggestion.shoes == SHOE_GAP_COPY
    assert suggestion.shoes_id is None
    assert "shoes" not in matching


def test_post_check_preserves_pinned_sneaker():
    suggestion = OutfitSuggestion(
        shirt="White shirt",
        trouser="Navy trousers",
        blazer="Navy blazer",
        shoes="White sneakers",
        belt="Black belt",
        reasoning="test",
        shoes_id=42,
        blazer_id=7,
    )
    apply_formality_post_check(
        suggestion,
        {},
        occasion="work",
        style="classic",
        protect_ids={42},
    )
    assert suggestion.shoes_id == 42
    assert "sneaker" in suggestion.shoes.lower() or "White sneakers" in suggestion.shoes


def test_wardrobe_only_formal_prompt_includes_formality_hard_rule():
    ai = AIService(api_key="test-key")
    item = _item(1, "shoes", "brown loafers")
    prompt = ai._build_prompt(  # type: ignore[attr-defined]
        text_input="Occasion: work, Season: all-season, Style: classic",
        wardrobe_items={"shoes": [item]},
        wardrobe_only=True,
    )
    assert "FORMALITY HARD RULE" in prompt
    assert "athletic sneakers" in prompt.lower() or "sneakers" in prompt.lower()


def test_casual_prompt_omits_formality_hard_rule():
    ai = AIService(api_key="test-key")
    item = _item(1, "shoes", "white sneakers")
    prompt = ai._build_prompt(  # type: ignore[attr-defined]
        text_input="Occasion: casual, Season: summer, Style: casual",
        wardrobe_items={"shoes": [item]},
        wardrobe_only=True,
    )
    assert "FORMALITY HARD RULE" not in prompt
