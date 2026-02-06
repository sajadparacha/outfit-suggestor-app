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
    image_model: str = Form("dalle3"),
    use_wardrobe_only: str = Form("false"),
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
    use_wardrobe_only_bool = use_wardrobe_only.lower() in ('true', '1', 'yes', 'on')
    return await outfit_controller.suggest_outfit(
        image=image,
        text_input=text_input,
        location=location,
        generate_model_image=generate_model_image,
        image_model=image_model,
        use_wardrobe_only=use_wardrobe_only_bool,
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


@router.delete("/outfit-history/{entry_id}")
async def delete_outfit_history(
    entry_id: int,
    outfit_controller: OutfitController = Depends(get_outfit_controller),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Delete an outfit history entry
    
    Args:
        entry_id: History entry ID to delete
        outfit_controller: Outfit controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user (required)
        
    Returns:
        Dict with success message
    """
    return await outfit_controller.delete_outfit_history(
        entry_id=entry_id,
        db=db,
        current_user=current_user
    )


@router.post("/suggest-outfit-from-wardrobe-item/{wardrobe_item_id}", response_model=OutfitSuggestion)
async def suggest_outfit_from_wardrobe_item(
    wardrobe_item_id: int,
    text_input: str = Form(""),
    location: str = Form(None),
    generate_model_image: str = Form("false"),
    image_model: str = Form("dalle3"),
    use_wardrobe_only: str = Form("false"),
    outfit_controller: OutfitController = Depends(get_outfit_controller),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Generate outfit suggestions using a wardrobe item's image
    
    Args:
        wardrobe_item_id: ID of the wardrobe item to use for outfit suggestion
        text_input: Additional context or preferences (optional)
        location: User's location (optional)
        generate_model_image: Whether to generate model image (as string)
        image_model: Image generation model (optional)
        outfit_controller: Outfit controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user (required)
        
    Returns:
        OutfitSuggestion object with complete outfit recommendation
        
    Raises:
        HTTPException: If wardrobe item not found or processing error occurs
    """
    use_wardrobe_only_bool = use_wardrobe_only.lower() in ('true', '1', 'yes', 'on')
    return await outfit_controller.suggest_outfit_from_wardrobe_item(
        wardrobe_item_id=wardrobe_item_id,
        text_input=text_input,
        location=location,
        generate_model_image=generate_model_image,
        image_model=image_model,
        use_wardrobe_only=use_wardrobe_only_bool,
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

