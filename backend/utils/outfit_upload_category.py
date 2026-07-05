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


def slot_text_has_upload_marker(text: Optional[str]) -> bool:
    if not text:
        return False
    lower = text.strip().lower()
    return any(marker in lower for marker in UPLOAD_TEXT_MARKERS)


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
