"""Upload slot helpers — keep in sync with frontend outfitItemThumbnail.ts and iOS OutfitUploadCategory.swift."""
import re
from typing import Optional

UPLOAD_TEXT_MARKERS = (
    "uploaded item",
    "from your upload",
    "your upload",
    "uploaded image",
)

# Casual outerwear signals in AI slot text (not structured blazer / dress-shirt-only).
_OUTERWEAR_TEXT_PATTERN = re.compile(
    r"\b("
    r"jacket|jackets|coat|coats|outerwear|parka|parkas|bomber|windbreaker|anorak|puffer|"
    r"overcoat|trench|shacket|overshirt|corduroy|duffle|duffel|field jacket|harrington|"
    r"denim jacket|leather jacket|quilted|padded|insulated|fleece"
    r")\b",
    re.IGNORECASE,
)

_DRESS_SHIRT_ONLY_PATTERN = re.compile(
    r"\b(dress shirt|oxford shirt|button[- ]down shirt|formal shirt)\b",
    re.IGNORECASE,
)

_NULLISH_TEXT = {"null", "none", "n/a", "-", ""}

_GENERIC_UPLOAD_TEXT = {
    "your wardrobe jacket",
    "your wardrobe coat",
    "your wardrobe item",
    "your jacket",
    "your coat",
    "wardrobe jacket",
    "wardrobe coat",
    "the jacket",
    "the coat",
    "jacket",
    "coat",
    "item",
}

_UPLOAD_MARKER_PATTERN = re.compile(
    r"[\(\[]?\s*(?:uploaded item|from your upload|your upload|uploaded image)\s*[\)\]]?",
    re.IGNORECASE,
)


def slot_text_has_upload_marker(text: Optional[str]) -> bool:
    if not text:
        return False
    lower = text.strip().lower()
    return any(marker in lower for marker in UPLOAD_TEXT_MARKERS)


def clean_upload_marker_text(text: Optional[str]) -> Optional[str]:
    """
    Strip legacy upload markers while keeping any real description around them.

    Returns None when nothing usable is left (empty, null-ish, or a bare
    "your wardrobe jacket (uploaded item)" placeholder) so callers can fall
    back to a generated description. "From your upload — navy bomber jacket"
    keeps "navy bomber jacket" instead of being thrown away.

    Keep in sync with frontend/src/utils/outfitLayerExclusivity.ts and
    iOS OutfitUploadCategory.swift.
    """
    if text is None:
        return None
    stripped = str(text).strip()
    if stripped.lower() in _NULLISH_TEXT:
        return None
    if not slot_text_has_upload_marker(stripped):
        return stripped

    cleaned = _UPLOAD_MARKER_PATTERN.sub(" ", stripped)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -—–,;:.")
    cleaned = re.sub(r"^(?:from|the)\s+", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip(" -—–,;:.")
    if not cleaned or cleaned.lower() in _GENERIC_UPLOAD_TEXT:
        return None
    return cleaned


def text_suggests_outerwear(text: Optional[str]) -> bool:
    """True when description reads like casual outerwear rather than a base shirt layer."""
    if not text or not text.strip():
        return False
    stripped = text.strip()
    if slot_text_has_upload_marker(stripped):
        return True
    if not _OUTERWEAR_TEXT_PATTERN.search(stripped):
        return False
    # Avoid false positives on "shirt jacket" style product names that are still outerwear.
    if _DRESS_SHIRT_ONLY_PATTERN.search(stripped) and not _OUTERWEAR_TEXT_PATTERN.search(stripped):
        return False
    return True
