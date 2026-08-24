"""Canonical STYLE_LIBRARY inventory for free and premium wardrobe gap analysis."""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from models.wardrobe import WardrobeItem
from services.ai_service import AIService
from services.wardrobe_service import WardrobeService
from tests.test_ai_service_premium_wardrobe_gaps import (
    _build_full_premium_json,
    _install_openai_mock,
)


def _oxford_shirt() -> WardrobeItem:
    return WardrobeItem(
        id=1,
        user_id=1,
        category="shirt",
        color="Navy",
        description="Navy oxford cotton shirt",
    )


def _catalog_sets(result: dict, category: str):
    entry = result["analysis_by_category"][category]
    return set(entry["owned_styles"]), set(entry["missing_styles"])


def test_free_missing_styles_are_full_library_catalog_diff():
    ws = WardrobeService()
    db = MagicMock()
    with patch.object(ws, "get_user_wardrobe", return_value=([_oxford_shirt()], 1)):
        result = ws.analyze_wardrobe_gaps(
            db, user_id=1, occasion="casual", season="fall", style="classic"
        )

    library = set(ws.STYLE_LIBRARY["shirt"])
    owned, missing = _catalog_sets(result, "shirt")
    assert "oxford" in owned
    assert owned.isdisjoint(missing)
    assert owned | missing == library
    assert result["analysis_by_category"]["shirt"]["style_priorities"]
    assert "camp collar" not in missing


def test_free_and_premium_return_same_style_catalog():
    ws = WardrobeService()
    db = MagicMock()
    items = [_oxford_shirt()]
    with patch.object(ws, "get_user_wardrobe", return_value=(items, 1)):
        free = ws.analyze_wardrobe_gaps(
            db,
            user_id=1,
            occasion="work",
            season="all",
            style="classic",
            lifestyle_mix=["work", "everyday"],
            primary_lifestyle="work",
            dress_code="smart-casual",
        )

    ai = AIService(api_key="test-key")
    payload = json_payload_with_invented_styles()
    _install_openai_mock(ai, content=payload)
    premium = ai.analyze_wardrobe_gaps_with_chatgpt(
        wardrobe_items=[
            {
                "id": 1,
                "category": "shirt",
                "color": "Navy",
                "description": "Navy oxford cotton shirt",
            }
        ],
        occasion="work",
        season="all",
        style="classic",
        lifestyle_mix=["work", "everyday"],
        primary_lifestyle="work",
        dress_code="smart-casual",
    )

    assert _catalog_sets(free, "shirt") == _catalog_sets(premium, "shirt")
    assert "camp collar" not in premium["analysis_by_category"]["shirt"]["missing_styles"]
    assert "oxford" in premium["analysis_by_category"]["shirt"]["owned_styles"]


def json_payload_with_invented_styles() -> str:
    import json

    payload = json.loads(_build_full_premium_json(occasion="work", season="all", style="classic"))
    payload["analysis_by_category"]["shirt"]["owned_styles"] = ["cotton"]
    payload["analysis_by_category"]["shirt"]["missing_styles"] = ["camp collar", "relaxed", "linen"]
    payload["priorityShoppingList"][0]["recommendedStyles"] = ["camp collar", "linen", "invented"]
    payload["analysis_by_category"]["shirt"]["style_priorities"] = {
        "linen": "Essential",
        "camp collar": "Essential",
    }
    return json.dumps(payload)


def test_premium_shopping_list_uses_library_tags_only():
    ai = AIService(api_key="test-key")
    _install_openai_mock(ai, content=json_payload_with_invented_styles())
    result = ai.analyze_wardrobe_gaps_with_chatgpt(
        wardrobe_items=[
            {
                "id": 1,
                "category": "shirt",
                "color": "Navy",
                "description": "Navy oxford cotton shirt",
            }
        ],
        occasion="work",
        season="all",
        style="classic",
        lifestyle_mix=["work"],
        primary_lifestyle="work",
        dress_code="smart-casual",
    )

    library = {
        tag
        for styles in WardrobeService.STYLE_LIBRARY.values()
        for tag in styles
    }
    for item in result["priorityShoppingList"]:
        category = item["category"]
        allowed_missing = set(
            result["analysis_by_category"][category]["missing_styles"]
        )
        for style_tag in item["recommendedStyles"]:
            assert style_tag in library
            assert style_tag in allowed_missing
        assert "camp collar" not in item["recommendedStyles"]
        assert "invented" not in item["recommendedStyles"]


