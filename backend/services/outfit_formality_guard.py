"""Hard formality guard for outfit generation (Week Planner / wardrobe-only).

Excludes athletic footwear and clash casual bottoms from candidate pools when
the day's occasion/style calls for structured/formal looks, and post-validates
suggestions so sneakers are not forced with a blazer/suit look.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, MutableMapping, Optional, Sequence

from services.outfit_layer_sanitize import has_meaningful_layer_text

# Align with Insights / STYLE_FORMALITY dress-code language (narrow set per product).
FORMAL_OCCASIONS = frozenset(
    {
        "work",
        "business",
        "formal",
        "office",
        "interview",
        "wedding",
        "wedding-guest",
    }
)
FORMAL_STYLES = frozenset({"elegant", "classic", "formal", "business"})

_ATHLETIC_SHOE_TOKENS = (
    "athletic",
    "sneaker",
    "sneakers",
    "running shoe",
    "running shoes",
    "trainer",
    "trainers",
    "jogging shoe",
    "gym shoe",
    "court shoe",
    "tennis shoe",
    "sports shoe",
    "sport shoe",
    "cleat",
)
_CASUAL_BOTTOM_TOKENS = (
    "jogger",
    "joggers",
    "sweatpant",
    "sweatpants",
    "sweat pant",
    "track pant",
    "trackpant",
    "tracksuit",
    "athletic pant",
    "gym short",
    "basketball short",
    "legging",
    "leggings",
)

SHOE_GAP_COPY = "Consider adding dress shoes or loafers to your wardrobe"


def _norm(text: Optional[str]) -> str:
    return (text or "").strip().lower().replace("_", "-")


def requires_formality_guard(
    *,
    occasion: Optional[str] = None,
    style: Optional[str] = None,
) -> bool:
    occ = _norm(occasion)
    sty = _norm(style)
    if occ in FORMAL_OCCASIONS:
        return True
    if sty in FORMAL_STYLES:
        return True
    return False


def _item_blob(item: Any) -> str:
    parts: List[str] = []
    for attr in ("category", "name", "description", "color", "tags", "brand"):
        val = getattr(item, attr, None)
        if val:
            parts.append(str(val))
    if isinstance(item, dict):
        for key in ("category", "name", "description", "color", "tags", "brand"):
            val = item.get(key)
            if val:
                parts.append(str(val))
    return " ".join(parts).lower()


def _contains_any(blob: str, tokens: Sequence[str]) -> bool:
    return any(token in blob for token in tokens)


def is_athletic_or_casual_shoe_text(text: Optional[str]) -> bool:
    blob = _norm(text).replace("-", " ")
    return _contains_any(blob, _ATHLETIC_SHOE_TOKENS)


def is_clash_casual_bottom_text(text: Optional[str]) -> bool:
    blob = _norm(text).replace("-", " ")
    return _contains_any(blob, _CASUAL_BOTTOM_TOKENS)


def is_athletic_or_casual_shoe_item(item: Any) -> bool:
    return is_athletic_or_casual_shoe_text(_item_blob(item))


def is_clash_casual_bottom_item(item: Any) -> bool:
    return is_clash_casual_bottom_text(_item_blob(item))


def look_is_structured_formal(
    suggestion: Any,
    *,
    occasion: Optional[str] = None,
    style: Optional[str] = None,
) -> bool:
    """True when a blazer/suit-like look is present or formal context makes it likely."""
    blazer = getattr(suggestion, "blazer", None)
    if isinstance(suggestion, MutableMapping):
        blazer = suggestion.get("blazer", blazer)
    blazer_id = getattr(suggestion, "blazer_id", None)
    if isinstance(suggestion, MutableMapping):
        blazer_id = suggestion.get("blazer_id", blazer_id)
    if blazer_id is not None or has_meaningful_layer_text(
        blazer if isinstance(blazer, str) else None
    ):
        return True
    trouser = getattr(suggestion, "trouser", None)
    if isinstance(suggestion, MutableMapping):
        trouser = suggestion.get("trouser", trouser)
    trouser_blob = _norm(trouser if isinstance(trouser, str) else None)
    if any(
        tok in trouser_blob
        for tok in ("suit", "dress pant", "tailored", "wool trouser")
    ):
        if requires_formality_guard(occasion=occasion, style=style):
            return True
    return requires_formality_guard(occasion=occasion, style=style)


def filter_wardrobe_slots_for_formality(
    wardrobe_items: Optional[Dict[str, List[Any]]],
    *,
    occasion: Optional[str] = None,
    style: Optional[str] = None,
    protect_ids: Optional[Iterable[int]] = None,
) -> Dict[str, List[Any]]:
    """
    Drop athletic shoes / clash casual bottoms from candidate pools when
    formality guard applies. Protected (pinned) IDs are never removed.
    """
    if not wardrobe_items:
        return wardrobe_items or {}
    if not requires_formality_guard(occasion=occasion, style=style):
        return wardrobe_items

    protected = {int(i) for i in (protect_ids or []) if isinstance(i, int)}
    filtered: Dict[str, List[Any]] = {}
    for slot, items in wardrobe_items.items():
        if not items:
            filtered[slot] = items
            continue
        if slot in {"shoes", "shoe"}:
            kept = []
            for item in items:
                item_id = getattr(item, "id", None)
                if item_id is None and isinstance(item, dict):
                    item_id = item.get("id")
                if item_id in protected or not is_athletic_or_casual_shoe_item(item):
                    kept.append(item)
            filtered[slot] = kept
        elif slot in {"trouser", "trousers", "pants"}:
            kept = []
            for item in items:
                item_id = getattr(item, "id", None)
                if item_id is None and isinstance(item, dict):
                    item_id = item.get("id")
                if item_id in protected or not is_clash_casual_bottom_item(item):
                    kept.append(item)
            filtered[slot] = kept
        else:
            filtered[slot] = items
    return filtered


def apply_formality_post_check(
    suggestion: Any,
    matching_items: Optional[MutableMapping[str, Any]] = None,
    *,
    occasion: Optional[str] = None,
    style: Optional[str] = None,
    protect_ids: Optional[Iterable[int]] = None,
) -> Any:
    """
    If a structured/formal look is paired with athletic shoes (or clash bottoms),
    clear that slot and prefer a wardrobe gap over a forced clash.
    Pinned protect_ids are left alone.
    """
    if not look_is_structured_formal(suggestion, occasion=occasion, style=style):
        return suggestion

    protected = {int(i) for i in (protect_ids or []) if isinstance(i, int)}

    shoes_id = getattr(suggestion, "shoes_id", None)
    shoes_text = getattr(suggestion, "shoes", None)
    if isinstance(suggestion, MutableMapping):
        shoes_id = suggestion.get("shoes_id", shoes_id)
        shoes_text = suggestion.get("shoes", shoes_text)

    shoe_clash = False
    if shoes_id is not None and shoes_id not in protected:
        match_blob = ""
        if isinstance(matching_items, dict):
            shoe_matches = matching_items.get("shoes") or []
            if shoe_matches:
                match_blob = _item_blob(shoe_matches[0])
        shoe_clash = is_athletic_or_casual_shoe_text(
            f"{shoes_text or ''} {match_blob}"
        )
    elif shoes_id is None or shoes_id not in protected:
        shoe_clash = is_athletic_or_casual_shoe_text(
            shoes_text if isinstance(shoes_text, str) else None
        )

    if shoe_clash and (shoes_id is None or shoes_id not in protected):
        if isinstance(suggestion, MutableMapping):
            suggestion["shoes"] = SHOE_GAP_COPY
            suggestion["shoes_id"] = None
        else:
            suggestion.shoes = SHOE_GAP_COPY
            suggestion.shoes_id = None
        if isinstance(matching_items, dict):
            matching_items.pop("shoes", None)

    trouser_id = getattr(suggestion, "trouser_id", None)
    trouser_text = getattr(suggestion, "trouser", None)
    if isinstance(suggestion, MutableMapping):
        trouser_id = suggestion.get("trouser_id", trouser_id)
        trouser_text = suggestion.get("trouser", trouser_text)

    bottom_clash = False
    if trouser_id is not None and trouser_id not in protected:
        match_blob = ""
        if isinstance(matching_items, dict):
            bottom_matches = (
                matching_items.get("trouser")
                or matching_items.get("trousers")
                or []
            )
            if bottom_matches:
                match_blob = _item_blob(bottom_matches[0])
        bottom_clash = is_clash_casual_bottom_text(
            f"{trouser_text or ''} {match_blob}"
        )
    elif trouser_id is None or trouser_id not in protected:
        bottom_clash = is_clash_casual_bottom_text(
            trouser_text if isinstance(trouser_text, str) else None
        )

    if bottom_clash and (trouser_id is None or trouser_id not in protected):
        gap = "Consider adding tailored trousers to your wardrobe"
        if isinstance(suggestion, MutableMapping):
            suggestion["trouser"] = gap
            suggestion["trouser_id"] = None
        else:
            suggestion.trouser = gap
            suggestion.trouser_id = None
        if isinstance(matching_items, dict):
            matching_items.pop("trouser", None)
            matching_items.pop("trousers", None)

    return suggestion


def formality_prompt_rule(
    *, occasion: Optional[str] = None, style: Optional[str] = None
) -> str:
    """Short hard-rule block for AI prompts when formality guard applies."""
    if not requires_formality_guard(occasion=occasion, style=style):
        return ""
    return (
        "\nFORMALITY HARD RULE: For this work/business/formal occasion or "
        "elegant/classic/formal style, do NOT pair a structured blazer or suit-like "
        "look with athletic sneakers, running shoes, joggers, or sweatpants. "
        "If no formal-compatible shoe exists in the wardrobe list, write "
        f"'{SHOE_GAP_COPY}' for the shoes slot instead of forcing sneakers.\n"
    )
