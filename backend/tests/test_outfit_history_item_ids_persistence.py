from sqlalchemy import text

from models.outfit import OutfitSuggestion
from services.outfit_service import OutfitService


def test_save_outfit_history_persists_selected_item_ids(db, test_user):
    service = OutfitService()
    suggestion = OutfitSuggestion(
        shirt="White oxford shirt",
        trouser="Navy chinos",
        blazer="Grey blazer",
        shoes="Brown loafers",
        belt="Brown belt",
        reasoning="Balanced smart casual outfit.",
        sweater="Navy merino sweater",
        outerwear="Olive field jacket",
        tie="Burgundy silk tie",
        shirt_id=11,
        trouser_id=22,
        blazer_id=33,
        shoes_id=44,
        belt_id=55,
        sweater_id=66,
        outerwear_id=77,
        tie_id=88,
        source_wardrobe_item_id=11,
    )

    service.save_outfit_history(
        db=db,
        user_id=test_user.id,
        text_input="business casual",
        image_data="base64-image",
        model_image=None,
        suggestion=suggestion,
    )

    row = db.execute(
        text(
            """
            SELECT shirt_id, trouser_id, blazer_id, shoes_id, belt_id,
                   sweater, outerwear, tie, sweater_id, outerwear_id, tie_id,
                   source_wardrobe_item_id
            FROM outfit_history
            ORDER BY id DESC
            LIMIT 1
            """
        )
    ).fetchone()
    assert row is not None
    assert row.shirt_id == 11
    assert row.trouser_id == 22
    assert row.blazer_id == 33
    assert row.shoes_id == 44
    assert row.belt_id == 55
    assert row.sweater == "Navy merino sweater"
    assert row.outerwear == "Olive field jacket"
    assert row.tie == "Burgundy silk tie"
    assert row.sweater_id == 66
    assert row.outerwear_id == 77
    assert row.tie_id == 88
    assert row.source_wardrobe_item_id == 11
