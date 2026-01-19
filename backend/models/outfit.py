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


class OutfitRequest(BaseModel):
    """Model for outfit suggestion request"""
    text_input: str = Field(default="", description="Additional context or preferences")

