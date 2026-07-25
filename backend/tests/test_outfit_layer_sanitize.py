"""Tests for blazer/outerwear sanitize rules used by week plan."""
from services.outfit_layer_sanitize import sanitize_outfit_layers


def test_summer_clears_outerwear_keeps_blazer():
    payload = {
        "blazer": "Navy blazer",
        "blazer_id": 1,
        "outerwear": "Harrington jacket",
        "outerwear_id": 2,
        "matching_wardrobe_items": {"blazer": [{"id": 1}], "outerwear": [{"id": 2}]},
    }
    sanitize_outfit_layers(
        payload, season="summer", occasion="everyday", style="classic"
    )
    assert payload["blazer"] == "Navy blazer"
    assert payload["outerwear"] is None
    assert payload["outerwear_id"] is None
    assert "outerwear" not in payload["matching_wardrobe_items"]


def test_classic_everyday_drops_outerwear_even_in_fall():
    payload = {
        "blazer": "Charcoal blazer",
        "blazer_id": 3,
        "outerwear": "Field jacket",
        "outerwear_id": 4,
    }
    sanitize_outfit_layers(
        payload, season="fall", occasion="everyday", style="classic"
    )
    assert payload["blazer"] == "Charcoal blazer"
    assert payload["outerwear"] is None
    assert payload["outerwear_id"] is None


def test_casual_keeps_outerwear_when_no_blazer():
    payload = {
        "blazer": "No structured blazer — outfit built around your outerwear",
        "blazer_id": None,
        "outerwear": "Denim jacket",
        "outerwear_id": 9,
    }
    sanitize_outfit_layers(
        payload, season="fall", occasion="casual", style="casual"
    )
    assert payload["outerwear"] == "Denim jacket"
    assert payload["outerwear_id"] == 9


def test_pinned_outerwear_wins_over_work_occasion_preference():
    """Selected jacket (outerwear_id) must not be dropped for work/classic preference."""
    payload = {
        "blazer": "Test blazer",
        "blazer_id": None,
        "outerwear": "Navy bomber jacket",
        "outerwear_id": 7,
        "matching_wardrobe_items": {
            "blazer": [],
            "outerwear": [{"id": 7}],
        },
    }
    sanitize_outfit_layers(
        payload, season="all-season", occasion="work", style="smart-casual"
    )
    assert payload["outerwear_id"] == 7
    assert payload["outerwear"] == "Navy bomber jacket"
    assert payload["blazer"] == ""
    assert payload["blazer_id"] is None