def test_work_smart_casual_does_not_treat_silk_and_bomber_as_equal_essentials():
    ws = WardrobeService()
    kwargs = dict(
        occasion="work",
        lifestyle_mix=["work", "everyday"],
        primary_lifestyle="work",
        dress_code="smart-casual",
    )
    oxford = ws.rank_missing_style("shirt", "oxford", **kwargs)
    bomber = ws.rank_missing_style("jacket", "bomber", **kwargs)
    silk = ws.rank_missing_style("tie", "silk", **kwargs)
    assert oxford == "Essential"
    assert bomber == "Skip"
    assert silk != "Essential"
    assert {bomber, silk} != {"Essential", "Essential"}


def test_weak_description_is_not_evidenced_not_invented():
    ws = WardrobeService()
    items = [SimpleNamespace(category="shirt", color="navy", description="Navy shirt")]
    inventory = ws.build_style_inventory(items, occasion="casual")
    shirt = inventory["shirt"]
    assert shirt["owned_styles"] == []
    assert set(shirt["missing_styles"]) == set(ws.STYLE_LIBRARY["shirt"])
    assert "camp collar" not in shirt["missing_styles"]


def test_premium_prompt_forbids_inventing_catalog_tags():
    ai = AIService(api_key="test-key")
    captured = _install_openai_mock(ai, content=_build_full_premium_json())
    ai.analyze_wardrobe_gaps_with_chatgpt(
        wardrobe_items=[{"category": "shirt", "color": "navy", "description": "Navy oxford shirt"}],
        occasion="work",
        season="all",
        style="classic",
        lifestyle_mix=["work"],
        primary_lifestyle="work",
        dress_code="smart-casual",
    )
    prompt = captured["messages"][0]["content"]
    assert "STYLE CATALOG" in prompt
    assert "Do not add, rename, or replace style tags" in prompt
    assert "not evidenced" in prompt
    assert "oxford" in prompt


def test_reconcile_drops_owned_color_and_style_from_missing():
    ws = WardrobeService()
    analysis = {
        "blazer": {
            "owned_colors": ["Royal Blue", "Charcoal", "Light Blue"],
            "owned_styles": ["unstructured"],
            "missing_colors": ["Navy", "Charcoal", "charcoal"],
            "missing_styles": ["unstructured", "linen blazer"],
            "style_priorities": {
                "unstructured": "Essential",
                "linen blazer": "Essential",
            },
        }
    }
    ws.reconcile_owned_vs_missing(analysis)
    missing_colors = {color.lower() for color in analysis["blazer"]["missing_colors"]}
    assert "charcoal" not in missing_colors
    assert "navy" in missing_colors
    missing_styles = {style.lower() for style in analysis["blazer"]["missing_styles"]}
    assert "unstructured" not in missing_styles
    assert "linen blazer" in missing_styles


def test_ensure_shopping_list_adds_medium_shirt_gap():
    ws = WardrobeService()
    analysis = {
        "shirt": {
            "missing_colors": ["white"],
            "missing_styles": ["oxford", "linen"],
            "style_priorities": {"oxford": "Essential", "linen": "Useful"},
            "item_count": 9,
            "occasion": "work",
            "season": "all",
            "style": "classic",
        },
        "blazer": {
            "missing_colors": ["navy"],
            "missing_styles": ["unstructured"],
            "style_priorities": {"unstructured": "Essential"},
            "item_count": 1,
            "occasion": "work",
            "season": "all",
            "style": "classic",
        },
    }
    shopping = [
        {
            "rank": 1,
            "itemName": "Navy unstructured blazer",
            "category": "blazer",
            "priority": "High",
            "recommendedColors": ["navy"],
            "recommendedStyles": ["unstructured"],
            "reason": "Adds a layer.",
            "outfitImpact": "More outfits.",
            "actions": ["Add to shopping list"],
        }
    ]
    result = ws.ensure_shopping_list_covers_gaps(shopping, analysis)
    categories = [item["category"] for item in result]
    assert "blazer" in categories
    assert "shirt" in categories


def test_constrain_keeps_color_only_shopping_row():
    ws = WardrobeService()
    inventory = {
        "shirt": {
            "missing_styles": ["oxford"],
            "style_priorities": {"oxford": "Skip"},
            "missing_colors": ["white"],
        }
    }
    shopping = [
        {
            "category": "shirt",
            "itemName": "White shirt",
            "recommendedStyles": [],
            "recommendedColors": ["white"],
        }
    ]
    result = ws.constrain_shopping_list_to_inventory(shopping, inventory)
    assert len(result) == 1
    assert result[0]["category"] == "shirt"
    assert result[0]["recommendedColors"] == ["white"]


def _empty_belt_entry() -> dict:
    return {
        "missing_colors": ["black", "brown"],
        "missing_styles": ["leather", "braided", "reversible", "formal leather"],
        "style_priorities": {
            "leather": "Essential",
            "braided": "Useful",
            "reversible": "Useful",
            "formal leather": "Skip",
        },
        "item_count": 0,
        "occasion": "casual",
        "season": "all",
        "style": "classic",
    }


