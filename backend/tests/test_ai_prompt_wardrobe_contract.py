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
    assert "\"source_slot\"" in prompt


def test_wardrobe_only_prompt_requires_consider_adding_and_concrete_suggestion():
    """Wardrobe-only mode must instruct the model to pair 'Consider adding' with concrete details."""
    ai = AIService(api_key="test-key")
    item = DummyWardrobeItem(
        id=1,
        category="shirt",
        name="Solo shirt",
        color="White",
        description="Only shirt in wardrobe",
    )
    prompt = ai._build_prompt(  # type: ignore[attr-defined]
        text_input="Occasion: casual",
        wardrobe_items={"shirt": [item]},
        wardrobe_only=True,
    )
    assert "Consider adding a [type] to your wardrobe" in prompt
    assert "concrete AI suggestion" in prompt
    assert "color/style/material" in prompt


def test_prompt_includes_previous_outfit_when_requesting_alternative():
    """Next-suggestion flow sends prior outfit so the model proposes something different."""
    ai = AIService(api_key="test-key")
    prev = "Shirt: white linen\nTrousers: navy chinos\nReasoning: prior look"
    prompt = ai._build_prompt(  # type: ignore[attr-defined]
        text_input="Occasion: casual",
        wardrobe_items=None,
        wardrobe_only=False,
        previous_outfit_text=prev,
    )
    assert "ALTERNATIVE" in prompt or "ALTERNATIVE OUTFIT" in prompt
    assert "white linen" in prompt
    assert "Do NOT repeat" in prompt


def test_prompt_includes_avoid_outfit_texts_for_wardrobe_only():
    """Session variety can send a list of recent outfits to avoid."""
    ai = AIService(api_key="test-key")
    prompt = ai._build_prompt(  # type: ignore[attr-defined]
        text_input="Occasion: work",
        wardrobe_items={"shirt": []},
        wardrobe_only=True,
        avoid_outfit_texts=[
            "Shirt: blue oxford\nTrousers: grey wool",
            "Shirt: white tee\nTrousers: denim",
        ],
    )
    assert "ALSO AVOID" in prompt
    assert "blue oxford" in prompt
    assert "white tee" in prompt


def test_wardrobe_only_previous_outfit_includes_alternative_block():
    """Wardrobe-only text path supports previous_outfit_text like photo flow."""
    ai = AIService(api_key="test-key")
    prev = "Shirt: navy blazer look\nTrousers: charcoal"
    prompt = ai._build_prompt(  # type: ignore[attr-defined]
        text_input="Occasion: business",
        wardrobe_items={"shirt": []},
        wardrobe_only=True,
        previous_outfit_text=prev,
    )
    assert "ALTERNATIVE" in prompt or "ALTERNATIVE OUTFIT" in prompt
    assert "navy blazer look" in prompt


def test_summer_prompt_excludes_heavy_outerwear_from_wardrobe_payload():
    ai = AIService(api_key="test-key")
    light_jacket = DummyWardrobeItem(
        id=10,
        category="jacket",
        color="Olive",
        description="Lightweight harrington jacket",
    )
    heavy_coat = DummyWardrobeItem(
        id=11,
        category="coat",
        color="Charcoal",
        description="Wool overcoat",
    )
    wool_blazer = DummyWardrobeItem(
        id=12,
        category="blazer",
        color="Navy",
        description="Wool blazer",
    )
    prompt = ai._build_prompt(  # type: ignore[attr-defined]
        text_input="Occasion: casual, Season: summer, Style: modern",
        wardrobe_items={
            "jacket": [light_jacket, heavy_coat],
            "blazer": [wool_blazer],
        },
        wardrobe_only=True,
    )
    assert "ID: 10" in prompt
    assert "ID: 11" not in prompt
    assert "ID: 12" not in prompt
    assert "SUMMER / WARM-WEATHER RULES" in prompt


def test_detected_upload_category_overrides_mis_slotted_shirt():
    ai = AIService(api_key="test-key")
    raw = (
        '{"shirt":"Tan corduroy jacket","trouser":"Grey trousers","blazer":"Royal blue blazer",'
        '"shoes":"Brown brogues","belt":"Charcoal belt","source_slot":"shirt",'
        '"detected_upload_category":"outerwear","reasoning":"Elegant"}'
    )
    parsed = ai._parse_response(raw)  # type: ignore[attr-defined]
    corrected = ai._apply_detected_upload_category(parsed, raw)  # type: ignore[attr-defined]
    assert corrected.source_slot == "outerwear"
    assert corrected.upload_matched_category == "outerwear"


def test_jacket_source_slot_maps_to_outerwear_not_blazer():
    ai = AIService(api_key="test-key")
    raw = (
        '{"shirt":"White shirt","trouser":"Navy chinos","blazer":"Charcoal blazer",'
        '"shoes":"Loafers","belt":"Brown belt","source_slot":"jacket","reasoning":"Casual"}'
    )
    parsed = ai._parse_response(raw)  # type: ignore[attr-defined]
    assert parsed.source_slot == "outerwear"

    constrained = ai._apply_source_wardrobe_constraints(  # type: ignore[attr-defined]
        parsed,
        source_wardrobe_category="jacket",
        source_wardrobe_item_id=42,
    )
    assert constrained.upload_matched_category == "outerwear"
    assert constrained.outerwear_id == 42
    assert constrained.blazer_id is None
    assert constrained.blazer == ""
    assert constrained.sweater is None


def test_blazer_source_clears_outerwear_and_sweater():
    ai = AIService(api_key="test-key")
    raw = (
        '{"shirt":"White shirt","trouser":"Navy chinos","blazer":"Navy blazer",'
        '"shoes":"Loafers","belt":"Brown belt","sweater":"Merino crew","outerwear":"Denim jacket",'
        '"reasoning":"Smart casual"}'
    )
    parsed = ai._parse_response(raw)  # type: ignore[attr-defined]
    constrained = ai._apply_source_wardrobe_constraints(  # type: ignore[attr-defined]
        parsed,
        source_wardrobe_category="blazer",
        source_wardrobe_item_id=11,
    )
    assert constrained.upload_matched_category == "blazer"
    assert constrained.blazer_id == 11
    assert constrained.outerwear is None
    assert constrained.sweater is None
    assert constrained.outerwear_id is None
    assert constrained.sweater_id is None

