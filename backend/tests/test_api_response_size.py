"""History pagination / wardrobe filter, 256px thumbnails in list responses, gzip."""
import base64
import io
import random

from PIL import Image
from sqlalchemy import text

from models.outfit import OutfitSuggestion
from models.wardrobe import WardrobeItem
from services.outfit_service import OutfitService
from utils.image_processor import THUMBNAIL_MAX_PX, make_thumbnail


def _photo_b64(seed: int, size=(800, 600)) -> str:
    rng = random.Random(seed)
    img = Image.new("RGB", (32, 24))
    img.putdata([(rng.randrange(256), rng.randrange(256), rng.randrange(256)) for _ in range(32 * 24)])
    img = img.resize(size)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode()


def _dimensions(image_b64: str):
    return Image.open(io.BytesIO(base64.b64decode(image_b64))).size


def _add_item(db, user, seed=1, category="shirt", image_data=None, with_thumbnail=True) -> WardrobeItem:
    photo = image_data if image_data is not None else _photo_b64(seed)
    item = WardrobeItem(
        user_id=user.id,
        category=category,
        color="Blue",
        description=f"Item {seed}",
        image_data=photo,
        image_thumbnail=make_thumbnail(photo) if with_thumbnail else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _save_history(db, user, image_data=None, image_from_wardrobe=False, **ids):
    suggestion = OutfitSuggestion(
        shirt="s", trouser="t", blazer="b", shoes="sh", belt="be", reasoning="r", **ids
    )
    OutfitService().save_outfit_history(
        db=db, user_id=user.id, text_input="", image_data=image_data,
        model_image=None, suggestion=suggestion, image_from_wardrobe=image_from_wardrobe,
    )
    return db.execute(text("SELECT MAX(id) FROM outfit_history")).scalar()


def _history(client, headers, **params):
    response = client.get("/api/outfit-history", headers=headers, params=params)
    assert response.status_code == 200, response.text
    return response.json()


class TestMakeThumbnail:
    def test_fits_within_256px_and_keeps_aspect(self):
        thumb = make_thumbnail(_photo_b64(1, size=(1024, 512)))
        width, height = _dimensions(thumb)
        assert max(width, height) == THUMBNAIL_MAX_PX
        assert (width, height) == (256, 128)

    def test_much_smaller_than_source(self):
        photo = _photo_b64(2, size=(1024, 1024))
        assert len(make_thumbnail(photo)) < len(photo) / 4

    def test_invalid_or_empty_returns_none(self):
        assert make_thumbnail(None) is None
        assert make_thumbnail("") is None
        assert make_thumbnail("not-an-image") is None


class TestHistoryPagination:
    def test_default_page_is_20_newest_first(self, client, auth_headers, db, test_user):
        ids = [_save_history(db, test_user) for _ in range(25)]
        page = _history(client, auth_headers)
        assert [e["id"] for e in page] == list(reversed(ids))[:20]

    def test_offset_and_limit_pages_do_not_overlap(self, client, auth_headers, db, test_user):
        ids = [_save_history(db, test_user) for _ in range(7)]
        first = _history(client, auth_headers, limit=3, offset=0)
        second = _history(client, auth_headers, limit=3, offset=3)
        last = _history(client, auth_headers, limit=3, offset=6)
        newest_first = list(reversed(ids))
        assert [e["id"] for e in first] == newest_first[0:3]
        assert [e["id"] for e in second] == newest_first[3:6]
        assert [e["id"] for e in last] == newest_first[6:7]

    def test_limit_is_clamped_to_100(self, client, auth_headers, db, test_user):
        for _ in range(102):
            _save_history(db, test_user)
        assert len(_history(client, auth_headers, limit=200)) == 100

    def test_invalid_paging_is_rejected(self, client, auth_headers):
        assert client.get("/api/outfit-history?limit=0", headers=auth_headers).status_code == 422
        assert client.get("/api/outfit-history?offset=-1", headers=auth_headers).status_code == 422

    def test_guest_gets_empty_list(self, client):
        assert _history(client, {}) == []


class TestHistoryWardrobeFilter:
    def test_matches_slot_source_and_identical_legacy_photo(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user, seed=1)
        other = _add_item(db, test_user, seed=2, category="trouser")
        by_slot = _save_history(db, test_user, shirt_id=item.id, trouser_id=other.id)
        by_outerwear_slot = _save_history(db, test_user, outerwear_id=item.id)
        by_source = _save_history(
            db, test_user, image_data=item.image_data, image_from_wardrobe=True,
            source_wardrobe_item_id=item.id,
        )
        legacy_same_photo = _save_history(db, test_user, image_data=item.image_data)
        _save_history(db, test_user, trouser_id=other.id)
        _save_history(db, test_user, image_data=_photo_b64(9))

        entries = _history(client, auth_headers, wardrobe_item_id=item.id)
        assert {e["id"] for e in entries} == {by_slot, by_outerwear_slot, by_source, legacy_same_photo}

    def test_filter_paginates(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user)
        ids = [_save_history(db, test_user, shirt_id=item.id) for _ in range(5)]
        _save_history(db, test_user)
        page = _history(client, auth_headers, wardrobe_item_id=item.id, limit=2, offset=2)
        assert [e["id"] for e in page] == list(reversed(ids))[2:4]

    def test_other_users_item_photo_does_not_match(self, client, auth_headers, db, test_user, test_user2):
        foreign = _add_item(db, test_user2)
        _save_history(db, test_user, image_data=foreign.image_data)
        assert _history(client, auth_headers, wardrobe_item_id=foreign.id) == []


class TestHistoryThumbnails:
    def test_list_returns_thumbnail_not_full_photo(self, client, auth_headers, db, test_user):
        photo = _photo_b64(3)
        _save_history(db, test_user, image_data=photo)
        (entry,) = _history(client, auth_headers)
        assert entry["image_data"] is None
        assert max(_dimensions(entry["image_thumbnail"])) <= THUMBNAIL_MAX_PX

    def test_matched_wardrobe_items_have_thumbnails_only(self, client, auth_headers, db, test_user):
        shirt = _add_item(db, test_user, seed=1, category="shirt")
        trouser = _add_item(db, test_user, seed=2, category="trouser")
        _save_history(db, test_user, shirt_id=shirt.id, trouser_id=trouser.id)
        (entry,) = _history(client, auth_headers)
        matched = entry["matching_wardrobe_items"]
        for slot, item in (("shirt", shirt), ("trouser", trouser)):
            (match,) = matched[slot]
            assert match["id"] == item.id
            assert match["image_data"] is None
            assert match["image_thumbnail"] == item.image_thumbnail

    def test_wardrobe_referenced_photo_uses_item_thumbnail(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user)
        _save_history(
            db, test_user, image_data=item.image_data, image_from_wardrobe=True,
            source_wardrobe_item_id=item.id,
        )
        (entry,) = _history(client, auth_headers)
        assert entry["image_data"] is None
        assert entry["image_thumbnail"] == item.image_thumbnail

    def test_legacy_rows_are_backfilled_on_read(self, client, auth_headers, db, test_user):
        entry_id = _save_history(db, test_user, image_data=_photo_b64(4))
        legacy_item = _add_item(db, test_user, seed=5, with_thumbnail=False)
        db.execute(text("UPDATE outfit_history SET image_thumbnail = NULL WHERE id = :id"), {"id": entry_id})
        db.execute(text("UPDATE outfit_history SET shirt_id = :sid WHERE id = :id"), {"sid": legacy_item.id, "id": entry_id})
        db.commit()

        (entry,) = _history(client, auth_headers)
        assert entry["image_thumbnail"]
        assert entry["matching_wardrobe_items"]["shirt"][0]["image_thumbnail"]
        stored = db.execute(
            text("SELECT image_thumbnail FROM outfit_history WHERE id = :id"), {"id": entry_id}
        ).scalar()
        assert stored == entry["image_thumbnail"]
        db.refresh(legacy_item)
        assert legacy_item.image_thumbnail

    def test_include_images_false_omits_all_photos(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user)
        _save_history(db, test_user, image_data=_photo_b64(6), shirt_id=item.id)
        (entry,) = _history(client, auth_headers, include_images="false")
        assert entry["image_data"] is None
        assert entry["image_thumbnail"] is None
        assert entry["model_image"] is None
        assert entry["matching_wardrobe_items"]["shirt"][0]["image_thumbnail"] is None
        assert entry["shirt_id"] == item.id


class TestHistoryDetail:
    def test_returns_full_photo_and_thumbnail(self, client, auth_headers, db, test_user):
        photo = _photo_b64(7)
        entry_id = _save_history(db, test_user, image_data=photo)
        response = client.get(f"/api/outfit-history/{entry_id}", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == entry_id
        assert body["image_data"] == photo
        assert body["image_thumbnail"]

    def test_wardrobe_referenced_photo_is_resolved(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user)
        entry_id = _save_history(
            db, test_user, image_data=item.image_data, image_from_wardrobe=True,
            source_wardrobe_item_id=item.id,
        )
        body = client.get(f"/api/outfit-history/{entry_id}", headers=auth_headers).json()
        assert body["image_data"] == item.image_data
        assert body["image_thumbnail"] == item.image_thumbnail

    def test_other_users_entry_is_404(self, client, auth_headers, db, test_user2):
        entry_id = _save_history(db, test_user2, image_data=_photo_b64(8))
        response = client.get(f"/api/outfit-history/{entry_id}", headers=auth_headers)
        assert response.status_code == 404

    def test_requires_login(self, client, db, test_user):
        entry_id = _save_history(db, test_user)
        assert client.get(f"/api/outfit-history/{entry_id}").status_code == 401


class TestWardrobeThumbnails:
    def test_list_returns_thumbnails_and_detail_full_photo(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user)
        listed = client.get("/api/wardrobe", headers=auth_headers).json()["items"][0]
        assert listed["image_data"] is None
        assert listed["image_thumbnail"] == item.image_thumbnail

        detail = client.get(f"/api/wardrobe/{item.id}", headers=auth_headers).json()
        assert detail["image_data"] == item.image_data
        assert detail["image_thumbnail"] == item.image_thumbnail

    def test_legacy_item_is_backfilled_on_list(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user, with_thumbnail=False)
        listed = client.get("/api/wardrobe", headers=auth_headers).json()["items"][0]
        assert max(_dimensions(listed["image_thumbnail"])) <= THUMBNAIL_MAX_PX
        db.refresh(item)
        assert item.image_thumbnail == listed["image_thumbnail"]

    def test_add_and_replace_photo_store_thumbnail(self, client, auth_headers, db, test_user):
        photo = base64.b64decode(_photo_b64(10))
        response = client.post(
            "/api/wardrobe",
            data={"category": "shirt", "color": "Blue", "description": "Oxford"},
            files={"image": ("p.jpg", io.BytesIO(photo), "image/jpeg")},
            headers=auth_headers,
        )
        assert response.status_code == 201, response.text
        created = response.json()
        assert created["image_data"]
        assert max(_dimensions(created["image_thumbnail"])) <= THUMBNAIL_MAX_PX

        new_photo = base64.b64decode(_photo_b64(11))
        response = client.put(
            f"/api/wardrobe/{created['id']}",
            files={"image": ("p.jpg", io.BytesIO(new_photo), "image/jpeg")},
            headers=auth_headers,
        )
        assert response.status_code == 200, response.text
        assert response.json()["image_thumbnail"] != created["image_thumbnail"]


class TestGzip:
    def test_large_json_responses_are_gzipped(self, client, auth_headers, db, test_user):
        for seed in range(3):
            _add_item(db, test_user, seed=seed)
        response = client.get(
            "/api/wardrobe", headers={**auth_headers, "Accept-Encoding": "gzip"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-encoding") == "gzip"
        assert len(response.json()["items"]) == 3
