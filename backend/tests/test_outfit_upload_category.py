"""Tests for upload slot detection helpers."""
from controllers.outfit_controller import OutfitController
from models.outfit import OutfitSuggestion
from models.wardrobe import WardrobeItem
from services.outfit_service import OutfitService
from utils.outfit_upload_category import text_suggests_outerwear


class TestOutfitUploadCategoryHelpers:
    def test_text_suggests_outerwear_for_corduroy_jacket(self):
        assert text_suggests_outerwear("Tan corduroy jacket with button front")
        assert text_suggests_outerwear("Your wardrobe jacket (uploaded item)")

    def test_text_does_not_treat_dress_shirt_as_outerwear(self):
        assert not text_suggests_outerwear("Slim fit dress shirt with a subtle textured pattern")


class TestOutfitControllerJacketMisclassification:
    def _controller(self) -> OutfitController:
        return OutfitController(
            type("MockAI", (), {"get_outfit_suggestion": lambda *a, **k: None})(),
            OutfitService(),
        )

    def test_reconcile_from_corduroy_shirt_text_clears_blazer(self):
        controller = self._controller()
        suggestion = OutfitSuggestion(
            shirt="Tan corduroy jacket with ribbed texture",
            trouser="Grey trousers",
            blazer="Royal blue slim fit blazer",
            shoes="Brown brogues",
            belt="Charcoal belt",
            reasoning="Elegant",
            blazer_id=99,
            upload_matched_category="shirt",
            source_slot="shirt",
            outerwear="Classic fit jacket from wardrobe",
            outerwear_id=7,
        )
        matching_items: dict = {
            "shirt": [],
            "blazer": [{"id": 99, "category": "blazer"}],
            "outerwear": [{"id": 7, "category": "jacket", "description": "Classic fit jacket"}],
        }
        controller._reconcile_outerwear_upload_slot(suggestion, matching_items)
        controller._apply_upper_body_layer_exclusivity(suggestion, matching_items)
        assert suggestion.upload_matched_category == "outerwear"
        assert suggestion.blazer == ""
        assert suggestion.blazer_id is None
        assert suggestion.outerwear_id is None
        assert "corduroy" in (suggestion.outerwear or "").lower()

    def test_similar_wardrobe_jacket_overrides_shirt_slot(self):
        controller = self._controller()
        suggestion = OutfitSuggestion(
            shirt="Slim fit dress shirt with a subtle textured pattern",
            trouser="Grey trousers",
            blazer="Royal blue slim fit blazer",
            shoes="Brown brogues",
            belt="Charcoal belt",
            reasoning="Elegant",
            blazer_id=99,
            upload_matched_category="shirt",
            source_slot="shirt",
            outerwear="Classic fit jacket from wardrobe",
            outerwear_id=7,
        )
        matching_items: dict = {
            "shirt": [],
            "blazer": [{"id": 99, "category": "blazer"}],
            "outerwear": [
                {
                    "id": 42,
                    "category": "jacket",
                    "color": "tan",
                    "description": "Tan corduroy jacket",
                    "image_data": "img",
                },
                {"id": 7, "category": "jacket", "description": "Classic fit jacket"},
            ],
        }
        similar = WardrobeItem(
            id=42,
            user_id=1,
            category="jacket",
            color="tan",
            description="Tan corduroy jacket",
            image_data="img",
        )
        controller._reconcile_outerwear_upload_slot(suggestion, matching_items, similar)
        controller._apply_upper_body_layer_exclusivity(suggestion, matching_items)
        assert suggestion.upload_matched_category == "outerwear"
        assert suggestion.outerwear_id == 42
        assert suggestion.blazer == ""
        assert suggestion.outerwear == "Tan corduroy jacket"