def test_format_item_name_is_category_label_not_sku():
    ws = WardrobeService()
    assert ws._format_item_name("belt", ["black", "brown"], ["leather"]) == "Belts"
    assert "leather" not in ws._format_item_name("belt", ["black"], ["leather"]).lower()
    assert ws._format_item_name("shirt", ["white"], ["oxford"]) == "Shirts"


def test_empty_belt_shopping_row_is_complete_buy_map():
    ws = WardrobeService()
    row = ws._shopping_row_for_category("belt", _empty_belt_entry(), rank=1)
    assert row is not None
    assert row["itemName"] == "Belts"
    assert row["recommendedColors"] == ["black", "brown"]
    assert row["recommendedStyles"] == ["leather", "braided", "reversible"]
    assert "formal leather" not in row["recommendedStyles"]
    reason = row["reason"].lower()
    assert "own no" in reason
    assert "black leather" in reason
    assert "buy first" in reason


def test_generate_priority_list_one_row_per_gapped_category():
    ws = WardrobeService()
    analysis = {
        "belt": _empty_belt_entry(),
        "shirt": {
            "missing_colors": ["white", "olive"],
            "missing_styles": ["oxford", "linen"],
            "style_priorities": {"oxford": "Essential", "linen": "Useful"},
            "item_count": 4,
            "occasion": "casual",
            "season": "all",
            "style": "classic",
        },
    }
    result = ws._generate_priority_shopping_list(analysis)
    categories = [item["category"] for item in result]
    assert categories.count("belt") == 1
    assert categories.count("shirt") == 1
    assert len(result) == 2
    belt = next(item for item in result if item["category"] == "belt")
    assert belt["itemName"] == "Belts"
    assert belt["recommendedColors"] == ["black", "brown"]
    assert belt["recommendedStyles"] == ["leather", "braided", "reversible"]


def test_constrain_rewrites_sku_title_and_fills_all_gaps():
    ws = WardrobeService()
    inventory = {
        "belt": {
            "missing_styles": ["leather", "braided", "reversible", "formal leather"],
            "style_priorities": {
                "leather": "Essential",
                "braided": "Useful",
                "reversible": "Useful",
                "formal leather": "Skip",
            },
            "missing_colors": ["black", "brown"],
            "item_count": 0,
            "occasion": "casual",
            "season": "all",
            "style": "classic",
        }
    }
    shopping = [
        {
            "category": "belt",
            "itemName": "black leather belt",
            "recommendedStyles": ["leather"],
            "recommendedColors": ["black"],
            "reason": "Add a black leather belt.",
        },
        {
            "category": "belt",
            "itemName": "brown braided belt",
            "recommendedStyles": ["braided"],
            "recommendedColors": ["brown"],
            "reason": "Second belt SKU.",
        },
    ]
    result = ws.constrain_shopping_list_to_inventory(shopping, inventory)
    assert len(result) == 1
    assert result[0]["itemName"] == "Belts"
    assert result[0]["recommendedColors"] == ["black", "brown"]
    assert result[0]["recommendedStyles"] == ["leather", "braided", "reversible"]
    assert "formal leather" not in result[0]["recommendedStyles"]
    reason = result[0]["reason"].lower()
    assert "own no" in reason
    assert "black leather" in reason


def test_ensure_appends_omitted_empty_belt_with_category_label():
    ws = WardrobeService()
    analysis = {
        "shirt": {
            "missing_colors": ["white"],
            "missing_styles": ["oxford"],
            "style_priorities": {"oxford": "Essential"},
            "item_count": 3,
            "occasion": "casual",
            "season": "all",
            "style": "classic",
        },
        "belt": _empty_belt_entry(),
    }
    shopping = [
        {
            "rank": 1,
            "itemName": "Shirts",
            "category": "shirt",
            "priority": "High",
            "recommendedColors": ["white"],
            "recommendedStyles": ["oxford"],
            "reason": "Buy first white oxford.",
            "outfitImpact": "More outfits.",
            "actions": ["Add to shopping list"],
        }
    ]
    result = ws.ensure_shopping_list_covers_gaps(shopping, analysis)
    categories = [item["category"] for item in result]
    assert "shirt" in categories
    assert "belt" in categories
    belt = next(item for item in result if item["category"] == "belt")
    assert belt["itemName"] == "Belts"
    assert belt["recommendedColors"] == ["black", "brown"]
    assert belt["recommendedStyles"] == ["leather", "braided", "reversible"]
    assert "own no" in belt["reason"].lower()
