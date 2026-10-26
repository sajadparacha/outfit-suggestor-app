"""outfit_history stores wardrobe photos by reference and model images as JPEG."""
import asyncio
import base64
import io
import random
from types import SimpleNamespace

from PIL import Image
from sqlalchemy import text

from controllers.outfit_controller import OutfitController
from models.outfit import OutfitSuggestion
from models.wardrobe import WardrobeItem
from services.outfit_service import OutfitService
from utils.image_processor import compress_generated_image


def _noise_jpeg(seed: int, size=(64, 64)) -> bytes:
    rng = random.Random(seed)
    img = Image.new("RGB", size)
    img.putdata([(rng.randrange(256), rng.randrange(256), rng.randrange(256)) for _ in range(size[0] * size[1])])
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def _gradient_png_b64(size=(256, 448), mode="RGB") -> str:
    img = Image.new(mode, size)
    w, h = size
    if mode == "RGBA":
        rng = random.Random(7)
        img.putdata([(x % 256, y % 256, rng.randrange(256), 128) for y in range(h) for x in range(w)])
    else:
        img.putdata([(x % 256, y % 256, (x * y) % 256) for y in range(h) for x in range(w)])
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _add_item(db, user, seed=1, category="shirt") -> WardrobeItem:
    item = WardrobeItem(
        user_id=user.id,
        category=category,
        color="Blue",
        description=f"Item {seed}",
        image_data=base64.b64encode(_noise_jpeg(seed)).decode(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _history_rows(db):
    return db.execute(
        text("SELECT id, image_data, image_from_wardrobe, source_wardrobe_item_id FROM outfit_history ORDER BY id")
    ).fetchall()


def _history_api(client, auth_headers):
    response = client.get("/api/outfit-history", headers=auth_headers)
    assert response.status_code == 200
    return response.json()


def _history_detail(client, auth_headers):
    entry_id = _history_api(client, auth_headers)[0]["id"]
    response = client.get(f"/api/outfit-history/{entry_id}", headers=auth_headers)
    assert response.status_code == 200, response.text
    return response.json()


def _suggest_from_item(client, auth_headers, item_id):
    response = client.post(
        f"/api/suggest-outfit-from-wardrobe-item/{item_id}",
        data={"text_input": "", "generate_model_image": "false"},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text


def _upload(client, auth_headers, image_bytes, source_id=None):
    data = {"text_input": "", "generate_model_image": "false"}
    if source_id is not None:
        data["source_wardrobe_item_id"] = str(source_id)
    response = client.post(
        "/api/suggest-outfit",
        files={"image": ("photo.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        data=data,
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text


class TestWardrobePhotoByReference:
    def test_suggest_from_wardrobe_item_stores_reference_and_returns_photo(
        self, client, auth_headers, db, test_user
    ):
        item = _add_item(db, test_user)
        _suggest_from_item(client, auth_headers, item.id)

        (row,) = _history_rows(db)
        assert row.image_data is None
        assert row.image_from_wardrobe
        assert row.source_wardrobe_item_id == item.id
        assert _history_detail(client, auth_headers)["image_data"] == item.image_data

    def test_upload_of_wardrobe_photo_stores_reference(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user)
        _upload(client, auth_headers, base64.b64decode(item.image_data), source_id=item.id)

        (row,) = _history_rows(db)
        assert row.image_data is None
        assert row.image_from_wardrobe
        assert _history_detail(client, auth_headers)["image_data"] == item.image_data

    def test_upload_of_different_photo_keeps_its_own_copy(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user, seed=1)
        _upload(client, auth_headers, _noise_jpeg(2), source_id=item.id)

        (row,) = _history_rows(db)
        assert row.image_data
        assert not row.image_from_wardrobe
        assert _history_detail(client, auth_headers)["image_data"] == row.image_data

    def test_upload_without_source_item_keeps_photo(self, client, auth_headers, db, test_user):
        _add_item(db, test_user)
        _upload(client, auth_headers, _noise_jpeg(1))

        (row,) = _history_rows(db)
        assert row.image_data
        assert not row.image_from_wardrobe

    def test_rows_without_flag_are_not_given_a_photo(self, client, auth_headers, db, test_user):
        """Week-plan and multi-item rows reference an item but never had an input photo."""
        item = _add_item(db, test_user)
        suggestion = OutfitSuggestion(
            shirt="s", trouser="t", blazer="b", shoes="sh", belt="be", reasoning="r",
            source_wardrobe_item_id=item.id,
        )
        OutfitService().save_outfit_history(
            db=db, user_id=test_user.id, text_input="", image_data=None,
            model_image=None, suggestion=suggestion,
        )
        assert _history_detail(client, auth_headers)["image_data"] is None

    def test_photo_is_not_read_from_another_users_item(self, client, auth_headers, db, test_user, test_user2):
        other_item = _add_item(db, test_user2)
        suggestion = OutfitSuggestion(
            shirt="s", trouser="t", blazer="b", shoes="sh", belt="be", reasoning="r",
            source_wardrobe_item_id=other_item.id,
        )
        OutfitService().save_outfit_history(
            db=db, user_id=test_user.id, text_input="", image_data=other_item.image_data,
            model_image=None, suggestion=suggestion, image_from_wardrobe=True,
        )
        assert _history_detail(client, auth_headers)["image_data"] is None

    def test_deleting_wardrobe_item_copies_photo_into_history(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user)
        photo = item.image_data
        _suggest_from_item(client, auth_headers, item.id)

        response = client.delete(f"/api/wardrobe/{item.id}", headers=auth_headers)
        assert response.status_code == 200, response.text

        (row,) = _history_rows(db)
        assert row.image_data == photo
        assert not row.image_from_wardrobe
        assert _history_detail(client, auth_headers)["image_data"] == photo

    def test_replacing_wardrobe_photo_keeps_old_photo_in_history(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user)
        old_photo = item.image_data
        _suggest_from_item(client, auth_headers, item.id)

        from services.wardrobe_service import WardrobeService

        WardrobeService().update_wardrobe_item(
            db, item.id, test_user.id, image_data=base64.b64encode(_noise_jpeg(9)).decode()
        )

        (row,) = _history_rows(db)
        assert row.image_data == old_photo
        assert _history_detail(client, auth_headers)["image_data"] == old_photo

    def test_editing_other_fields_keeps_reference(self, db, test_user):
        item = _add_item(db, test_user)
        suggestion = OutfitSuggestion(
            shirt="s", trouser="t", blazer="b", shoes="sh", belt="be", reasoning="r",
            source_wardrobe_item_id=item.id,
        )
        OutfitService().save_outfit_history(
            db=db, user_id=test_user.id, text_input="", image_data=item.image_data,
            model_image=None, suggestion=suggestion, image_from_wardrobe=True,
        )
        from services.wardrobe_service import WardrobeService

        WardrobeService().update_wardrobe_item(
            db, item.id, test_user.id, color="Green", image_data=item.image_data
        )
        (row,) = _history_rows(db)
        assert row.image_data is None
        assert row.image_from_wardrobe

    def test_similar_photo_match_returns_python_bool(self, db, test_user, monkeypatch):
        """psycopg2 cannot bind numpy.bool_; perceptual-hash matches must yield bool."""
        import imagehash
        import numpy as np

        # NumPy 2 makes ImageHash subtraction return numpy.int64 instead of int.
        original_sub = imagehash.ImageHash.__sub__
        monkeypatch.setattr(
            imagehash.ImageHash, "__sub__", lambda self, other: np.int64(original_sub(self, other))
        )
        item = _add_item(db, test_user)
        reencoded = io.BytesIO()
        Image.open(io.BytesIO(base64.b64decode(item.image_data))).save(reencoded, format="JPEG", quality=60)
        upload = base64.b64encode(reencoded.getvalue()).decode()
        assert upload != item.image_data

        from services.wardrobe_service import WardrobeService

        matched = OutfitService().is_wardrobe_photo(upload, item)
        assert matched is True
        assert type(WardrobeService()._images_are_similar(upload, item.image_data, 5)) is bool

    def test_duplicate_check_matches_referenced_wardrobe_photo(self, client, auth_headers, db, test_user):
        item = _add_item(db, test_user)
        _suggest_from_item(client, auth_headers, item.id)

        response = client.post(
            "/api/check-duplicate",
            files={"image": ("photo.jpg", io.BytesIO(base64.b64decode(item.image_data)), "image/jpeg")},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["is_duplicate"] is True


class TestModelImageCompression:
    def test_png_is_reencoded_as_smaller_jpeg_same_size(self):
        png = _gradient_png_b64()
        out = compress_generated_image(png)
        assert len(out) < len(png)
        img = Image.open(io.BytesIO(base64.b64decode(out)))
        assert img.format == "JPEG"
        assert img.size == (256, 448)

    def test_transparent_png_is_flattened(self):
        out = compress_generated_image(_gradient_png_b64(mode="RGBA"))
        assert Image.open(io.BytesIO(base64.b64decode(out))).mode == "RGB"

    def test_invalid_or_empty_input_is_returned_unchanged(self):
        assert compress_generated_image(None) is None
        assert compress_generated_image("") == ""
        assert compress_generated_image("not-an-image") == "not-an-image"

    def test_generate_model_image_returns_jpeg(self):
        png = _gradient_png_b64()
        ai = SimpleNamespace(generate_model_image=lambda *a, **k: (png, 0.04))
        result, cost = asyncio.run(
            OutfitController(ai, OutfitService())._generate_model_image(SimpleNamespace(), "x", None)
        )
        assert cost == 0.04
        assert Image.open(io.BytesIO(base64.b64decode(result))).format == "JPEG"

    def test_generate_model_image_failure_returns_none_and_zero_cost(self):
        def boom(*a, **k):
            raise RuntimeError("down")

        result = asyncio.run(
            OutfitController(SimpleNamespace(generate_model_image=boom), OutfitService())._generate_model_image(
                SimpleNamespace(), "x", None
            )
        )
        assert result == (None, 0.0)


class TestCleanupScript:
    def test_cleanup_references_matching_photos_and_compresses_model_images(self, db, test_user):
        import migrate_slim_outfit_history as script

        item = _add_item(db, test_user, seed=1)
        service = OutfitService()
        reupload = base64.b64encode(_noise_jpeg(1)).decode()
        png = _gradient_png_b64()

        def save(image, model_image=None):
            service.save_outfit_history(
                db=db, user_id=test_user.id, text_input="", image_data=image, model_image=model_image,
                suggestion=OutfitSuggestion(
                    shirt="s", trouser="t", blazer="b", shoes="sh", belt="be", reasoning="r",
                    source_wardrobe_item_id=item.id,
                ),
            )

        save(item.image_data)
        save(reupload, model_image=png)
        save(base64.b64encode(_noise_jpeg(2)).decode())

        conn = db.connection()
        changed, kept, _ = script._reference_wardrobe_photos(conn, dry_run=False, has_flag=True)
        assert (changed, kept) == (2, 1)
        assert script._compress_model_images(conn, dry_run=False)[0] == 1

        rows = _history_rows(db)
        assert [r.image_from_wardrobe for r in rows] == [True, True, False]
        assert [r.image_data is None for r in rows] == [True, True, False]
        model = db.execute(text("SELECT model_image FROM outfit_history WHERE id = :id"), {"id": rows[1].id}).scalar()
        assert Image.open(io.BytesIO(base64.b64decode(model))).format == "JPEG"

    def test_cleanup_dry_run_changes_nothing(self, db, test_user):
        import migrate_slim_outfit_history as script

        item = _add_item(db, test_user)
        OutfitService().save_outfit_history(
            db=db, user_id=test_user.id, text_input="", image_data=item.image_data,
            model_image=_gradient_png_b64(),
            suggestion=OutfitSuggestion(
                shirt="s", trouser="t", blazer="b", shoes="sh", belt="be", reasoning="r",
                source_wardrobe_item_id=item.id,
            ),
        )
        conn = db.connection()
        assert script._reference_wardrobe_photos(conn, dry_run=True, has_flag=True)[0] == 1
        assert script._compress_model_images(conn, dry_run=True)[0] == 1
        (row,) = _history_rows(db)
        assert row.image_data == item.image_data
        assert not row.image_from_wardrobe
