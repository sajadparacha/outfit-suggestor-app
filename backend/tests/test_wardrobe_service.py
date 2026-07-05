"""
Unit tests for WardrobeService - find_most_similar_wardrobe_item,
reorder_matches_by_upload_similarity, gap analysis categories
"""
import base64
import io
from unittest.mock import MagicMock, patch
import pytest
from PIL import Image

from models.wardrobe import WardrobeItem
from services.wardrobe_service import WardrobeService


def _make_base64_image(width: int, height: int, r: int, g: int, b: int, quality: int = 85) -> str:
    """Create a minimal base64 JPEG for testing."""
    img = Image.new("RGB", (width, height), (r, g, b))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality)
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


class TestWardrobeServiceCategoryStyles:
    """Styles suggested per category must stay within that category's library."""

    def test_casual_shirt_targets_exclude_shoe_styles(self):
        ws = WardrobeService()
        targets = ws._target_styles("shirt", "casual", "classic")
        assert "clean sneakers" not in targets
        assert "driving shoes" not in targets
        assert "oxford" in targets

    def test_casual_shoes_targets_include_sneakers_not_shirt_styles(self):
        ws = WardrobeService()
        targets = ws._target_styles("shoes", "casual", "classic")
        assert "clean sneakers" in targets
        assert "oxford" not in targets
        assert "linen" not in targets

    def test_filter_styles_for_category_removes_cross_category_tags(self):
        ws = WardrobeService()
        filtered = ws._filter_styles_for_category(
            "shirt",
            ["oxford", "linen", "clean sneakers", "loafers"],
        )
        assert filtered == ["oxford", "linen"]


class TestWardrobeGapAnalysisCategories:
    """Gap analysis includes sweater, jacket; tie only for formal occasions; jacket distinct from blazer."""

    def test_gap_categories_casual_includes_sweater_and_jacket_not_tie(self):
        ws = WardrobeService()
        categories = ws._gap_analysis_categories("casual")
        assert "sweater" in categories
        assert "jacket" in categories
        assert "tie" not in categories

    def test_gap_categories_business_includes_tie(self):
        ws = WardrobeService()
        for occasion in ("business", "formal", "office"):
            categories = ws._gap_analysis_categories(occasion)
            assert "tie" in categories, occasion
            assert "sweater" in categories
            assert "jacket" in categories

    def test_jacket_not_merged_into_blazer(self):
        ws = WardrobeService()
        assert ws._normalize_category("jacket") == "jacket"
        assert ws._normalize_category("jackets") == "jacket"
        assert ws._normalize_category("blazer") == "blazer"
        assert ws._normalize_category("coat") == "coat"
        assert ws._normalize_category("coats") == "coat"
        assert ws._normalize_category("parka") == "coat"

    def test_sweater_and_jacket_have_style_library_entries(self):
        ws = WardrobeService()
        assert ws.STYLE_LIBRARY["sweater"]
        assert ws.STYLE_LIBRARY["jacket"]
        assert ws.STYLE_LIBRARY["tie"]

    def test_analyze_wardrobe_gaps_casual_has_no_tie(self):
        ws = WardrobeService()
        db = MagicMock()
        jacket_item = WardrobeItem(
            id=1,
            user_id=1,
            category="jacket",
            color="Navy",
            description="Lightweight field jacket",
        )
        blazer_item = WardrobeItem(
            id=2,
            user_id=1,
            category="blazer",
            color="Gray",
            description="Unstructured casual blazer",
        )
        with patch.object(ws, "get_user_wardrobe", return_value=([jacket_item, blazer_item], 2)):
            result = ws.analyze_wardrobe_gaps(db, user_id=1, occasion="casual", season="fall", style="modern")

        categories = result["analysis_by_category"]
        assert "tie" not in categories
        assert "sweater" in categories
        assert "jacket" in categories
        assert categories["jacket"]["item_count"] == 1
        assert categories["blazer"]["item_count"] == 1

    def test_analyze_wardrobe_gaps_business_includes_tie(self):
        ws = WardrobeService()
        db = MagicMock()
        with patch.object(ws, "get_user_wardrobe", return_value=([], 0)):
            result = ws.analyze_wardrobe_gaps(db, user_id=1, occasion="business", season="winter", style="classic")

        assert "tie" in result["analysis_by_category"]
        assert result["analysis_by_category"]["tie"]["item_count"] == 0

    def test_analyze_wardrobe_gaps_summer_deprioritizes_sweater_and_jacket(self):
        ws = WardrobeService()
        db = MagicMock()
        with patch.object(ws, "get_user_wardrobe", return_value=([], 0)):
            result = ws.analyze_wardrobe_gaps(db, user_id=1, occasion="casual", season="summer", style="casual")

        top_categories = [item["category"] for item in result["priorityShoppingList"][:3]]
        assert "sweater" not in top_categories
        assert "jacket" not in top_categories
        assert top_categories[0] in {"shirt", "trouser", "shoes"}


