from datetime import datetime

import pytest

from services.ai_service import AIService


class DummyWardrobeItem:
    def __init__(
        self,
        *,
        id: int,
        category: str,
        name: str | None = None,
        color: str | None = None,
        description: str | None = None,
        brand: str | None = None,
        size: str | None = None,
        tags: str | None = None,
        condition: str | None = None,
        purchase_date: datetime | None = None,
        last_worn: datetime | None = None,
        wear_count: int | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        image_data: str | None = None,
    ):
        self.id = id
        self.category = category
        self.name = name
        self.color = color
        self.description = description
        self.brand = brand
        self.size = size
        self.tags = tags
        self.condition = condition
        self.purchase_date = purchase_date
        self.last_worn = last_worn
        self.wear_count = wear_count
        self.created_at = created_at
        self.updated_at = updated_at
        self.image_data = image_data


def test_ai_prompt_excludes_wardrobe_images_and_sensitive_fields():
    ai = AIService(api_key="test-key")

    base64_secret = "BASE64_SECRET_SHOULD_NOT_BE_SENT"
    item = DummyWardrobeItem(
        id=123,
        category="shirt",
        name="Example Shirt",
        color="Blue",
        description="A test description",
        brand="BrandX",
        size="M",
        tags="casual,summer",
        condition="good",
        purchase_date=datetime(2024, 1, 2, 3, 4, 5),
        last_worn=datetime(2024, 5, 6, 7, 8, 9),
        wear_count=12,
        created_at=datetime(2024, 2, 2, 1, 1, 1),
        updated_at=datetime(2024, 3, 3, 2, 2, 2),
        image_data=base64_secret,
    )

    wardrobe_items = {"shirt": [item]}
    prompt = ai._build_prompt(  # type: ignore[attr-defined]
        text_input="Occasion: casual",
        wardrobe_items=wardrobe_items,
        wardrobe_only=True,
    )

    # Primary key should be included
    assert "ID: 123" in prompt

    # Wardrobe images should never be sent to AI
    assert base64_secret not in prompt
    assert "image_data" not in prompt

    # Sensitive fields removed from prompt
    assert "Wear count" not in prompt
    assert "Created at" not in prompt
    assert "Updated at" not in prompt

    # Response schema should include primary key fields
    assert "\"shirt_id\"" in prompt
    assert "\"trouser_id\"" in prompt
    assert "\"blazer_id\"" in prompt
    assert "\"shoes_id\"" in prompt
    assert "\"belt_id\"" in prompt

