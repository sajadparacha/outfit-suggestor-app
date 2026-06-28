import asyncio

import pytest
from fastapi import HTTPException

from controllers.outfit_controller import OutfitController
from models.outfit import OutfitSuggestion
from services.outfit_service import OutfitService


class FailingModelImageAIService:
    def generate_model_image(self, *args, **kwargs):
        raise HTTPException(status_code=500, detail="DALL-E 3 unavailable")


def test_generate_model_image_returns_tuple_when_dalle_fails():
    controller = OutfitController(FailingModelImageAIService(), OutfitService())
    suggestion = OutfitSuggestion(
        shirt="Blue shirt",
        trouser="Gray trousers",
        blazer="Navy blazer",
        shoes="Brown shoes",
        belt="Brown belt",
        reasoning="Test",
    )

    image, cost = asyncio.run(
        controller._generate_model_image(
            suggestion,
            uploaded_image_base64="dGVzdA==",
            location=None,
            model="dalle3",
        )
    )

    assert image is None
    assert cost == 0.0
