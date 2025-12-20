"""Outfit suggestion API routes - Thin HTTP layer using controllers"""
from fastapi import APIRouter, File, UploadFile, Form, Depends
from typing import Optional, List
from sqlalchemy.orm import Session

from models.outfit import OutfitSuggestion
from models.user import User
from models.database import get_db
from controllers.outfit_controller import OutfitController
from config import get_outfit_controller
from dependencies import get_optional_user


router = APIRouter(prefix="/api", tags=["outfit"])


@router.post("/suggest-outfit", response_model=OutfitSuggestion)
async def suggest_outfit(
    image: UploadFile = File(...),
    text_input: str = Form(""),
    location: str = Form(None),
    generate_model_image: str = Form("false"),
    outfit_controller: OutfitController = Depends(get_outfit_controller),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Analyze an uploaded image and provide outfit suggestions
    
    Args:
        image: Uploaded image file
        text_input: Additional context or preferences (optional)
        location: User's location (optional)
        generate_model_image: Whether to generate model image (as string)
        outfit_controller: Outfit controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user (optional)
        
    Returns:
        OutfitSuggestion object with complete outfit recommendation
        
    Raises:
        HTTPException: If image validation fails or processing error occurs
    """
    return await outfit_controller.suggest_outfit(
        image=image,
        text_input=text_input,
        location=location,
        generate_model_image=generate_model_image,
        db=db,
        current_user=current_user
    )


@router.post("/check-duplicate")
async def check_duplicate(
    image: UploadFile = File(...),
    outfit_controller: OutfitController = Depends(get_outfit_controller),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Check if an uploaded image already exists in history
    
    Args:
        image: Uploaded image file
        outfit_controller: Outfit controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user (optional)
        
    Returns:
        Dict with duplicate status and matching entry if found
    """
    return await outfit_controller.check_duplicate(
        image=image,
        db=db,
        current_user=current_user
    )


@router.get("/outfit-history", response_model=List[dict])
async def get_outfit_history(
    limit: int = 20,
    outfit_controller: OutfitController = Depends(get_outfit_controller),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Get outfit suggestion history
    
    Args:
        limit: Maximum number of history entries to return (default: 20)
        outfit_controller: Outfit controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user (optional)
        
    Returns:
        List of outfit history entries
    """
    return await outfit_controller.get_outfit_history(
        limit=limit,
        db=db,
        current_user=current_user
    )

