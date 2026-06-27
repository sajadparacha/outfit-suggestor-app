"""
Regression tests for premium wardrobe gap analysis.

The production bug was caused by reusing the generic max_tokens=1000 budget for a
large structured JSON payload, which truncated ChatGPT output and triggered the
free-analysis fallback. These tests lock in the dedicated wardrobe token budget
and the premium response contract.
"""
import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from models.wardrobe_schemas import WardrobeGapAnalysisResponse
from services.ai_service import AIService

# Observed premium payloads need ~1.2k completion tokens; default budget is 8000 for full detail.
MIN_WARDROBE_GAP_MAX_TOKENS = 6000


def _ai_service() -> AIService:
    return AIService(api_key="test-key")


def _build_full_premium_json(
    *,
    occasion: str = "casual",
    season: str = "summer",
    style: str = "casual",
) -> str:
    """Representative large premium payload (all categories + shopping lists)."""
    payload = {
        "occasion": occasion,
        "season": season,
        "style": style,
        "summaryText": "Build a versatile summer casual wardrobe starting with shirts and trousers.",
        "analysisDepth": "Premium",
        "priorityShoppingList": [
            {
                "rank": 1,
                "itemName": "white linen shirt",
                "category": "shirt",
                "priority": "High",
                "recommendedColors": ["white", "light blue"],
                "recommendedStyles": ["linen", "relaxed"],
                "reason": "Core summer top for breathable casual outfits.",
                "outfitImpact": "Unlocks most warm-weather combinations.",
                "actions": ["Add to shopping list", "Show outfit examples"],
            },
            {
                "rank": 2,
                "itemName": "khaki chino shorts",
                "category": "trouser",
                "priority": "High",
                "recommendedColors": ["khaki", "navy"],
                "recommendedStyles": ["chino", "tailored"],
                "reason": "Balances casual shirts for day-to-night looks.",
                "outfitImpact": "Adds structure without heavy fabrics.",
                "actions": ["Add to shopping list", "Show outfit examples"],
            },
            {
                "rank": 3,
                "itemName": "brown leather belt",
                "category": "belt",
                "priority": "Medium",
                "recommendedColors": ["brown"],
                "recommendedStyles": ["leather", "classic"],
                "reason": "Completes polished casual outfits.",
                "outfitImpact": "Improves proportion and finish.",
                "actions": ["Add to shopping list", "Show outfit examples"],
            },
        ],
        "categoryInsights": [
            {
                "category": "shirt",
                "missingColors": ["white", "light blue"],
                "missingStyles": ["linen", "camp collar"],
                "priority": "High",
                "whyThisMatters": "Summer heat needs breathable tops in light colors.",
                "recommendation": "Start with one white linen shirt.",
                "suggestedActions": ["Add to shopping list", "Show outfit examples"],
            },
            {
                "category": "trouser",
                "missingColors": ["khaki", "navy"],
                "missingStyles": ["chino shorts", "tailored"],
                "priority": "High",
                "whyThisMatters": "Shorts and chinos anchor most casual summer outfits.",
                "recommendation": "Add khaki chino shorts next.",
                "suggestedActions": ["Add to shopping list", "Show outfit examples"],
            },
        ],
        "analysis_by_category": {
            "shirt": {
                "category": "shirt",
                "owned_colors": ["navy"],
                "owned_styles": ["cotton"],
                "missing_colors": ["white", "light blue", "sage"],
                "missing_styles": ["linen", "camp collar", "relaxed"],
                "recommended_purchases": [
                    "White linen shirt for breathable summer days.",
                    "Light blue camp-collar shirt for casual evenings.",
                    "Sage relaxed-fit cotton shirt for weekend looks.",
                ],
                "item_count": 1,
            },
            "trouser": {
                "category": "trouser",
                "owned_colors": [],
                "owned_styles": [],
                "missing_colors": ["khaki", "navy", "olive"],
                "missing_styles": ["chino shorts", "tailored shorts", "linen"],
                "recommended_purchases": [
                    "Khaki chino shorts for everyday casual outfits.",
                    "Navy tailored shorts for smarter casual events.",
                    "Olive linen trousers for elevated summer looks.",
                ],
                "item_count": 0,
            },
            "blazer": {
                "category": "blazer",
                "owned_colors": [],
                "owned_styles": [],
                "missing_colors": ["light gray", "beige"],
                "missing_styles": ["unstructured", "linen blend"],
                "recommended_purchases": [
                    "Lightweight unstructured blazer in light gray.",
                    "Beige linen-blend blazer for dinner occasions.",
                    "Breathable half-lined blazer for warm evenings.",
                ],
                "item_count": 0,
            },
            "shoes": {
                "category": "shoes",
                "owned_colors": ["white"],
                "owned_styles": ["sneaker"],
                "missing_colors": ["tan", "navy"],
                "missing_styles": ["loafer", "espadrille", "boat shoe"],
                "recommended_purchases": [
                    "Tan suede loafers for smart-casual outfits.",
                    "Navy espadrilles for relaxed summer events.",
                    "Classic boat shoes for weekend looks.",
                ],
                "item_count": 1,
            },
            "belt": {
                "category": "belt",
                "owned_colors": [],
                "owned_styles": [],
                "missing_colors": ["brown", "tan"],
                "missing_styles": ["leather", "woven"],
                "recommended_purchases": [
                    "Brown leather belt for chinos and loafers.",
                    "Tan woven belt for shorts and camp shirts.",
                    "Reversible navy-brown belt for travel packing.",
                ],
                "item_count": 0,
            },
        },
        "overall_summary": "Build a versatile summer casual wardrobe starting with shirts and trousers.",
    }
    return json.dumps(payload)


