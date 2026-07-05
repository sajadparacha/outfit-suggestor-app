"""Tests for season-aware wardrobe gap post-filters."""
from services.wardrobe_season_rules import (
    apply_wardrobe_gap_season_filters,
    filter_summer_texts,
    is_heavy_outerwear_for_summer,
    text_has_summer_blocklist,
)


def test_text_has_summer_blocklist_detects_heavy_items():
    assert text_has_summer_blocklist("Gray merino sweater")
    assert text_has_summer_blocklist("Insulated parka for layering")
    assert text_has_summer_blocklist("Wool coat for winter commutes")
    assert not text_has_summer_blocklist("White linen shirt")


def test_is_heavy_outerwear_for_summer():
    assert is_heavy_outerwear_for_summer(category="coat", description="Wool overcoat")
    assert is_heavy_outerwear_for_summer(category="jacket", description="Insulated parka")
    assert is_heavy_outerwear_for_summer(category="blazer", description="Wool blazer")
    assert not is_heavy_outerwear_for_summer(category="jacket", description="Lightweight harrington")
    assert not is_heavy_outerwear_for_summer(category="shirt", description="White linen")


def test_filter_summer_texts_removes_blocklisted_lines():
    lines = [
        "White linen shirt for hot days.",
        "Navy merino sweater for layering.",
        "Khaki chino shorts.",
    ]
    assert filter_summer_texts(lines) == [
        "White linen shirt for hot days.",
        "Khaki chino shorts.",
    ]


def test_apply_summer_filters_deprioritizes_sweater_and_jacket():
    analysis_by_category = {
        "shirt": {
            "recommended_purchases": ["White linen shirt."],
            "missing_styles": ["linen"],
        },
        "sweater": {
            "recommended_purchases": ["Gray merino sweater."],
            "missing_styles": ["merino", "linen knit"],
        },
    }
    shopping_list = [
        {"rank": 1, "itemName": "gray merino sweater", "category": "sweater", "reason": "Core layer"},
        {"rank": 2, "itemName": "white linen shirt", "category": "shirt", "reason": "Breathable top"},
        {"rank": 3, "itemName": "navy bomber jacket", "category": "jacket", "reason": "Heavy bomber"},
    ]
    insights = [
        {"category": "sweater", "priority": "High", "recommendation": "Buy a merino sweater."},
        {"category": "shirt", "priority": "High", "recommendation": "Add a linen shirt."},
    ]

    categories, shopping, filtered_insights = apply_wardrobe_gap_season_filters(
        season="summer",
        occasion="casual",
        analysis_by_category=analysis_by_category,
        priority_shopping_list=shopping_list,
        category_insights=insights,
    )

    assert categories["sweater"]["recommended_purchases"] == []
    assert "merino" not in categories["sweater"]["missing_styles"]
    assert "linen knit" in categories["sweater"]["missing_styles"]
    assert len(shopping) == 1
    assert shopping[0]["category"] == "shirt"
    assert shopping[0]["rank"] == 1
    assert filtered_insights[0]["priority"] == "Low"


def test_apply_filters_noop_for_winter():
    shopping_list = [
        {"rank": 1, "itemName": "gray merino sweater", "category": "sweater", "reason": "Warm layer"},
    ]
    categories, shopping, _ = apply_wardrobe_gap_season_filters(
        season="winter",
        occasion="casual",
        analysis_by_category={"sweater": {"recommended_purchases": ["Gray merino sweater."]}},
        priority_shopping_list=shopping_list,
        category_insights=[],
    )
    assert shopping == shopping_list
    assert categories["sweater"]["recommended_purchases"] == ["Gray merino sweater."]
