import pytest

from controllers.outfit_controller import OutfitController
from models.outfit import OutfitSuggestion
from services.outfit_service import OutfitService


@pytest.fixture(scope="module")
def controller():
    from tests.conftest import _MockAIService

    return OutfitController(_MockAIService(), OutfitService())


class _Item:
    """Minimal wardrobe item stand-in for the controller helpers."""

    def __init__(self, *, id, category, color=None, description=None):
        self.id = id
        self.category = category
        self.color = color
        self.description = description
        self.image_data = "thumb"


def _suggestion(**overrides) -> OutfitSuggestion:
    base = {
        "shirt": "White shirt",
        "trouser": "Navy chinos",
        "blazer": "Charcoal blazer",
        "shoes": "Loafers",
        "belt": "Brown belt",
        "reasoning": "test",
    }
    base.update(overrides)
    return OutfitSuggestion(**base)


def test_upload_text_prefers_description():
    text = OutfitController._outerwear_upload_text(
        label="jacket", color="Navy", description="Navy wool overcoat"
    )
    assert text == "Navy wool overcoat"
    assert "uploaded item" not in text.lower()


def test_upload_text_falls_back_to_colour():
    text = OutfitController._outerwear_upload_text(label="jacket", color="Navy")
    assert text == "Your wardrobe jacket — Navy"
    assert "uploaded item" not in text.lower()


def test_upload_text_with_no_wardrobe_data_points_at_photo():
    assert OutfitController._outerwear_upload_text(label="coat") == "The coat in your photo"
    assert OutfitController._outerwear_upload_text() == "The jacket in your photo"


def test_jacket_upload_from_wardrobe_item_uses_description(controller):
    suggestion = _suggestion(outerwear="Your wardrobe jacket (uploaded item)")
    item = _Item(id=7, category="jacket", color="Tan", description="Tan suede jacket")

    controller._apply_source_wardrobe_match_overrides(  # type: ignore[attr-defined]
        suggestion, {"outerwear": []}, item
    )

    assert suggestion.outerwear == "Tan suede jacket"
    assert suggestion.outerwear_id == 7


def test_jacket_upload_without_description_uses_colour(controller):
    suggestion = _suggestion()
    item = _Item(id=8, category="coat", color="Charcoal")

    controller._apply_source_wardrobe_match_overrides(  # type: ignore[attr-defined]
        suggestion, {"outerwear": []}, item
    )

    assert suggestion.outerwear == "Your wardrobe coat — Charcoal"


def test_layer_exclusivity_never_writes_uploaded_item_placeholder(controller):
    suggestion = _suggestion(
        outerwear=None,
        source_slot="outerwear",
        upload_matched_category="outerwear",
    )
    matching = {"blazer": [{"id": 1}]}

    controller._apply_upper_body_layer_exclusivity(  # type: ignore[attr-defined]
        suggestion, matching, season="winter", occasion="casual", style="modern"
    )

    assert suggestion.outerwear == "The jacket in your photo"
    assert "uploaded item" not in (suggestion.outerwear or "").lower()
    assert suggestion.blazer == ""


def test_layer_exclusivity_replaces_legacy_placeholder_with_known_label(controller):
    suggestion = _suggestion(
        outerwear="Your wardrobe jacket (uploaded item)",
        source_slot="outerwear",
        upload_matched_category="outerwear",
    )

    controller._apply_upper_body_layer_exclusivity(  # type: ignore[attr-defined]
        suggestion, None, season="winter", outerwear_label="coat"
    )

    assert suggestion.outerwear == "The coat in your photo"


@pytest.mark.parametrize(
    "raw",
    [
        "Your wardrobe jacket (uploaded item)",
        "Your wardrobe coat (uploaded item)",
        "Jacket (uploaded item)",
        "null",
        "none",
        "n/a",
        "",
        None,
    ],
)
def test_clean_upload_marker_text_rejects_bare_placeholders(raw):
    from utils.outfit_upload_category import clean_upload_marker_text

    assert clean_upload_marker_text(raw) is None


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("From your upload — navy bomber jacket", "navy bomber jacket"),
        ("Navy corduroy jacket (uploaded item)", "Navy corduroy jacket"),
        ("Your wardrobe jacket — Navy (uploaded item)", "Your wardrobe jacket — Navy"),
        ("Navy wool overcoat", "Navy wool overcoat"),
    ],
)
def test_clean_upload_marker_text_keeps_real_description(raw, expected):
    from utils.outfit_upload_category import clean_upload_marker_text

    assert clean_upload_marker_text(raw) == expected


def test_layer_exclusivity_keeps_description_that_mentions_upload(controller):
    """A real description containing an upload marker must survive, not be discarded."""
    suggestion = _suggestion(
        outerwear="From your upload — navy bomber jacket",
        source_slot="outerwear",
        upload_matched_category="outerwear",
    )

    controller._apply_upper_body_layer_exclusivity(  # type: ignore[attr-defined]
        suggestion, None, season="winter"
    )

    assert suggestion.outerwear == "navy bomber jacket"
