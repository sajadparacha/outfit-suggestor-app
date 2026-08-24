"""Resolve Insights lifestyle fields into canonical gap-analysis context."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, List, Optional, Sequence, Union

LIFESTYLE_VALUES = ("work", "everyday", "social", "formal", "sport")
DRESS_CODES = ("casual", "smart-casual", "business-professional", "formal")
CLIMATES = ("hot", "temperate", "cold")
STYLE_PRIMARIES = (
    "classic",
    "smart-casual",
    "preppy",
    "minimal",
    "elegant",
    "streetwear",
    "sporty",
)
STYLE_ACCENTS = ("vintage", "edgy", "sporty", "preppy")

LIFESTYLE_LABELS = {
    "work": "Work",
    "everyday": "Everyday",
    "social": "Social / Dinner",
    "formal": "Formal",
    "sport": "Sport / Outdoor",
}
DRESS_CODE_LABELS = {
    "casual": "Casual",
    "smart-casual": "Smart casual",
    "business-professional": "Business professional",
    "formal": "Formal",
}
CLIMATE_LABELS = {
    "hot": "Hot",
    "temperate": "Temperate",
    "cold": "Cold",
}
STYLE_LABELS = {
    "classic": "Classic",
    "smart-casual": "Smart Casual",
    "preppy": "Preppy",
    "minimal": "Minimal",
    "elegant": "Elegant",
    "streetwear": "Streetwear",
    "sporty": "Sporty",
    "vintage": "Vintage",
    "edgy": "Edgy",
}

_OCCASION_FROM_LIFESTYLE = {
    "work": "work",
    "everyday": "everyday",
    "social": "dinner-night-out",
    "formal": "formal-event",
    "sport": "workout",
}

_MAX_MIX = 3

StrOrList = Union[str, Sequence[str], None]


@dataclass(frozen=True)
class ResolvedGapContext:
    occasion: str
    season: str
    style: str
    display_occasion: str
    display_season: str
    display_style: str
    prompt_context: str
    used_lifestyle: bool
    dress_codes: List[str] = field(default_factory=list)
    climates: List[str] = field(default_factory=list)
    style_primaries: List[str] = field(default_factory=list)
    style_accents: List[str] = field(default_factory=list)


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip().lower()
    return text or None


def as_str_list(value: StrOrList) -> List[str]:
    """Accept a single string or a list of strings (backward compatible)."""
    if value is None:
        return []
    if isinstance(value, str):
        items: Sequence[str] = [value]
    else:
        items = value
    result: List[str] = []
    for item in items:
        text = _clean(str(item) if item is not None else None)
        if text:
            result.append(text)
    return result


def normalize_allowed(values: StrOrList, allowed: Sequence[str]) -> List[str]:
    cleaned: List[str] = []
    allowed_set = set(allowed)
    for item in as_str_list(values):
        if item in allowed_set and item not in cleaned:
            cleaned.append(item)
    return cleaned


def normalize_lifestyle_mix(
    mix: Optional[Sequence[str]],
    primary: Optional[str] = None,
) -> List[str]:
    cleaned: List[str] = []
    for item in mix or []:
        value = _clean(item)
        if value in LIFESTYLE_VALUES and value not in cleaned:
            cleaned.append(value)
        if len(cleaned) == _MAX_MIX:
            break
    primary_value = _clean(primary)
    if primary_value in LIFESTYLE_VALUES:
        if primary_value in cleaned:
            cleaned = [primary_value] + [item for item in cleaned if item != primary_value]
        elif len(cleaned) < _MAX_MIX:
            cleaned = [primary_value] + cleaned
        elif cleaned:
            cleaned[0] = primary_value
    return cleaned


def canonical_occasion(primary: str, dress_code: StrOrList) -> str:
    codes = normalize_allowed(dress_code, DRESS_CODES)
    if primary == "work" and any(code in ("business-professional", "formal") for code in codes):
        return "business"
    return _OCCASION_FROM_LIFESTYLE.get(primary, "work")


def canonical_season(climate: StrOrList) -> str:
    climates = normalize_allowed(climate, CLIMATES)
    if climates == ["hot"]:
        return "summer"
    if climates == ["cold"]:
        return "winter"
    return "all-season"


def canonical_style(style_primary: StrOrList, style_accent: StrOrList = None) -> str:
    primaries = normalize_allowed(style_primary, STYLE_PRIMARIES)
    return primaries[0] if primaries else "classic"


def display_occasion(mix: Sequence[str]) -> str:
    labels = [LIFESTYLE_LABELS.get(item, item.title()) for item in mix]
    return " + ".join(labels) if labels else "Everyday"


def display_season(climate: StrOrList, dress_code: StrOrList = None) -> str:
    climates = normalize_allowed(climate, CLIMATES)
    codes = normalize_allowed(dress_code, DRESS_CODES)
    if climates:
        climate_part = " + ".join(CLIMATE_LABELS[item] for item in climates)
        season = f"Year-round / {climate_part}"
    else:
        season = "Year-round"
    code_labels = [DRESS_CODE_LABELS[item] for item in codes]
    if code_labels:
        return f"{' + '.join(code_labels)} · {season}"
    return season


def display_style(style_primary: StrOrList, style_accent: StrOrList = None) -> str:
    primaries = normalize_allowed(style_primary, STYLE_PRIMARIES)
    accents = normalize_allowed(style_accent, STYLE_ACCENTS)
    if not primaries:
        primary_label = "Classic"
    else:
        primary_label = " + ".join(STYLE_LABELS.get(item, item.title()) for item in primaries)
    if not accents:
        return primary_label
    accent_label = " + ".join(STYLE_LABELS.get(item, item.title()) for item in accents)
    suffix = "accent" if len(accents) == 1 else "accents"
    return f"{primary_label} with {accent_label} {suffix}"


def format_lifestyle_prompt(
    *,
    mix: Sequence[str],
    dress_code: StrOrList,
    climate: StrOrList,
    style_primary: StrOrList,
    style_accent: StrOrList,
    event_focus: Optional[str],
    text_input: str,
    occasion: str,
    season: str,
    style: str,
) -> str:
    mix_parts = []
    for index, item in enumerate(mix):
        label = LIFESTYLE_LABELS.get(item, item)
        mix_parts.append(f"{label} (primary)" if index == 0 else label)
    mix_line = ", ".join(mix_parts) if mix_parts else "(none)"
    notes = text_input.strip() if text_input else "(none)"
    codes = normalize_allowed(dress_code, DRESS_CODES) or ["smart-casual"]
    climates = normalize_allowed(climate, CLIMATES)
    primaries = normalize_allowed(style_primary, STYLE_PRIMARIES) or ["classic"]
    accents = normalize_allowed(style_accent, STYLE_ACCENTS)
    climate_line = ", ".join(CLIMATE_LABELS[item] for item in climates) if climates else "(none)"
    style_parts = []
    for index, item in enumerate(primaries):
        style_parts.append(f"{item} (primary)" if index == 0 else item)
    accent_line = ", ".join(accents) if accents else "(none)"
    event_line = event_focus or "(none)"
    return (
        f"- lifestyle mix: {mix_line}\n"
        f"- dress code: {', '.join(codes)}\n"
        f"- season focus: year-round core\n"
        f"- climate gaps: {climate_line}\n"
        f"- style primary: {', '.join(style_parts)}\n"
        f"- style accent: {accent_line}\n"
        f"- event deep-dive: {event_line}\n"
        f"- extra notes: {notes}\n"
        f"- derived occasion/season/style for rules: {occasion} / {season} / {style}"
    )


def has_lifestyle_fields(
    lifestyle_mix: Optional[Iterable[str]] = None,
    primary_lifestyle: Optional[str] = None,
    dress_code: StrOrList = None,
    climate: StrOrList = None,
    style_primary: StrOrList = None,
    style_accent: StrOrList = None,
    event_focus: Optional[str] = None,
) -> bool:
    mix = [item for item in (lifestyle_mix or []) if _clean(item)]
    return bool(
        mix
        or _clean(primary_lifestyle)
        or as_str_list(dress_code)
        or as_str_list(climate)
        or as_str_list(style_primary)
        or as_str_list(style_accent)
        or _clean(event_focus)
    )


def resolve_gap_analysis_context(
    occasion: str,
    season: str,
    style: str,
    text_input: str = "",
    lifestyle_mix: Optional[Sequence[str]] = None,
    primary_lifestyle: Optional[str] = None,
    dress_code: StrOrList = None,
    climate: StrOrList = None,
    style_primary: StrOrList = None,
    style_accent: StrOrList = None,
    event_focus: Optional[str] = None,
) -> ResolvedGapContext:
    occasion_value = (_clean(occasion) or "everyday")
    season_value = (_clean(season) or "all-season")
    style_value = (_clean(style) or "classic")
    notes = text_input or ""

    if not has_lifestyle_fields(
        lifestyle_mix,
        primary_lifestyle,
        dress_code,
        climate,
        style_primary,
        style_accent,
        event_focus,
    ):
        prompt = (
            f"- occasion: {occasion_value}\n"
            f"- season: {season_value}\n"
            f"- style preference: {style_value}\n"
            f"- extra notes: {notes.strip() or '(none)'}"
        )
        return ResolvedGapContext(
            occasion=occasion_value,
            season=season_value,
            style=style_value,
            display_occasion=occasion_value,
            display_season=season_value,
            display_style=style_value,
            prompt_context=prompt,
            used_lifestyle=False,
        )

    mix = normalize_lifestyle_mix(lifestyle_mix, primary_lifestyle)
    if not mix:
        mix = ["work", "everyday"]
    primary = mix[0]
    codes = normalize_allowed(dress_code, DRESS_CODES)
    if not codes:
        codes = ["smart-casual"]
    climates = normalize_allowed(climate, CLIMATES)
    primaries = normalize_allowed(style_primary, STYLE_PRIMARIES)
    if not primaries:
        primaries = ["classic"]
    accents = normalize_allowed(style_accent, STYLE_ACCENTS)
    event = _clean(event_focus)

    mapped_occasion = canonical_occasion(primary, codes)
    mapped_season = canonical_season(climates)
    mapped_style = canonical_style(primaries, accents)

    prompt = format_lifestyle_prompt(
        mix=mix,
        dress_code=codes,
        climate=climates,
        style_primary=primaries,
        style_accent=accents,
        event_focus=event,
        text_input=notes,
        occasion=mapped_occasion,
        season=mapped_season,
        style=mapped_style,
    )
    return ResolvedGapContext(
        occasion=mapped_occasion,
        season=mapped_season,
        style=mapped_style,
        display_occasion=display_occasion(mix),
        display_season=display_season(climates, codes),
        display_style=display_style(primaries, accents),
        prompt_context=prompt,
        used_lifestyle=True,
        dress_codes=codes,
        climates=climates,
        style_primaries=primaries,
        style_accents=accents,
    )
