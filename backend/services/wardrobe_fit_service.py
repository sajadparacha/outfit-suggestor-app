"""Deterministic wardrobe fit evaluation: pair counts + goal gap + fact-bound summary."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

from models.wardrobe import WardrobeItem
from services.wardrobe_gap_context import DRESS_CODE_LABELS, LIFESTYLE_LABELS
from services.wardrobe_service import WardrobeService

# Categories a candidate can meaningfully pair with (excluding same-slot duplicates).
PAIRABLE_SLOTS: Tuple[str, ...] = (
    "shirt",
    "trouser",
    "blazer",
    "sweater",
    "jacket",
    "shoes",
    "belt",
    "tie",
)

# Same-slot categories: do not count as "pairs with" (another blazer ≠ pairing).
SAME_SLOT: Dict[str, Set[str]] = {
    "shirt": {"shirt", "polo", "t-shirt", "tshirt"},
    "trouser": {"trouser", "jeans", "shorts", "pants"},
    "blazer": {"blazer", "suit"},
    "sweater": {"sweater"},
    "jacket": {"jacket", "coat", "outerwear"},
    "coat": {"jacket", "coat", "outerwear"},
    "shoes": {"shoes"},
    "belt": {"belt"},
    "tie": {"tie"},
}

# Neutrals that pair broadly.
NEUTRAL_COLORS = {
    "black",
    "white",
    "gray",
    "grey",
    "navy",
    "beige",
    "cream",
    "ivory",
    "tan",
    "charcoal",
    "khaki",
    "brown",
}

FORMALITY_WORDS = {
    "formal",
    "business",
    "office",
    "dress",
    "tailored",
    "professional",
    "suit",
    "oxford",
    "loafer",
    "derby",
}
CASUAL_WORDS = {
    "casual",
    "sport",
    "athletic",
    "denim",
    "sneaker",
    "hoodie",
    "graphic",
    "relaxed",
}

CATEGORY_LABEL_PLURAL = {
    "shirt": "shirts",
    "trouser": "trousers",
    "blazer": "blazers",
    "sweater": "sweaters",
    "jacket": "jackets",
    "coat": "coats",
    "shoes": "shoes",
    "belt": "belts",
    "tie": "ties",
}

CATEGORY_LABEL_SINGULAR = {
    "shirt": "shirt",
    "trouser": "trousers",
    "blazer": "blazer",
    "sweater": "sweater",
    "jacket": "jacket",
    "coat": "coat",
    "shoes": "pair of shoes",
    "belt": "belt",
    "tie": "tie",
}

FOUNDATIONAL_ORDER = (
    "shoes",
    "shirt",
    "trouser",
    "blazer",
    "belt",
    "sweater",
    "jacket",
    "tie",
)


def _number_word(n: int) -> str:
    words = {
        0: "zero",
        1: "one",
        2: "two",
        3: "three",
        4: "four",
        5: "five",
        6: "six",
        7: "seven",
        8: "eight",
        9: "nine",
        10: "ten",
    }
    return words.get(n, str(n))


def _extract_color_tokens(color: Optional[str], description: Optional[str] = None) -> Set[str]:
    text = f"{color or ''} {description or ''}".lower()
    tokens: Set[str] = set()
    palette = [
        "black",
        "white",
        "gray",
        "grey",
        "navy",
        "blue",
        "red",
        "green",
        "yellow",
        "orange",
        "purple",
        "pink",
        "brown",
        "beige",
        "tan",
        "burgundy",
        "maroon",
        "charcoal",
        "olive",
        "khaki",
        "cream",
        "ivory",
        "cognac",
    ]
    for c in palette:
        if c in text:
            tokens.add("gray" if c == "grey" else c)
    return tokens


def _formality_score(text: str) -> int:
    lowered = (text or "").lower()
    score = 0
    for w in FORMALITY_WORDS:
        if w in lowered:
            score += 1
    for w in CASUAL_WORDS:
        if w in lowered:
            score -= 1
    return score


def build_goal_label(
    dress_code: Optional[str],
    primary_lifestyle: Optional[str],
) -> str:
    code = (dress_code or "smart-casual").strip().lower()
    if code == "business-professional":
        return "business-professional"
    if code == "smart-casual":
        return "business-casual"
    if code == "formal":
        return "formal"
    if code == "casual":
        primary = (primary_lifestyle or "everyday").strip().lower()
        return f"{primary} casual" if primary else "casual"
    return DRESS_CODE_LABELS.get(code, code).lower()


class WardrobeFitService:
    """Evaluate how a candidate item fits an owned wardrobe + lifestyle goal."""

    def __init__(self, wardrobe_service: Optional[WardrobeService] = None):
        self.wardrobe_service = wardrobe_service or WardrobeService()

    def normalize_category(self, category: str) -> str:
        return self.wardrobe_service._normalize_category(category)

    def evaluate(
        self,
        *,
        candidate: WardrobeItem | Dict[str, Any],
        wardrobe_items: Sequence[WardrobeItem],
        dress_code: Optional[str] = "smart-casual",
        lifestyle_mix: Optional[List[str]] = None,
        primary_lifestyle: Optional[str] = None,
        style_primary: Optional[str] = None,
        text_input: str = "",
    ) -> Dict[str, Any]:
        cand = self._as_candidate_dict(candidate)
        cand_id = cand.get("id")
        cand_cat = self.normalize_category(cand.get("category") or "other")

        others = [
            item
            for item in wardrobe_items
            if cand_id is None or item.id != cand_id
        ]

        pairs_with = self._compute_pairs(cand, others)
        outfit_multiplier = sum(row["count"] for row in pairs_with)

        gap = self._missing_for_goal(
            cand_cat=cand_cat,
            wardrobe_items=others,
            dress_code=dress_code,
            lifestyle_mix=lifestyle_mix,
            primary_lifestyle=primary_lifestyle,
            style_primary=style_primary,
        )

        verdict = self._verdict(
            outfit_multiplier=outfit_multiplier,
            candidate_fills=gap["candidate_fills_this_gap"],
            same_category_owned=self._same_slot_count(cand_cat, others),
        )

        goal_label = build_goal_label(dress_code, primary_lifestyle)
        summary = self._build_summary(
            candidate_label=cand["label"],
            candidate_category=cand_cat,
            pairs_with=pairs_with,
            goal_label=goal_label,
            missing=gap,
            verdict=verdict,
        )

        mix = lifestyle_mix or ["work", "everyday"]
        return {
            "candidate": {
                "id": cand.get("id"),
                "category": cand_cat,
                "label": cand["label"],
                "color": cand.get("color"),
                "image_data": cand.get("image_data"),
            },
            "goal": {
                "label": goal_label,
                "dress_code": (dress_code or "smart-casual").strip().lower(),
                "lifestyle_mix": list(mix),
                "primary_lifestyle": (primary_lifestyle or (mix[0] if mix else "work")),
                "style_primary": (style_primary or "classic"),
                "text_input": text_input or "",
            },
            "pairs_with": pairs_with,
            "outfit_multiplier": outfit_multiplier,
            "verdict": verdict,
            "missing_for_goal": gap,
            "summary_text": summary,
        }

    def _as_candidate_dict(self, candidate: WardrobeItem | Dict[str, Any]) -> Dict[str, Any]:
        if isinstance(candidate, dict):
            category = candidate.get("category") or "other"
            color = candidate.get("color") or ""
            description = candidate.get("description") or ""
            name = candidate.get("name") or ""
            label = name.strip() or self._default_label(category, color)
            return {
                "id": candidate.get("id"),
                "category": category,
                "color": color,
                "description": description,
                "name": name,
                "image_data": candidate.get("image_data"),
                "label": label,
            }
        category = candidate.category or "other"
        color = candidate.color or ""
        label = (candidate.name or "").strip() or self._default_label(category, color)
        return {
            "id": candidate.id,
            "category": category,
            "color": color,
            "description": candidate.description or "",
            "name": candidate.name or "",
            "image_data": candidate.image_data,
            "label": label,
        }

    def _default_label(self, category: str, color: str) -> str:
        cat = self.normalize_category(category)
        singular = CATEGORY_LABEL_SINGULAR.get(cat, cat or "item")
        if color:
            return f"{color.strip()} {singular}".strip()
        return singular

    def _same_slot_set(self, category: str) -> Set[str]:
        cat = self.normalize_category(category)
        return SAME_SLOT.get(cat, {cat})

    def _same_slot_count(self, cand_cat: str, items: Sequence[WardrobeItem]) -> int:
        slot = self._same_slot_set(cand_cat)
        n = 0
        for item in items:
            if self.normalize_category(item.category or "") in slot:
                n += 1
        return n

    def _compute_pairs(
        self,
        candidate: Dict[str, Any],
        others: Sequence[WardrobeItem],
    ) -> List[Dict[str, Any]]:
        cand_cat = self.normalize_category(candidate.get("category") or "")
        same_slot = self._same_slot_set(cand_cat)
        cand_colors = _extract_color_tokens(candidate.get("color"), candidate.get("description"))
        cand_text = f"{candidate.get('color') or ''} {candidate.get('description') or ''}"
        cand_formality = _formality_score(cand_text)

        by_cat: Dict[str, List[Tuple[int, WardrobeItem]]] = {}
        for item in others:
            item_cat = self.normalize_category(item.category or "")
            if item_cat in same_slot:
                continue
            if item_cat not in PAIRABLE_SLOTS and item_cat not in {
                "polo",
                "t-shirt",
                "jeans",
                "shorts",
                "coat",
            }:
                # Map aliases already handled; skip unknown
                continue
            # Map polo/t-shirt → shirt slot for display
            display_cat = item_cat
            if item_cat in {"polo", "t-shirt", "tshirt"}:
                display_cat = "shirt"
            elif item_cat in {"jeans", "shorts", "pants"}:
                display_cat = "trouser"
            elif item_cat == "coat":
                display_cat = "jacket"

            score = self._pair_score(cand_colors, cand_formality, item)
            if score <= 0:
                continue
            by_cat.setdefault(display_cat, []).append((score, item))

        rows: List[Dict[str, Any]] = []
        for cat in PAIRABLE_SLOTS:
            scored = by_cat.get(cat) or []
            if not scored:
                continue
            scored.sort(key=lambda t: (-t[0], t[1].id or 0))
            top = scored[:3]
            items_payload = [
                {
                    "id": item.id,
                    "label": (item.name or "").strip()
                    or self._default_label(item.category or cat, item.color or ""),
                    "color": item.color,
                    "image_data": item.image_data,
                }
                for _, item in top
            ]
            rows.append(
                {
                    "category": cat,
                    "count": len(scored),
                    "items": items_payload,
                }
            )
        return rows

    def _pair_score(
        self,
        cand_colors: Set[str],
        cand_formality: int,
        item: WardrobeItem,
    ) -> int:
        item_colors = _extract_color_tokens(item.color, item.description)
        item_text = f"{item.color or ''} {item.description or ''}"
        item_formality = _formality_score(item_text)

        score = 1  # same wardrobe, different slot → at least weak pairing baseline

        if cand_colors and item_colors:
            if cand_colors & item_colors:
                score += 2
            elif cand_colors & NEUTRAL_COLORS or item_colors & NEUTRAL_COLORS:
                score += 2
            else:
                # Different non-neutral colors can still work (e.g. navy + grey)
                score += 1
        elif not cand_colors or not item_colors:
            score += 1

        # Formality clash penalty (sneaker vs tuxedo blazer)
        if abs(cand_formality - item_formality) >= 3:
            score -= 2
        elif abs(cand_formality - item_formality) <= 1:
            score += 1

        return score

    def _missing_for_goal(
        self,
        *,
        cand_cat: str,
        wardrobe_items: Sequence[WardrobeItem],
        dress_code: Optional[str],
        lifestyle_mix: Optional[List[str]],
        primary_lifestyle: Optional[str],
        style_primary: Optional[str],
    ) -> Dict[str, Any]:
        counts: Dict[str, int] = {c: 0 for c in FOUNDATIONAL_ORDER}
        for item in wardrobe_items:
            cat = self.normalize_category(item.category or "")
            if cat in {"polo", "t-shirt", "tshirt"}:
                cat = "shirt"
            elif cat in {"jeans", "shorts", "pants"}:
                cat = "trouser"
            elif cat == "coat":
                cat = "jacket"
            if cat in counts:
                counts[cat] += 1

        code = (dress_code or "smart-casual").strip().lower()
        # Foundational for business-casual / professional: shoes, shirt, trouser, blazer, belt
        priority = list(FOUNDATIONAL_ORDER)
        if code in {"casual"}:
            priority = ["shoes", "shirt", "trouser", "jacket", "sweater", "belt", "blazer", "tie"]
        elif code in {"formal", "business-professional"}:
            priority = ["shoes", "shirt", "trouser", "blazer", "belt", "tie", "sweater", "jacket"]

        missing_cat: Optional[str] = None
        for cat in priority:
            if counts.get(cat, 0) == 0:
                missing_cat = cat
                break

        if missing_cat is None:
            # Soft gap: sparsest foundational category
            soft = min(priority, key=lambda c: counts.get(c, 0))
            if counts.get(soft, 0) < 2:
                missing_cat = soft
            else:
                missing_cat = soft

        fills = cand_cat == missing_cat or (
            cand_cat in self._same_slot_set(missing_cat) if missing_cat else False
        )

        label = CATEGORY_LABEL_SINGULAR.get(missing_cat or "item", missing_cat or "item")
        if fills:
            reason = (
                f"This {CATEGORY_LABEL_SINGULAR.get(cand_cat, cand_cat)} addresses your top gap "
                f"for a {build_goal_label(dress_code, primary_lifestyle)} wardrobe."
            )
        else:
            reason = (
                f"You can unlock more complete {build_goal_label(dress_code, primary_lifestyle)} looks "
                f"once you add {label}."
            )

        return {
            "category": missing_cat,
            "label": label,
            "reason": reason,
            "candidate_fills_this_gap": bool(fills),
        }

    def _verdict(
        self,
        *,
        outfit_multiplier: int,
        candidate_fills: bool,
        same_category_owned: int,
    ) -> str:
        if same_category_owned >= 2 and not candidate_fills and outfit_multiplier < 3:
            return "redundant"
        if outfit_multiplier >= 3 or candidate_fills:
            return "strong_fit"
        if outfit_multiplier >= 1:
            return "weak_fit"
        if candidate_fills:
            return "strong_fit"
        return "redundant" if same_category_owned >= 1 else "weak_fit"

    def _build_summary(
        self,
        *,
        candidate_label: str,
        candidate_category: str,
        pairs_with: List[Dict[str, Any]],
        goal_label: str,
        missing: Dict[str, Any],
        verdict: str,
    ) -> str:
        # Lead with concrete pair counts (fact-bound).
        pair_bits = []
        for row in pairs_with:
            count = int(row["count"])
            cat = row["category"]
            plural = CATEGORY_LABEL_PLURAL.get(cat, f"{cat}s")
            pair_bits.append(f"{_number_word(count)} {plural}")

        cand_ref = candidate_label.strip() or CATEGORY_LABEL_SINGULAR.get(
            candidate_category, "item"
        )
        # Prefer "This blazer" style when label is generic color+category
        article_noun = CATEGORY_LABEL_SINGULAR.get(candidate_category, "item")
        this_piece = f"This {article_noun}"

        if pair_bits:
            if len(pair_bits) == 1:
                works = f"{this_piece} works with {pair_bits[0]} you already own."
            elif len(pair_bits) == 2:
                works = (
                    f"{this_piece} works with {pair_bits[0]} and {pair_bits[1]} "
                    f"you already own."
                )
            else:
                works = (
                    f"{this_piece} works with {', '.join(pair_bits[:-1])}, and "
                    f"{pair_bits[-1]} you already own."
                )
        else:
            works = (
                f"{this_piece} doesn’t yet have clear pairings in your wardrobe — "
                f"add more pieces to see what it works with."
            )

        missing_label = missing.get("label") or "item"
        if missing.get("candidate_fills_this_gap"):
            gap_sentence = (
                f"For the {goal_label} wardrobe you’re building, this is the piece "
                f"you’re missing."
            )
        else:
            gap_sentence = (
                f"For the {goal_label} wardrobe you’re building, the item you’re "
                f"missing is this {missing_label}."
            )

        # Soften when redundant
        if verdict == "redundant" and not missing.get("candidate_fills_this_gap"):
            gap_sentence = (
                f"For the {goal_label} wardrobe you’re building, prioritize "
                f"{missing_label} over another {article_noun}."
            )

        return f"{works} {gap_sentence}"
