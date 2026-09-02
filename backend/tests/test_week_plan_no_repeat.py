"""Hard no-repeat of wardrobe items across week-plan days."""
import json

from models.outfit import OutfitSuggestion
from models.week_plan import WeeklyPlan, WeeklyPlanDay, WeeklyPlanOutfit, WeeklyPlanOutfit
from services.week_plan_service import (
    WeekPlanService,
    bind_missing_slot_ids_from_matches,
    parse_pinned_items,
    pinned_item_ids,
    scrub_reused_slot_ids,
    serialize_pinned_items,
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


def _plan_with_days(*days: WeeklyPlanDay) -> WeeklyPlan:
    return WeeklyPlan(user_id=1, days=list(days))


def test_collect_used_item_ids_includes_pins_without_outfit():
    mon = WeeklyPlanDay(
        day_of_week=0,
        enabled=True,
        pinned_items_json=serialize_pinned_items({"shirt": 42}),
    )
    tue = WeeklyPlanDay(
        day_of_week=1,
        enabled=True,
        pinned_items_json="{}",
        outfit=None,
    )
    plan = _plan_with_days(mon, tue)
    used = WeekPlanService().collect_used_item_ids(plan, exclude_day=1)
    assert used == [42]


def test_collect_used_item_ids_unions_outfit_and_pins():
    day = WeeklyPlanDay(
        day_of_week=0,
        enabled=True,
        pinned_items_json=serialize_pinned_items({"shoes": 5}),
    )
    day.outfit = WeeklyPlanOutfit(
        day_id=1,
        summary="Test",
        outfit_json="{}",
        wardrobe_item_ids_json=json.dumps([10, 20]),
    )
    plan = _plan_with_days(day)
    used = WeekPlanService().collect_used_item_ids(plan)
    assert used == [5, 10, 20]


def test_full_week_pin_seed_excludes_later_pins_from_earlier_day_scrub():
    """Pins on later days must be in used_ids but not scrub current day's own pins."""
    mon = WeeklyPlanDay(
        day_of_week=0,
        pinned_items_json=serialize_pinned_items({"shirt": 10}),
    )
    fri = WeeklyPlanDay(
        day_of_week=4,
        pinned_items_json=serialize_pinned_items({"trouser": 20}),
    )
    plan = _plan_with_days(mon, fri)

    used_ids: list[int] = []
    seen: set[int] = set()
    for d in plan.days:
        for i in pinned_item_ids(d):
            if i not in seen:
                seen.add(i)
                used_ids.append(i)
    assert used_ids == [10, 20]

    day_pin_ids = set(parse_pinned_items(mon).values())
    exclude_set = set(used_ids) - day_pin_ids
    assert exclude_set == {20}

    suggestion = OutfitSuggestion(
        shirt="Blue shirt",
        trouser="Khaki trousers",
        blazer="",
        shoes="Brown shoes",
        belt="",
        reasoning="Test",
        shirt_id=10,
        trouser_id=21,
        matching_wardrobe_items={
            "shirt": [{"id": 10}, {"id": 11}],
            "trouser": [{"id": 21}],
        },
    )
    scrub_reused_slot_ids(suggestion, exclude_set)
    assert suggestion.shirt_id == 10
    assert suggestion.trouser_id == 21


def test_same_item_pinned_on_two_days_not_scrubbed():
    mon = WeeklyPlanDay(
        day_of_week=0,
        pinned_items_json=serialize_pinned_items({"shirt": 10}),
    )
    fri = WeeklyPlanDay(
        day_of_week=4,
        pinned_items_json=serialize_pinned_items({"shirt": 10}),
    )
    plan = _plan_with_days(mon, fri)
    used_ids = WeekPlanService().collect_used_item_ids(plan, exclude_day=4)

    day_pin_ids = set(parse_pinned_items(fri).values())
    exclude_set = set(used_ids) - day_pin_ids
    assert 10 not in exclude_set

    suggestion = OutfitSuggestion(
        shirt="Blue shirt",
        trouser="Khaki trousers",
        blazer="",
        shoes="Brown shoes",
        belt="",
        reasoning="Test",
        shirt_id=10,
        matching_wardrobe_items={"shirt": [{"id": 10}, {"id": 11}]},
    )
    scrub_reused_slot_ids(suggestion, exclude_set)
    assert suggestion.shirt_id == 10


def test_prune_invalid_pins_drops_unowned(db, test_user):
    plan = WeeklyPlan(
        user_id=test_user.id,
        reminder_time="07:30",
        timezone="UTC",
        shared_style="classic",
        shared_season="all-season",
    )
    db.add(plan)
    db.flush()
    day = WeeklyPlanDay(
        plan_id=plan.id,
        day_of_week=0,
        enabled=True,
        pinned_items_json=serialize_pinned_items({"shirt": 99999}),
    )
    db.add(day)
    db.commit()

    svc = WeekPlanService()
    refreshed = svc.get_plan(db, test_user.id)
    assert refreshed is not None
    messages = svc.prune_invalid_pins(db, test_user.id, refreshed)
    assert messages
    assert parse_pinned_items(refreshed.days[0]) == {}


def test_put_persists_pinned_items(client, auth_headers):
    body = {
        "reminder_time": "07:30",
        "timezone": "UTC",
        "shared_style": "classic",
        "shared_season": "all-season",
        "days": [
            {
                "day_of_week": dow,
                "enabled": dow == 0,
                "occasion": "everyday",
                "style": "classic",
                "use_wardrobe_only": True,
                "pinned_items": {"shirt": 7} if dow == 0 else {},
            }
            for dow in range(7)
        ],
    }
    res = client.put("/api/week-plan", json=body, headers=auth_headers)
    assert res.status_code == 200
    mon = res.json()["days"][0]
    assert mon["pinned_items"] == {"shirt": 7}

    get = client.get("/api/week-plan", headers=auth_headers)
    assert get.json()["days"][0]["pinned_items"] == {"shirt": 7}


def test_generate_drops_invalid_pins_message(client, auth_headers, wardrobe_item):
    body = {
        "reminder_time": "07:30",
        "timezone": "UTC",
        "shared_style": "classic",
        "shared_season": "all-season",
        "days": [
            {
                "day_of_week": dow,
                "enabled": dow == 0,
                "occasion": "everyday",
                "style": "classic",
                "use_wardrobe_only": True,
                "pinned_items": {"shirt": 888888} if dow == 0 else {},
            }
            for dow in range(7)
        ],
    }
    client.put("/api/week-plan", json=body, headers=auth_headers)
    gen = client.post("/api/week-plan/generate", json={}, headers=auth_headers)
    assert gen.status_code == 200
    data = gen.json()
    assert data.get("message")
    assert "no longer own" in data["message"].lower()
    assert data["days"][0]["pinned_items"] == {}
