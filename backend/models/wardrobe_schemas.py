"""Pydantic schemas for wardrobe API requests and responses"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Literal, Any
from datetime import datetime


def _coerce_str_or_list(value: Any) -> Optional[List[str]]:
    """Accept a single string or a list (Insights multi-select, backward compatible)."""
    if value is None:
        return None
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item) for item in value]
    return None


class WardrobeItemCreate(BaseModel):
    """Schema for creating a wardrobe item - simplified to only essential fields"""
    category: str = Field(..., description="Clothing category (shirt, trouser, blazer, shoes, belt, etc.)")
    color: str = Field(..., description="Item color with specific shade")
    description: str = Field(..., description="Style description including fit, formality, pattern, and key features")


class WardrobeItemUpdate(BaseModel):
    """Schema for updating a wardrobe item"""
    category: Optional[str] = Field(None, description="Clothing category")
    name: Optional[str] = Field(None, description="Item name")
    description: Optional[str] = Field(None, description="Item description")
    color: Optional[str] = Field(None, description="Item color")
    brand: Optional[str] = Field(None, description="Brand name")
    size: Optional[str] = Field(None, description="Size")
    tags: Optional[str] = Field(None, description="Tags")
    condition: Optional[str] = Field(None, description="Condition")


class WardrobeItemResponse(BaseModel):
    """Schema for wardrobe item response"""
    id: int
    category: str
    name: Optional[str]
    description: Optional[str]
    color: Optional[str]
    brand: Optional[str]
    size: Optional[str]
    image_data: Optional[str]
    tags: Optional[str]
    condition: Optional[str]
    wear_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class WardrobeSummaryResponse(BaseModel):
    """Schema for wardrobe summary response"""
    total_items: int
    by_category: dict
    by_color: dict
    categories: list


class WardrobeGapAnalysisRequest(BaseModel):
    """Schema for wardrobe gap analysis request."""
    occasion: str = Field(default="casual", description="Occasion (casual, business, formal, etc.)")
    season: str = Field(default="all", description="Season (all, spring, summer, fall, winter)")
    style: str = Field(default="modern", description="Preferred dressing style")
    text_input: str = Field(default="", description="Optional free-text preferences")
    analysis_mode: Literal["free", "premium"] = Field(
        default="free",
        description="free = rules-based local analysis, premium = ChatGPT-powered analysis",
    )
    lifestyle_mix: Optional[List[str]] = Field(
        default=None,
        description="Insights lifestyle mix: work, everyday, social, formal, sport (max 3)",
    )
    primary_lifestyle: Optional[str] = Field(
        default=None,
        description="Primary lifestyle mix item",
    )
    dress_code: Optional[List[str]] = Field(
        default=None,
        description="One or more: casual, smart-casual, business-professional, or formal",
    )
    climate: Optional[List[str]] = Field(
        default=None,
        description="Optional climate gap flags: hot, temperate, and/or cold",
    )
    style_primary: Optional[List[str]] = Field(
        default=None,
        description="One or more Insights styles; first item is primary",
    )
    style_accent: Optional[List[str]] = Field(
        default=None,
        description="Optional style accents",
    )
    event_focus: Optional[str] = Field(
        default=None,
        description="Optional single-event deep-dive (Suggest occasion value)",
    )

    @field_validator("dress_code", "climate", "style_primary", "style_accent", mode="before")
    @classmethod
    def coerce_optional_str_or_list(cls, value: Any) -> Optional[List[str]]:
        return _coerce_str_or_list(value)


class WardrobeCategoryGapResponse(BaseModel):
    """Per-category wardrobe gap analysis result."""
    category: str
    owned_colors: List[str]
    owned_styles: List[str]
    missing_colors: List[str]
    missing_styles: List[str]
    recommended_purchases: List[str]
    item_count: int
    style_priorities: Optional[Dict[str, Literal["Essential", "Useful", "Skip"]]] = None


class WardrobePriorityItemResponse(BaseModel):
    """Ranked shopping recommendation item."""
    rank: int
    itemName: str
    category: str
    priority: Literal["High", "Medium", "Low"]
    recommendedColors: List[str]
    recommendedStyles: List[str]
    reason: str
    outfitImpact: str
    actions: List[str]


class WardrobeCategoryInsightResponse(BaseModel):
    """User-friendly category level insight."""
    category: str
    missingColors: List[str]
    missingStyles: List[str]
    priority: Literal["High", "Medium", "Low"]
    whyThisMatters: str
    recommendation: str
    suggestedActions: List[str]


class WardrobeGapAnalysisResponse(BaseModel):
    """Wardrobe gap analysis response."""
    occasion: str
    season: str
    style: str
    analysis_mode: str = "free"
    analysis_by_category: Dict[str, WardrobeCategoryGapResponse]
    overall_summary: str
    summaryText: Optional[str] = None
    analysisDepth: Optional[Literal["Basic", "Advanced", "Premium"]] = None
    priorityShoppingList: Optional[List[WardrobePriorityItemResponse]] = None
    categoryInsights: Optional[List[WardrobeCategoryInsightResponse]] = None
    ai_prompt: Optional[str] = None
    ai_raw_response: Optional[str] = None
    cost: Optional[dict] = None

