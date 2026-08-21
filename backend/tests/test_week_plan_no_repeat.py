"""Hard no-repeat of wardrobe items across week-plan days."""
from models.outfit import OutfitSuggestion
from services.week_plan_service import (
    bind_missing_slot_ids_from_matches,
    scrub_reused_slot_ids,
)


def test_bind_skips_excluded_ids_and_picks_next():
    payload = {
        "shirt_id": None,
        "trouser_id": None,
        "matching_wardrobe_items": {
            "shirt": [
                {"id": 10, "color": "blue"},
                {"id": 11, "color": "white"},
            ],
            "trouser": [
                {"id": 20, "color": "khaki"},
                {"id": 21, "color": "navy"},
            ],
        },
    }
    bind_missing_slot_ids_from_matches(payload, exclude_item_ids={10, 20})
    assert payload["shirt_id"] == 11
    assert payload["trouser_id"] == 21
    # Unused matches sorted first
    shirt_ids = [i["id"] for i in payload["matching_wardrobe_items"]["shirt"]]
    assert shirt_ids[0] == 11


def test_bind_clears_reused_explicit_id_when_alternative_exists():
    payload = {
        "shirt_id": 10,
        "trouser_id": 20,
        "matching_wardrobe_items": {
            "shirt": [
                {"id": 10, "color": "blue"},
                {"id": 12, "color": "green"},
            ],
            "trouser": [{"id": 20, "color": "khaki"}],
        },
    }
    bind_missing_slot_ids_from_matches(payload, exclude_item_ids={10})
    assert payload["shirt_id"] == 12
    assert payload["trouser_id"] == 20


def test_bind_allows_repeat_when_no_alternative():
    payload = {
        "shirt_id": None,
        "matching_wardrobe_items": {
            "shirt": [{"id": 10, "color": "blue"}],
        },
    }
    bind_missing_slot_ids_from_matches(payload, exclude_item_ids={10})
    assert payload["shirt_id"] == 10


def test_scrub_reused_slot_ids_clears_only_when_alt_exists():
    suggestion = OutfitSuggestion(
        shirt="Blue shirt",
        trouser="Khaki trousers",
        blazer="",
        shoes="Brown shoes",
        belt="",
        reasoning="Test",
        shirt_id=10,
        trouser_id=20,
        matching_wardrobe_items={
            "shirt": [{"id": 10}, {"id": 11}],
            "trouser": [{"id": 20}],
        },
    )
    scrub_reused_slot_ids(suggestion, {10, 20})
    assert suggestion.shirt_id is None
    # No trouser alternative — keep 20 rather than leave the slot empty
    assert suggestion.trouser_id == 20
    assert [i["id"] for i in suggestion.matching_wardrobe_items["shirt"]][0] == 11