class TestWardrobeHFCategoryExtraction:
  """HF fallback classifies structured blazers vs casual jackets vs coats."""

  def test_bomber_jacket_maps_to_jacket_not_blazer(self):
      from services.wardrobe_ai_service_hf import WardrobeAIServiceHF

      service = WardrobeAIServiceHF.__new__(WardrobeAIServiceHF)
      assert service._extract_category("a navy bomber jacket on a hanger") == "jacket"

  def test_sport_coat_maps_to_blazer(self):
      from services.wardrobe_ai_service_hf import WardrobeAIServiceHF

      service = WardrobeAIServiceHF.__new__(WardrobeAIServiceHF)
      assert service._extract_category("charcoal sport coat") == "blazer"
      assert service._extract_category("structured navy blazer") == "blazer"

  def test_parka_maps_to_coat(self):
      from services.wardrobe_ai_service_hf import WardrobeAIServiceHF

      service = WardrobeAIServiceHF.__new__(WardrobeAIServiceHF)
      assert service._extract_category("insulated parka with hood") == "coat"


class TestWardrobeServiceSimilarity:
    """Tests for wardrobe item similarity and reordering"""

    def test_find_most_similar_returns_closest_item(self):
        """Find most similar returns the wardrobe item with smallest phash distance."""
        ws = WardrobeService()
        # Use identical image for upload and item_a so distance is 0
        same_img = _make_base64_image(100, 100, 30, 60, 120, 85)
        other_img = _make_base64_image(100, 100, 200, 50, 80, 85)

        class MockItem:
            pass

        item_a = MockItem()
        item_a.id = 1
        item_a.image_data = same_img
        item_a.category = "shirt"

        item_b = MockItem()
        item_b.id = 2
        item_b.image_data = other_img
        item_b.category = "shirt"

        result = ws.find_most_similar_wardrobe_item(
            same_img, [item_a, item_b], max_distance=30
        )
        assert result is not None
        assert result.id == 1

    def test_find_most_similar_returns_none_when_empty_list(self):
        """Returns None when wardrobe items list is empty."""
        ws = WardrobeService()
        upload_img = _make_base64_image(100, 100, 100, 100, 100)
        result = ws.find_most_similar_wardrobe_item(upload_img, [], max_distance=30)
        assert result is None

    def test_find_most_similar_skips_items_without_image_data(self):
        """Items without image_data are skipped."""
        ws = WardrobeService()
        upload_img = _make_base64_image(50, 50, 100, 100, 100)

        class MockItem:
            pass

        item_no_img = MockItem()
        item_no_img.id = 1
        item_no_img.image_data = None
        item_no_img.category = "shirt"

        result = ws.find_most_similar_wardrobe_item(
            upload_img, [item_no_img], max_distance=30
        )
        assert result is None

    def test_reorder_matches_by_upload_similarity_moves_most_similar_first(self):
        """Reorder puts the item most similar to upload first."""
        ws = WardrobeService()
        upload_img = _make_base64_image(80, 80, 40, 70, 130)
        img_a = _make_base64_image(80, 80, 200, 100, 50)
        img_b = _make_base64_image(80, 80, 45, 72, 128)

        matching_items = {
            "shirt": [
                {"id": 1, "image_data": img_a},
                {"id": 2, "image_data": img_b},
            ],
            "trouser": [],
        }
        # Mock phash to return: upload vs img_a = 10, upload vs img_b = 2 (img_b closer)
        def mock_phash_distance(self, im1: str, im2: str) -> int:
            if im2 == img_b:
                return 2
            return 10

        with patch.object(WardrobeService, "_phash_distance", mock_phash_distance):
            ws.reorder_matches_by_upload_similarity(matching_items, upload_img)
        assert matching_items["shirt"][0]["id"] == 2

    def test_reorder_matches_skips_category_with_less_than_two_with_images(self):
        """Does not reorder when category has 0 or 1 items with image_data."""
        ws = WardrobeService()
        upload_img = _make_base64_image(50, 50, 100, 100, 100)
        single = {"id": 1, "image_data": upload_img}

        matching_items = {"shirt": [single]}
        ws.reorder_matches_by_upload_similarity(matching_items, upload_img)
        assert matching_items["shirt"][0]["id"] == 1
