import json

from services.ai_service import AIService


def _ai_service() -> AIService:
    return AIService(api_key="test-key")


def test_parse_response_accepts_source_slot_and_normalizes_aliases():
    ai = _ai_service()
    raw = json.dumps(
        {
            "shirt": "Uploaded striped shirt",
            "trouser": "Khaki chinos",
            "blazer": "Charcoal blazer",
            "shoes": "Brown brogues",
            "belt": "Brown belt",
            "shirt_id": None,
            "trouser_id": 10,
            "blazer_id": 11,
            "shoes_id": 12,
            "belt_id": 13,
            "source_slot": "jacket",
            "reasoning": "Balanced business-casual look.",
        }
    )

    parsed = ai._parse_response(raw)  # type: ignore[attr-defined]
    assert parsed.source_slot == "blazer"


def test_parse_response_rejects_invalid_source_slot():
    ai = _ai_service()
    raw = json.dumps(
        {
            "shirt": "White shirt",
            "trouser": "Navy trouser",
            "blazer": "Gray blazer",
            "shoes": "Black shoes",
            "belt": "Black belt",
            "source_slot": "hat",
            "reasoning": "Classic look.",
        }
    )

    parsed = ai._parse_response(raw)  # type: ignore[attr-defined]
    assert parsed.source_slot is None
