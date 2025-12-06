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


class OutfitRequest(BaseModel):
    """Model for outfit suggestion request"""
    text_input: str = Field(default="", description="Additional context or preferences")

