"""Season-aware post-filters for wardrobe gap analysis (free + premium)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

# Heavy / cold-weather terms inappropriate as priority summer purchases.
SUMMER_BLOCKLIST_KEYWORDS: Tuple[str, ...] = (
    "wool",
    "merino",
    "cashmere",
    "fleece",
    "chunky knit",
    "cable knit",
    "cable-knit",
    "heavy jacket",
    "heavy bomber",
    "parka",
    "overcoat",
    "pea coat",
    "peacoat",
    "duffle coat",
    "duffel coat",
    "wool coat",
    "wool jacket",
    "quilted jacket",
    "puffer",
    "down jacket",
    "down coat",
    "insulated",
    "winter jacket",
    "winter coat",
    "turtleneck",
    "chunky sweater",
    "wool sweater",
    "wool blazer",
)

# Wardrobe categories treated as heavy outerwear for summer outfit payloads.
SUMMER_HEAVY_OUTERWEAR_CATEGORIES: Tuple[str, ...] = (
    "coat",
    "coats",
    "parka",
    "overcoat",
    "outerwear",
)

SUMMER_SUMMER_STYLE_BLOCKLIST: Tuple[str, ...] = (
    "merino",
    "cable knit",
    "cable-knit",
    "chunky",
)

SUMMER_CATEGORY_SORT_ORDER: Dict[str, int] = {
    "shirt": 0,
    "trouser": 1,
    "shoes": 2,
    "belt": 3,
    "blazer": 4,
    "tie": 5,
    "sweater": 6,
    "jacket": 7,
}

SUMMER_LOW_PRIORITY_CATEGORIES: Tuple[str, ...] = ("sweater", "jacket")
FORMAL_OCCASIONS: Tuple[str, ...] = ("business", "formal", "office")


def _normalize_season(season: str) -> str:
    return (season or "all").strip().lower()


def _normalize_occasion(occasion: str) -> str:
    return (occasion or "casual").strip().lower()


def text_has_summer_blocklist(text: str) -> bool:
    lowered = (text or "").lower()
    return any(keyword in lowered for keyword in SUMMER_BLOCKLIST_KEYWORDS)


def is_heavy_outerwear_for_summer(
    *,
    category: str,
    description: str = "",
    color: str = "",
) -> bool:
    """Return True when a wardrobe item should be omitted from summer outfit AI payloads."""
    normalized_category = (category or "").strip().lower()
    if normalized_category in SUMMER_HEAVY_OUTERWEAR_CATEGORIES:
        return True
    combined = f"{normalized_category} {description} {color}".strip()
    if normalized_category in {"jacket", "jackets", "blazer", "blazers", "sweater", "sweaters"}:
        return text_has_summer_blocklist(combined)
    return False


def filter_summer_texts(texts: List[str]) -> List[str]:
    return [text for text in texts if text and not text_has_summer_blocklist(text)]


def _summer_category_sort_key(category: str, occasion: str) -> int:
    base = SUMMER_CATEGORY_SORT_ORDER.get(category, 50)
    if category in SUMMER_LOW_PRIORITY_CATEGORIES and occasion not in FORMAL_OCCASIONS:
        base += 20
    return base


def _filter_shopping_list_item(item: Dict[str, Any]) -> bool:
    combined = " ".join(
        str(item.get(key, ""))
        for key in ("itemName", "reason", "outfitImpact")
    )
    return not text_has_summer_blocklist(combined)


def _rerank_shopping_list(
    items: List[Dict[str, Any]],
    occasion: str,
) -> List[Dict[str, Any]]:
    kept = [item for item in items if _filter_shopping_list_item(item)]
    kept.sort(
        key=lambda row: (
            _summer_category_sort_key(str(row.get("category", "")), occasion),
            int(row.get("rank", 999)),
        )
    )
    reranked: List[Dict[str, Any]] = []
    for index, item in enumerate(kept, start=1):
        updated = dict(item)
        updated["rank"] = index
        reranked.append(updated)
    return reranked


def _filter_category_entry(
    entry: Dict[str, Any],
    category: str,
) -> Dict[str, Any]:
    updated = dict(entry)
    purchases = entry.get("recommended_purchases", [])
    if isinstance(purchases, list):
        updated["recommended_purchases"] = filter_summer_texts([str(p) for p in purchases])

    missing_styles = entry.get("missing_styles", [])
    if isinstance(missing_styles, list) and category in SUMMER_LOW_PRIORITY_CATEGORIES:
        updated["missing_styles"] = [
            style
            for style in missing_styles
            if str(style).lower() not in SUMMER_SUMMER_STYLE_BLOCKLIST
            and "merino" not in str(style).lower()
            and "cable" not in str(style).lower()
        ]

    return updated


def _filter_category_insights(
    insights: List[Dict[str, Any]],
    occasion: str,
) -> List[Dict[str, Any]]:
    filtered: List[Dict[str, Any]] = []
    for insight in insights:
        updated = dict(insight)
        category = str(insight.get("category", ""))
        recommendation = str(insight.get("recommendation", ""))
        if text_has_summer_blocklist(recommendation):
            updated["recommendation"] = (
                f"No urgent {category} purchase needed for warm weather right now."
            )
        if category in SUMMER_LOW_PRIORITY_CATEGORIES and occasion not in FORMAL_OCCASIONS:
            updated["priority"] = "Low"
        filtered.append(updated)
    return filtered


def apply_wardrobe_gap_season_filters(
    *,
    season: str,
    occasion: str,
    analysis_by_category: Dict[str, Dict[str, Any]],
    priority_shopping_list: List[Dict[str, Any]],
    category_insights: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Post-process wardrobe gap analysis for season-appropriate recommendations.
    Currently applies summer blocklist + shopping-list deprioritization.
    """
    normalized_season = _normalize_season(season)
    normalized_occasion = _normalize_occasion(occasion)

    if normalized_season != "summer":
        insights = category_insights if category_insights is not None else []
        return analysis_by_category, priority_shopping_list, insights

    filtered_categories = {
        category: _filter_category_entry(entry, category)
        for category, entry in analysis_by_category.items()
    }
    filtered_shopping_list = _rerank_shopping_list(priority_shopping_list, normalized_occasion)
    filtered_insights = _filter_category_insights(
        category_insights if category_insights is not None else [],
        normalized_occasion,
    )
    return filtered_categories, filtered_shopping_list, filtered_insights
