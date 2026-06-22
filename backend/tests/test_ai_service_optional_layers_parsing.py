import json

from services.ai_service import AIService


def _ai_service() -> AIService:
    return AIService(api_key="test-key")


def test_parse_response_accepts_optional_layer_fields_and_ids():
    ai = _ai_service()
    raw = json.dumps(
        {
            "shirt": "White oxford",
            "trouser": "Navy chinos",
            "blazer": "Charcoal blazer",
            "shoes": "Brown loafers",
            "belt": "Brown belt",
            "sweater": "Navy merino crew neck",
            "outerwear": "Olive field jacket",
            "tie": "Burgundy silk tie",
            "sweater_id": 21,
            "outerwear_id": 22,
            "tie_id": 23,
            "reasoning": "Layered smart casual for cool weather.",
        }
    )

    parsed = ai._parse_response(raw)  # type: ignore[attr-defined]
    assert parsed.sweater == "Navy merino crew neck"
    assert parsed.outerwear == "Olive field jacket"
    assert parsed.tie == "Burgundy silk tie"
    assert parsed.sweater_id == 21
    assert parsed.outerwear_id == 22
    assert parsed.tie_id == 23


def test_parse_response_treats_nullish_optional_fields_as_none():
    ai = _ai_service()
    raw = json.dumps(
        {
            "shirt": "White shirt",
            "trouser": "Grey trousers",
            "blazer": "Navy blazer",
            "shoes": "Black shoes",
            "belt": "Black belt",
            "sweater": "null",
            "outerwear": "",
            "tie": None,
            "reasoning": "Simple look.",
        }
    )

    parsed = ai._parse_response(raw)  # type: ignore[attr-defined]
    assert parsed.sweater is None
    assert parsed.outerwear is None
    assert parsed.tie is None
