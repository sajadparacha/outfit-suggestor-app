"""Outfit suggestion API routes"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from typing import Optional, List
from sqlalchemy.orm import Session

from models.outfit import OutfitSuggestion
from models.outfit_history import OutfitHistory
from models.database import get_db
from services.ai_service import AIService
from utils.image_processor import encode_image, validate_image
from config import get_ai_service


router = APIRouter(prefix="/api", tags=["outfit"])


@router.post("/suggest-outfit", response_model=OutfitSuggestion)
async def suggest_outfit(
    image: UploadFile = File(...),
    text_input: str = Form(""),
    ai_service: AIService = Depends(get_ai_service),
    db: Session = Depends(get_db)
):
    """
    Analyze an uploaded image and provide outfit suggestions
    
    Args:
        image: Uploaded image file
        text_input: Additional context or preferences (optional)
        ai_service: AI service dependency injection
        db: Database session dependency injection
        
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
        
        # Save to database (including the image)
        history_entry = OutfitHistory(
            text_input=text_input,
            image_data=image_base64,  # Store the base64 encoded image
            shirt=suggestion.shirt,
            trouser=suggestion.trouser,
            blazer=suggestion.blazer,
            shoes=suggestion.shoes,
            belt=suggestion.belt,
            reasoning=suggestion.reasoning
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        
        return suggestion
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/outfit-history", response_model=List[dict])
async def get_outfit_history(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get outfit suggestion history
    
    Args:
        limit: Maximum number of history entries to return (default: 20)
        db: Database session dependency injection
        
    Returns:
        List of outfit history entries
    """
    try:
        history = db.query(OutfitHistory)\
            .order_by(OutfitHistory.created_at.desc())\
            .limit(limit)\
            .all()
        
        return [
            {
                "id": entry.id,
                "created_at": entry.created_at.isoformat(),
                "text_input": entry.text_input,
                "image_data": entry.image_data,  # Include the base64 image
                "shirt": entry.shirt,
                "trouser": entry.trouser,
                "blazer": entry.blazer,
                "shoes": entry.shoes,
                "belt": entry.belt,
                "reasoning": entry.reasoning
            }
            for entry in history
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching history: {str(e)}"
        )

