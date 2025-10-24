"""Outfit suggestion API routes"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from typing import Optional

from models.outfit import OutfitSuggestion
from services.ai_service import AIService
from utils.image_processor import encode_image, validate_image
from config import get_ai_service


router = APIRouter(prefix="/api", tags=["outfit"])


@router.post("/suggest-outfit", response_model=OutfitSuggestion)
async def suggest_outfit(
    image: UploadFile = File(...),
    text_input: str = Form(""),
    ai_service: AIService = Depends(get_ai_service)
):
    """
    Analyze an uploaded image and provide outfit suggestions
    
    Args:
        image: Uploaded image file
        text_input: Additional context or preferences (optional)
        ai_service: AI service dependency injection
        
    Returns:
        OutfitSuggestion object with complete outfit recommendation
        
    Raises:
        HTTPException: If image validation fails or processing error occurs
    """
    try:
        # Validate image file
        validate_image(image, max_size_mb=10)
        
        # Encode image to base64
        image_base64 = encode_image(image.file)
        
        # Get outfit suggestion from AI service
        suggestion = ai_service.get_outfit_suggestion(image_base64, text_input)
        
        return suggestion
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )

