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
        shirt_id=11,
        trouser_id=22,
        blazer_id=33,
        shoes_id=44,
        belt_id=55,
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
            SELECT shirt_id, trouser_id, blazer_id, shoes_id, belt_id, source_wardrobe_item_id
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
    assert row.source_wardrobe_item_id == 11
