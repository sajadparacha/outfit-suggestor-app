"""Pydantic schemas for wardrobe API requests and responses"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


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


class WardrobeCategoryGapResponse(BaseModel):
    """Per-category wardrobe gap analysis result."""
    category: str
    owned_colors: List[str]
    owned_styles: List[str]
    missing_colors: List[str]
    missing_styles: List[str]
    recommended_purchases: List[str]
    item_count: int


class WardrobeGapAnalysisResponse(BaseModel):
    """Wardrobe gap analysis response."""
    occasion: str
    season: str
    style: str
    analysis_by_category: Dict[str, WardrobeCategoryGapResponse]
    overall_summary: str

