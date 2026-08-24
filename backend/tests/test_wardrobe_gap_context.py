from models.wardrobe_schemas import WardrobeGapAnalysisRequest
from services.wardrobe_gap_context import (
    normalize_lifestyle_mix,
    resolve_gap_analysis_context,
)
from services.wardrobe_service import WardrobeService


def test_normalize_lifestyle_mix_caps_at_three_and_promotes_primary():
    mix = normalize_lifestyle_mix(
        ["work", "everyday", "social", "sport"],
        primary="social",
    )
    assert mix == ["social", "work", "everyday"]


def test_legacy_request_keeps_occasion_season_style():
    ctx = resolve_gap_analysis_context(
        occasion="business",
        season="winter",
        style="classic",
    )
    assert ctx.used_lifestyle is False
    assert ctx.occasion == "business"
    assert ctx.season == "winter"
    assert ctx.style == "classic"
    assert ctx.display_occasion == "business"
    assert "occasion: business" in ctx.prompt_context


def test_work_smart_casual_maps_to_work_year_round():
    ctx = resolve_gap_analysis_context(
        occasion="everyday",
        season="summer",
        style="preppy",
        lifestyle_mix=["work", "everyday"],
        primary_lifestyle="work",
        dress_code="smart-casual",
        style_primary="classic",
    )
    assert ctx.used_lifestyle is True
    assert ctx.occasion == "work"
    assert ctx.season == "all-season"
    assert ctx.style == "classic"
    assert ctx.display_occasion == "Work + Everyday"
    assert ctx.display_season == "Smart casual · Year-round"
    assert ctx.display_style == "Classic"
    assert "lifestyle mix: Work (primary), Everyday" in ctx.prompt_context
    assert "dress code: smart-casual" in ctx.prompt_context


def test_work_business_professional_maps_to_business():
    ctx = resolve_gap_analysis_context(
        occasion="work",
        season="all-season",
        style="classic",
        lifestyle_mix=["work"],
        primary_lifestyle="work",
        dress_code="business-professional",
        style_primary="classic",
        style_accent="preppy",
        climate="hot",
    )
    assert ctx.occasion == "business"
    assert ctx.season == "summer"
    assert ctx.display_season == "Business professional · Year-round / Hot"
    assert ctx.display_style == "Classic with Preppy accent"
    assert "climate gaps: Hot" in ctx.prompt_context


def test_schema_accepts_string_or_list_for_multi_fields():
    as_string = WardrobeGapAnalysisRequest(
        dress_code="casual",
        climate="hot",
        style_primary="classic",
        style_accent="vintage",
    )
    assert as_string.dress_code == ["casual"]
    assert as_string.climate == ["hot"]
    assert as_string.style_primary == ["classic"]
    assert as_string.style_accent == ["vintage"]

    as_list = WardrobeGapAnalysisRequest(
        dress_code=["smart-casual", "casual"],
        climate=["hot", "cold"],
        style_primary=["classic", "preppy"],
        style_accent=["vintage", "edgy"],
    )
    assert as_list.dress_code == ["smart-casual", "casual"]
    assert as_list.climate == ["hot", "cold"]
    assert as_list.style_primary == ["classic", "preppy"]
    assert as_list.style_accent == ["vintage", "edgy"]


def test_multi_select_lists_join_in_display_and_prompt():
    ctx = resolve_gap_analysis_context(
        occasion="work",
        season="all-season",
        style="classic",
        lifestyle_mix=["work", "everyday"],
        primary_lifestyle="work",
        dress_code=["smart-casual", "casual"],
        climate=["hot", "cold"],
        style_primary=["classic", "preppy"],
        style_accent=["vintage", "edgy"],
    )
    assert ctx.used_lifestyle is True
    assert ctx.occasion == "work"
    assert ctx.season == "all-season"
    assert ctx.style == "classic"
    assert ctx.dress_codes == ["smart-casual", "casual"]
    assert ctx.climates == ["hot", "cold"]
    assert ctx.style_primaries == ["classic", "preppy"]
    assert ctx.style_accents == ["vintage", "edgy"]
    assert ctx.display_season == "Smart casual + Casual · Year-round / Hot + Cold"
    assert ctx.display_style == "Classic + Preppy with Vintage + Edgy accents"
    assert "dress code: smart-casual, casual" in ctx.prompt_context
    assert "climate gaps: Hot, Cold" in ctx.prompt_context
    assert "style primary: classic (primary), preppy" in ctx.prompt_context
    assert "style accent: vintage, edgy" in ctx.prompt_context


def test_work_plus_any_formal_dress_code_maps_to_business():
    ctx = resolve_gap_analysis_context(
        occasion="work",
        season="all-season",
        style="classic",
        lifestyle_mix=["work"],
        primary_lifestyle="work",
        dress_code=["smart-casual", "formal"],
        style_primary=["classic"],
    )
    assert ctx.occasion == "business"


def test_combined_dress_codes_take_best_rank():
    ws = WardrobeService()
    casual_only = ws.rank_missing_style(
        "shoes",
        "derby shoes",
        occasion="everyday",
        dress_code="casual",
    )
    combined = ws.rank_missing_style(
        "shoes",
        "derby shoes",
        occasion="everyday",
        dress_code=["casual", "formal"],
    )
    assert casual_only == "Skip"
    assert combined == "Essential"
