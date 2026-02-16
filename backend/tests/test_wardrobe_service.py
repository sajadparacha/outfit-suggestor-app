"""
Unit tests for WardrobeService - find_most_similar_wardrobe_item,
reorder_matches_by_upload_similarity
"""
import base64
import io
from unittest.mock import patch
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
