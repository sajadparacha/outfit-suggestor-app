"""Week plan storage: wardrobe photos are referenced, not copied, and history is capped."""
import json

from models.outfit import OutfitSuggestion
from models.week_plan import WeeklyPlanHistory, WeeklyPlanOutfit
from services.week_plan_service import (
    HISTORY_KEEP_PER_USER,
    WeekPlanService,
    without_matching_item_images,
)

PLAN_URL = "/api/week-plan"
HISTORY_URL = "/api/week-plan/history"


def _enable_monday(client, auth_headers):
    days = [
        {
            "day_of_week": dow,
            "enabled": dow == 0,
            "occasion": "work",
            "style": "classic",
            "use_wardrobe_only": True,
        }
        for dow in range(7)
    ]
    body = {
        "reminder_time": "07:30",
        "timezone": "UTC",
        "shared_style": "classic",
        "shared_season": "all-season",
        "days": days,
    }
    assert client.put(PLAN_URL, json=body, headers=auth_headers).status_code == 200


def _matched(item, **extra):
    return {
        "id": item.id,
        "category": item.category,
        "color": item.color,
        "description": item.description,
        **extra,
    }


def _save_monday_outfit(db, user_id, item):
    service = WeekPlanService()
    plan = service.get_plan(db, user_id)
    monday = next(d for d in plan.days if d.day_of_week == 0)
    suggestion = OutfitSuggestion(
        shirt="White oxford shirt",
        trouser="Navy chinos",
        blazer="",
        shoes="Brown loafers",
        belt="",
        reasoning="Clean office look",
        matching_wardrobe_items={"shirt": [_matched(item, image_data=item.image_data)]},
    )
    service.save_day_outfit(db, monday, suggestion)
    db.commit()


def _monday_shirt_match(plan_json):
    return plan_json["days"][0]["outfit"]["matching_wardrobe_items"]["shirt"][0]


class TestWeekPlanPhotoReferences:
    def test_saved_outfit_has_no_photo_but_response_does(
        self, client, db, auth_headers, test_user, wardrobe_item
    ):
        _enable_monday(client, auth_headers)
        _save_monday_outfit(db, test_user.id, wardrobe_item)

        row = db.query(WeeklyPlanOutfit).one()
        assert "image_data" not in row.outfit_json

        res = client.get(PLAN_URL, headers=auth_headers)
        assert res.status_code == 200
        match = _monday_shirt_match(res.json())
        assert match["id"] == wardrobe_item.id
        assert match["image_data"] == wardrobe_item.image_data

    def test_history_snapshot_has_no_photo_and_restore_reattaches_it(
        self, client, db, auth_headers, test_user, wardrobe_item
    ):
        _enable_monday(client, auth_headers)
        _save_monday_outfit(db, test_user.id, wardrobe_item)

        assert client.delete(PLAN_URL, headers=auth_headers).status_code == 200
        snapshot = db.query(WeeklyPlanHistory).one()
        assert "image_data" not in snapshot.plan_json
        stored = json.loads(snapshot.plan_json)
        assert _monday_shirt_match(stored)["id"] == wardrobe_item.id

        restored = client.post(f"{HISTORY_URL}/{snapshot.id}/restore", headers=auth_headers)
        assert restored.status_code == 200
        assert _monday_shirt_match(restored.json())["image_data"] == wardrobe_item.image_data
        assert "image_data" not in db.query(WeeklyPlanOutfit).one().outfit_json

    def test_legacy_row_with_embedded_photo_is_returned_unchanged(
        self, client, db, auth_headers, test_user, wardrobe_item
    ):
        _enable_monday(client, auth_headers)
        _save_monday_outfit(db, test_user.id, wardrobe_item)
        row = db.query(WeeklyPlanOutfit).one()
        payload = json.loads(row.outfit_json)
        payload["matching_wardrobe_items"]["shirt"][0]["image_data"] = "legacy-photo"
        row.outfit_json = json.dumps(payload)
        db.commit()

        res = client.get(PLAN_URL, headers=auth_headers)
        assert _monday_shirt_match(res.json())["image_data"] == "legacy-photo"

    def test_other_users_photos_are_not_attached(
        self, client, db, auth_headers, test_user, test_user2, wardrobe_item
    ):
        _enable_monday(client, auth_headers)
        _save_monday_outfit(db, test_user.id, wardrobe_item)
        wardrobe_item.user_id = test_user2.id
        db.commit()

        res = client.get(PLAN_URL, headers=auth_headers)
        assert not _monday_shirt_match(res.json()).get("image_data")


class TestWeekPlanHistoryCap:
    def test_keeps_only_newest_snapshots(self, client, db, auth_headers, test_user):
        _enable_monday(client, auth_headers)
        service = WeekPlanService()
        created = [service.snapshot_current(db, test_user.id).id for _ in range(HISTORY_KEEP_PER_USER + 3)]
        db.commit()

        kept = {
            row.id
            for row in db.query(WeeklyPlanHistory).filter(
                WeeklyPlanHistory.user_id == test_user.id
            )
        }
        assert kept == set(created[-HISTORY_KEEP_PER_USER:])


class TestWithoutMatchingItemImages:
    def test_returns_copy_without_photos(self):
        outfit = {
            "shirt": "x",
            "matching_wardrobe_items": {"shirt": [{"id": 1, "image_data": "abc"}], "belt": []},
        }
        slim = without_matching_item_images(outfit)
        assert slim["matching_wardrobe_items"] == {"shirt": [{"id": 1}], "belt": []}
        assert outfit["matching_wardrobe_items"]["shirt"][0]["image_data"] == "abc"

    def test_passes_through_non_dict_values(self):
        assert without_matching_item_images(None) is None
        assert without_matching_item_images({"shirt": "x"}) == {"shirt": "x"}
