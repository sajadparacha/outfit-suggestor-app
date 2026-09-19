"""Tests for POST /api/wardrobe/evaluate-fit."""

import pytest
from fastapi import status

from models.wardrobe import WardrobeItem
from services.wardrobe_fit_service import WardrobeFitService, build_goal_label


class TestWardrobeEvaluateFitEndpoint:
    def test_evaluate_fit_unauthorized(self, client):
        response = client.post(
            "/api/wardrobe/evaluate-fit",
            json={"wardrobe_item_id": 1},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_evaluate_fit_item_not_found(self, client, auth_headers):
        response = client.post(
            "/api/wardrobe/evaluate-fit",
            headers=auth_headers,
            json={"wardrobe_item_id": 999999},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_evaluate_fit_happy_path_pair_counts(self, client, auth_headers, db, test_user):
        blazer = WardrobeItem(
            user_id=test_user.id,
            category="blazer",
            color="Navy",
            description="Business single-breasted blazer",
            name="Navy blazer",
        )
        db.add(blazer)
        db.flush()
        shirts = [
            WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color="White",
                description="Formal oxford shirt",
            ),
            WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color="Light blue",
                description="Business casual shirt",
            ),
            WardrobeItem(
                user_id=test_user.id,
                category="shirt",
                color="Pink",
                description="Dress shirt",
            ),
        ]
        trousers = [
            WardrobeItem(
                user_id=test_user.id,
                category="trouser",
                color="Gray",
                description="Wool dress trousers",
            ),
            WardrobeItem(
                user_id=test_user.id,
                category="trouser",
                color="Beige",
                description="Chino trousers",
            ),
        ]
        db.add_all(shirts + trousers)
        db.commit()
        db.refresh(blazer)

        response = client.post(
            "/api/wardrobe/evaluate-fit",
            headers=auth_headers,
            json={
                "wardrobe_item_id": blazer.id,
                "dress_code": "smart-casual",
                "lifestyle_mix": ["work", "everyday"],
                "primary_lifestyle": "work",
                "style_primary": "classic",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload["candidate"]["id"] == blazer.id
        assert payload["candidate"]["category"] == "blazer"
        assert payload["goal"]["label"] == "business-casual"
        assert payload["verdict"] in {"strong_fit", "weak_fit", "redundant"}

        by_cat = {row["category"]: row for row in payload["pairs_with"]}
        assert "shirt" in by_cat
        assert by_cat["shirt"]["count"] == 3
        assert "trouser" in by_cat
        assert by_cat["trouser"]["count"] == 2
        assert payload["outfit_multiplier"] == sum(r["count"] for r in payload["pairs_with"])

        # Candidate must not appear in its own pair lists
        for row in payload["pairs_with"]:
            for item in row["items"]:
                assert item["id"] != blazer.id

        # Summary numbers must match factual counts
        summary = payload["summary_text"].lower()
        assert "three shirts" in summary or "3 shirts" in summary
        assert "two trousers" in summary or "2 trousers" in summary
        assert "business-casual" in summary
        # Shoes missing (none owned)
        assert payload["missing_for_goal"]["category"] == "shoes"
        assert payload["missing_for_goal"]["candidate_fills_this_gap"] is False
        assert "shoes" in summary

    def test_evaluate_fit_excludes_candidate_from_pairs(self, client, auth_headers, db, test_user):
        a = WardrobeItem(
            user_id=test_user.id,
            category="blazer",
            color="Navy",
            description="Blazer A",
        )
        b = WardrobeItem(
            user_id=test_user.id,
            category="blazer",
            color="Charcoal",
            description="Blazer B",
        )
        shirt = WardrobeItem(
            user_id=test_user.id,
            category="shirt",
            color="White",
            description="Shirt",
        )
        db.add_all([a, b, shirt])
        db.commit()
        db.refresh(a)

        response = client.post(
            "/api/wardrobe/evaluate-fit",
            headers=auth_headers,
            json={"wardrobe_item_id": a.id},
        )
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        # Other blazer is same slot — must not appear under pairs_with as blazer
        blazer_rows = [r for r in payload["pairs_with"] if r["category"] == "blazer"]
        assert blazer_rows == []
        shirt_row = next(r for r in payload["pairs_with"] if r["category"] == "shirt")
        assert shirt_row["count"] == 1

    def test_evaluate_fit_empty_wardrobe_attribute_candidate(self, client, auth_headers):
        response = client.post(
            "/api/wardrobe/evaluate-fit",
            headers=auth_headers,
            json={
                "category": "shoes",
                "color": "Black",
                "description": "Leather oxford shoes",
                "dress_code": "smart-casual",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload["pairs_with"] == []
        assert payload["outfit_multiplier"] == 0
        assert payload["missing_for_goal"]["candidate_fills_this_gap"] is True
        assert payload["missing_for_goal"]["category"] == "shoes"
        assert "missing" in payload["summary_text"].lower() or "piece" in payload["summary_text"].lower()

    def test_evaluate_fit_candidate_fills_gap(self, client, auth_headers, db, test_user):
        db.add_all(
            [
                WardrobeItem(
                    user_id=test_user.id,
                    category="shirt",
                    color="White",
                    description="Oxford",
                ),
                WardrobeItem(
                    user_id=test_user.id,
                    category="trouser",
                    color="Gray",
                    description="Wool trouser",
                ),
                WardrobeItem(
                    user_id=test_user.id,
                    category="blazer",
                    color="Navy",
                    description="Blazer",
                ),
            ]
        )
        shoes = WardrobeItem(
            user_id=test_user.id,
            category="shoes",
            color="Black",
            description="Oxford shoes",
        )
        db.add(shoes)
        db.commit()
        db.refresh(shoes)

        # Remove shoes from inventory sense: evaluate the shoes item — if we delete other shoes
        # and only have this one, "missing" might be belt. Seed no belt → belt is missing;
        # evaluate blazer when shoes exist → may fill or not.
        # Evaluate shoes when wardrobe has shirt/trouser/blazer but we use attribute path
        # for a second shoe color while owning one shoe — gap may be belt.
        response = client.post(
            "/api/wardrobe/evaluate-fit",
            headers=auth_headers,
            json={
                "category": "belt",
                "color": "Black",
                "description": "Leather belt",
                "dress_code": "business-professional",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload["missing_for_goal"]["category"] == "belt"
        assert payload["missing_for_goal"]["candidate_fills_this_gap"] is True


class TestWardrobeFitServiceUnit:
    def test_build_goal_label(self):
        assert build_goal_label("smart-casual", "work") == "business-casual"
        assert build_goal_label("business-professional", "work") == "business-professional"

    def test_summary_counts_match_pairs(self):
        service = WardrobeFitService()
        blazer = WardrobeItem(
            id=1,
            user_id=1,
            category="blazer",
            color="Navy",
            description="Blazer",
        )
        items = [
            WardrobeItem(id=2, user_id=1, category="shirt", color="White", description="Shirt"),
            WardrobeItem(id=3, user_id=1, category="shirt", color="Blue", description="Shirt"),
            WardrobeItem(id=4, user_id=1, category="trouser", color="Gray", description="Trouser"),
            WardrobeItem(id=5, user_id=1, category="trouser", color="Black", description="Trouser"),
        ]
        result = service.evaluate(
            candidate=blazer,
            wardrobe_items=[blazer] + items,
            dress_code="smart-casual",
        )
        by_cat = {r["category"]: r["count"] for r in result["pairs_with"]}
        assert by_cat.get("shirt") == 2
        assert by_cat.get("trouser") == 2
        summary = result["summary_text"].lower()
        assert "two shirts" in summary
        assert "two trousers" in summary
