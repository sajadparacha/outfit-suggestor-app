"""Outfit data models"""
from pydantic import BaseModel, Field


class OutfitSuggestion(BaseModel):
    """Model for outfit suggestion response"""
    shirt: str = Field(..., description="Description of the recommended shirt")
    trouser: str = Field(..., description="Description of the recommended trousers/pants")
    blazer: str = Field(..., description="Description of the recommended blazer/jacket")
    shoes: str = Field(..., description="Description of the recommended shoes")
    belt: str = Field(..., description="Description of the recommended belt")
    reasoning: str = Field(..., description="Explanation of why this outfit works well")
    model_image: str | None = Field(None, description="Base64 encoded image of model wearing the outfit")
    matching_wardrobe_items: dict | None = Field(None, description="Matching items from user's wardrobe organized by category")
    cost: dict | None = Field(None, description="Cost breakdown for the AI suggestion in USD")
    upload_matched_category: str | None = Field(
        None,
        description="Category of the wardrobe item that matched the uploaded image (e.g. shirt, trouser). Use so the UI shows the upload thumbnail only for that category."
    )
    shirt_id: int | None = Field(
        None,
        description="Primary key of the selected shirt from user's wardrobe when available."
    )
    trouser_id: int | None = Field(
        None,
        description="Primary key of the selected trouser from user's wardrobe when available."
    )
    blazer_id: int | None = Field(
        None,
        description="Primary key of the selected blazer from user's wardrobe when available."
    )
    shoes_id: int | None = Field(
        None,
        description="Primary key of the selected shoes from user's wardrobe when available."
    )
    belt_id: int | None = Field(
        None,
        description="Primary key of the selected belt from user's wardrobe when available."
    )
    source_wardrobe_item_id: int | None = Field(
        None,
        description="Primary key of the wardrobe item selected by the user before generating this AI suggestion."
    )
    source_slot: str | None = Field(
        None,
        description="AI-identified slot/category of the uploaded item in this outfit (shirt, trouser, blazer, shoes, belt)."
    )
    ai_prompt: str | None = Field(
        None,
        description="Complete prompt sent to the AI model for this suggestion."
    )
    ai_raw_response: str | None = Field(
        None,
        description="Raw text response returned by the AI model before parsing."
    )


class OutfitRequest(BaseModel):
    """Model for outfit suggestion request"""
    text_input: str = Field(default="", description="Additional context or preferences")


class WardrobeOnlyOutfitRequest(BaseModel):
    """Request body for wardrobe-only outfit suggestion (no uploaded image)."""
    occasion: str = Field(default="casual", description="Occasion (casual, business, formal, etc.)")
    season: str = Field(default="all", description="Season (all, spring, summer, fall, winter)")
    style: str = Field(default="modern", description="Style preference (modern, classic, etc.)")
    text_input: str = Field(default="", description="Optional extra preferences or notes from user")

