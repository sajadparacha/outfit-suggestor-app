from services.outfit_service import OutfitService
from controllers.outfit_controller import OutfitController
from models.outfit import OutfitSuggestion


class DummyAIService:
    pass


class DummyWardrobeItem:
    def __init__(self, *, id: int, category: str, color=None, description=None, image_data=None):
        self.id = id
        self.category = category
        self.color = color
        self.description = description
        self.image_data = image_data


def _make_controller() -> OutfitController:
    # OutfitService is not used by injection helper; it's required by constructor.
    return OutfitController(DummyAIService(), OutfitService())


def test_inject_selected_item_into_matching_lists_when_missing():
    controller = _make_controller()

    suggestion = OutfitSuggestion(
        shirt="AI shirt",
        trouser="AI trouser",
        blazer="AI blazer",
        shoes="AI shoes",
        belt="AI belt",
        reasoning="Reasoning",
        shirt_id=None,
        trouser_id=555,
        blazer_id=None,
        shoes_id=None,
        belt_id=None,
    )

    matching_items = {
        "shirt": [],
        "trouser": [],
        "blazer": [],
        "shoes": [],
        "belt": [],
    }

    all_wardrobe_items = [
        DummyWardrobeItem(id=555, category="trouser", color="gray", description="Injected trouser", image_data="IMG"),
    ]

    # Call helper directly
    controller._apply_selected_ids_to_matches(  # type: ignore[attr-defined]
        suggestion=suggestion,
        matching_items=matching_items,
        all_wardrobe_items=all_wardrobe_items,
    )

    assert len(matching_items["trouser"]) == 1
    assert matching_items["trouser"][0]["id"] == 555
    assert matching_items["trouser"][0]["description"] == "Injected trouser"


def test_category_normalization_injection_jeans_to_trouser():
    controller = _make_controller()

    suggestion = OutfitSuggestion(
        shirt="AI shirt",
        trouser="AI trouser",
        blazer="AI blazer",
        shoes="AI shoes",
        belt="AI belt",
        reasoning="Reasoning",
        shirt_id=None,
        trouser_id=777,
        blazer_id=None,
        shoes_id=None,
        belt_id=None,
    )

    matching_items = {
        "shirt": [],
        "trouser": [],
        "blazer": [],
        "shoes": [],
        "belt": [],
    }

    # Wardrobe category variant "jeans" should be injected into "trouser".
    all_wardrobe_items = [
        DummyWardrobeItem(id=777, category="jeans", color="black", description="Injected jeans", image_data="IMG2"),
    ]

    controller._apply_selected_ids_to_matches(  # type: ignore[attr-defined]
        suggestion=suggestion,
        matching_items=matching_items,
        all_wardrobe_items=all_wardrobe_items,
    )

    assert len(matching_items["trouser"]) == 1
    assert matching_items["trouser"][0]["id"] == 777


def test_category_normalization_handles_shoe_and_jackets_aliases():
    controller = _make_controller()

    assert controller._normalize_item_category_for_outfit("shoe") == "shoes"  # type: ignore[attr-defined]
    assert controller._normalize_item_category_for_outfit("jackets") == "blazer"  # type: ignore[attr-defined]

