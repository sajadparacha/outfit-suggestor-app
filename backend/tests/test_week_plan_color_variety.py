"""Unit tests for week-plan color variety helpers."""
from models.outfit import OutfitSuggestion
from services.week_plan_service import (
    extract_colors_from_outfit_payload,
    extract_outfit_colors,
)


def test_extract_outfit_colors_from_matches_and_text():
    suggestion = OutfitSuggestion(
        shirt="Classic white dress shirt",
        trouser="Dark navy dress trousers",
        blazer="",
        shoes="Black leather dress shoes",
        belt="Brown leather belt",
        reasoning="Test",
        matching_wardrobe_items={
            "shirt": [{"id": 1, "color": "White", "image_data": "a"}],
            "trouser": [{"id": 2, "color": "Navy", "image_data": "b"}],
            "blazer": [],
            "shoes": [{"id": 3, "color": "Black", "image_data": "c"}],
            "belt": [{"id": 4, "color": "Brown", "image_data": "d"}],
        },
    )
    colors = extract_outfit_colors(suggestion)
    assert "white" in colors
    assert "navy" in colors
    assert "black" in colors
    assert "brown" in colors


def test_extract_colors_from_outfit_payload_dedupes():
    payload = {
        "shirt": "Navy polo",
        "trouser": "navy chinos",
        "shoes": "White sneakers",
        "matching_wardrobe_items": {
            "shirt": [{"id": 1, "color": "navy"}],
        },
    }
    colors = extract_colors_from_outfit_payload(payload)
    assert colors.count("navy") == 1
    assert "white" in colors
