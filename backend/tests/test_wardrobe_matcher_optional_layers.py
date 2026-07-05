from models.outfit import OutfitSuggestion
from models.wardrobe import WardrobeItem
from services.wardrobe_matcher import WardrobeMatcher


def _item(item_id: int, category: str, color: str, description: str) -> WardrobeItem:
    return WardrobeItem(
        id=item_id,
        user_id=1,
        category=category,
        color=color,
        description=description,
        image_data="aW1hZ2U=",
    )


def test_matcher_maps_jacket_to_outerwear_not_blazer():
    matcher = WardrobeMatcher()
    suggestion = OutfitSuggestion(
        shirt="White shirt",
        trouser="Navy chinos",
        blazer="Grey wool blazer",
        shoes="Brown shoes",
        belt="Brown belt",
        reasoning="Test",
        outerwear="Olive bomber jacket",
    )
    wardrobe = [
        _item(1, "blazer", "grey", "Grey wool blazer"),
        _item(2, "jacket", "olive", "Olive bomber jacket"),
    ]

    matches = matcher.match_wardrobe_to_outfit(suggestion, wardrobe)

    assert len(matches["blazer"]) == 1
    assert matches["blazer"][0]["id"] == 1
    assert len(matches["outerwear"]) == 1
    assert matches["outerwear"][0]["id"] == 2


def test_matcher_maps_sweater_and_tie_when_present():
    matcher = WardrobeMatcher()
    suggestion = OutfitSuggestion(
        shirt="White shirt",
        trouser="Navy chinos",
        blazer="Navy blazer",
        shoes="Black shoes",
        belt="Black belt",
        reasoning="Test",
        sweater="Navy merino sweater",
        tie="Burgundy silk tie",
    )
    wardrobe = [
        _item(3, "sweater", "navy", "Navy merino sweater"),
        _item(4, "tie", "burgundy", "Burgundy silk tie"),
    ]

    matches = matcher.match_wardrobe_to_outfit(suggestion, wardrobe)

    assert matches["sweater"][0]["id"] == 3
    assert matches["tie"][0]["id"] == 4


def test_matcher_maps_outerwear_category_like_jacket():
    matcher = WardrobeMatcher()
    suggestion = OutfitSuggestion(
        shirt="White shirt",
        trouser="Navy chinos",
        blazer="Grey wool blazer",
        shoes="Brown shoes",
        belt="Brown belt",
        reasoning="Test",
        outerwear="Navy parka",
    )
    wardrobe = [
        _item(5, "outerwear", "navy", "Navy parka"),
    ]

    matches = matcher.match_wardrobe_to_outfit(suggestion, wardrobe)

    assert len(matches["outerwear"]) == 1
    assert matches["outerwear"][0]["id"] == 5
