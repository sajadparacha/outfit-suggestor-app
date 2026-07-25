"""Sanitize blazer vs outerwear layers on outfit suggestions / stored plan outfits."""
from __future__ import annotations

from typing import Any, MutableMapping, Optional


_EMPTY_LAYER = frozenset({"", "null", "none", "n/a", "-"})


def _norm(text: Optional[str]) -> str:
    return (text or "").strip().lower()


def has_meaningful_layer_text(text: Optional[str]) -> bool:
    lowered = _norm(text)
    if not lowered or lowered in _EMPTY_LAYER:
        return False
    if lowered.startswith("no structured blazer"):
        return False
    if lowered.startswith("consider adding"):
        return False
    return True


def is_warm_season(season: Optional[str]) -> bool:
    return _norm(season) in {"summer", "warm"}


def prefers_blazer_over_jacket(
    *,
    occasion: Optional[str] = None,
    style: Optional[str] = None,
) -> bool:
    occ = _norm(occasion).replace("_", "-")
    sty = _norm(style)
    if occ in {
        "work",
        "business",
        "formal",
        "office",
        "interview",
        "wedding",
        "wedding-guest",
        "date-night",
        "everyday",
    }:
        return True
    if sty in {"classic", "elegant", "formal", "business"}:
        return True
    return False


def sanitize_outfit_layers(
    payload: MutableMapping[str, Any],
    *,
    season: Optional[str] = None,
    occasion: Optional[str] = None,
    style: Optional[str] = None,
) -> MutableMapping[str, Any]:
    """
    Mutate payload in place:
    - Summer: clear outerwear (jacket/coat)
    - Never keep both meaningful blazer and outerwear
    """
    if is_warm_season(season):
        payload["outerwear"] = None
        payload["outerwear_id"] = None
        matching = payload.get("matching_wardrobe_items")
        if isinstance(matching, dict):
            matching.pop("outerwear", None)

    has_blazer = has_meaningful_layer_text(
        payload.get("blazer") if isinstance(payload.get("blazer"), str) else None
    ) or payload.get("blazer_id") is not None
    outer_raw = payload.get("outerwear")
    has_outerwear = has_meaningful_layer_text(
        outer_raw if isinstance(outer_raw, str) else None
    ) or payload.get("outerwear_id") is not None

    if not (has_blazer and has_outerwear):
        return payload

    # Wardrobe pins win: selected jacket without a blazer id stays outerwear.
    if payload.get("outerwear_id") is not None and payload.get("blazer_id") is None:
        keep_blazer = False
    elif payload.get("blazer_id") is not None and payload.get("outerwear_id") is None:
        keep_blazer = True
    else:
        keep_blazer = prefers_blazer_over_jacket(occasion=occasion, style=style)

    matching = payload.get("matching_wardrobe_items")
    if keep_blazer:
        payload["outerwear"] = None
        payload["outerwear_id"] = None
        if isinstance(matching, dict):
            matching.pop("outerwear", None)
    else:
        payload["blazer"] = ""
        payload["blazer_id"] = None
        if isinstance(matching, dict):
            matching.pop("blazer", None)
    return payload