def _install_openai_mock(ai: AIService, *, content: str, finish_reason: str = "stop"):
    captured: dict = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=content),
                    finish_reason=finish_reason,
                )
            ],
            usage=SimpleNamespace(prompt_tokens=900, completion_tokens=1180),
        )

    ai.client.chat.completions.create = fake_create  # type: ignore[method-assign]
    return captured


def test_wardrobe_gap_max_tokens_exceeds_default_chat_limit():
    ai = _ai_service()
    assert ai.max_tokens == 1000
    assert ai.wardrobe_gap_max_tokens >= MIN_WARDROBE_GAP_MAX_TOKENS
    assert ai.wardrobe_gap_max_tokens > ai.max_tokens


def test_analyze_wardrobe_gaps_requests_dedicated_token_budget():
    ai = _ai_service()
    captured = _install_openai_mock(ai, content=_build_full_premium_json())

    ai.analyze_wardrobe_gaps_with_chatgpt(
        wardrobe_items=[],
        occasion="casual",
        season="summer",
        style="casual",
        text_input="",
    )

    assert captured["max_tokens"] == ai.wardrobe_gap_max_tokens
    assert captured["max_tokens"] >= MIN_WARDROBE_GAP_MAX_TOKENS
    assert captured["max_tokens"] != ai.max_tokens
    assert captured["response_format"] == {"type": "json_object"}


def test_analyze_wardrobe_gaps_returns_premium_contract():
    ai = _ai_service()
    _install_openai_mock(ai, content=_build_full_premium_json())

    result = ai.analyze_wardrobe_gaps_with_chatgpt(
        wardrobe_items=[{"id": 1, "category": "shirt", "color": "Navy", "description": "Cotton shirt"}],
        occasion="casual",
        season="summer",
        style="casual",
        text_input="weekend looks",
    )

    assert result["analysis_mode"] == "premium"
    assert result["analysisDepth"] == "Premium"
    assert "temporarily unavailable" not in result["overall_summary"].lower()
    assert result["analysis_by_category"]["shirt"]["item_count"] == 1
    assert len(result["priorityShoppingList"]) >= 3
    assert result["ai_prompt"]
    assert result["ai_raw_response"]
    assert result["cost"]["total_cost"] > 0


def test_analyze_wardrobe_gaps_response_matches_api_schema():
    ai = _ai_service()
    _install_openai_mock(ai, content=_build_full_premium_json())

    result = ai.analyze_wardrobe_gaps_with_chatgpt(
        wardrobe_items=[],
        occasion="casual",
        season="summer",
        style="casual",
    )

    response = WardrobeGapAnalysisResponse(**result)
    assert response.analysis_mode == "premium"
    assert response.analysisDepth == "Premium"
    assert response.ai_prompt
    assert response.cost is not None


def test_analyze_wardrobe_gaps_builds_lists_when_model_omits_optional_fields():
    ai = _ai_service()
    minimal_payload = {
        "occasion": "casual",
        "season": "summer",
        "style": "casual",
        "summaryText": "Premium wardrobe analysis completed.",
        "analysisDepth": "Premium",
        "analysis_by_category": {
            "shirt": {
                "category": "shirt",
                "owned_colors": [],
                "owned_styles": [],
                "missing_colors": ["white"],
                "missing_styles": ["linen"],
                "recommended_purchases": ["White linen shirt"],
                "item_count": 0,
            }
        },
        "overall_summary": "Premium wardrobe analysis completed.",
    }
    _install_openai_mock(ai, content=json.dumps(minimal_payload))

    result = ai.analyze_wardrobe_gaps_with_chatgpt(
        wardrobe_items=[],
        occasion="casual",
        season="summer",
        style="casual",
    )

    assert isinstance(result["priorityShoppingList"], list)
    assert len(result["priorityShoppingList"]) > 0
    assert isinstance(result["categoryInsights"], list)
    assert len(result["categoryInsights"]) > 0
    assert "shirt" in result["analysis_by_category"]
    assert "trouser" in result["analysis_by_category"]


def test_analyze_wardrobe_gaps_rejects_truncated_openai_response():
    ai = _ai_service()
    truncated = _build_full_premium_json()[:-40]  # cut mid-json like the production failure
    _install_openai_mock(ai, content=truncated, finish_reason="length")

    with pytest.raises(HTTPException) as exc_info:
        ai.analyze_wardrobe_gaps_with_chatgpt(
            wardrobe_items=[],
            occasion="casual",
            season="summer",
            style="casual",
        )

    assert exc_info.value.status_code == 500
    assert "truncated" in str(exc_info.value.detail).lower()


def test_analyze_wardrobe_gaps_parses_large_json_without_using_default_token_limit():
    ai = _ai_service()
    content = _build_full_premium_json()
    assert len(content) > 3000  # mirrors production payload size

    _install_openai_mock(ai, content=content)
    result = ai.analyze_wardrobe_gaps_with_chatgpt(
        wardrobe_items=[],
        occasion="casual",
        season="summer",
        style="casual",
    )

    assert result["analysis_mode"] == "premium"
    assert len(result["analysis_by_category"]) == 7
    assert "sweater" in result["analysis_by_category"]
    assert "jacket" in result["analysis_by_category"]
    assert "tie" not in result["analysis_by_category"]
