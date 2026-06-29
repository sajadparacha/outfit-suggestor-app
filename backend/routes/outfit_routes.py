"""Outfit suggestion API routes - Thin HTTP layer using controllers"""
from fastapi import APIRouter, File, UploadFile, Form, Depends, Body, Request
from typing import Optional, List
from sqlalchemy.orm import Session

from models.outfit import OutfitSuggestion, WardrobeOnlyOutfitRequest
from models.user import User
from models.database import get_db
from controllers.outfit_controller import OutfitController
from config import get_outfit_controller
from dependencies import get_optional_user
from services.guest_usage_service import GuestUsageService


router = APIRouter(prefix="/api", tags=["outfit"])
guest_usage_service = GuestUsageService()


@router.get("/guest-usage")
async def get_guest_usage(
    request: Request,
    db: Session = Depends(get_db),
):
    """Return remaining free AI calls for an anonymous guest session."""
    guest_session_id = guest_usage_service.resolve_guest_session_id(request)
    return guest_usage_service.get_usage(db, guest_session_id)


@router.post("/suggest-outfit", response_model=OutfitSuggestion)
async def suggest_outfit(
    request: Request,
    image: UploadFile = File(...),
    text_input: str = Form(""),
    location: str = Form(None),
    generate_model_image: str = Form("false"),
    image_model: str = Form("dalle3"),
    use_wardrobe_only: str = Form("false"),
    source_wardrobe_item_id: int | None = Form(None),
    previous_outfit_text: str = Form(""),
    occasion: str = Form(""),
    season: str = Form(""),
    style: str = Form(""),
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
    prev = (previous_outfit_text or "").strip() or None
    guest_session_id = None
    if current_user is None:
        guest_session_id = guest_usage_service.resolve_guest_session_id(request)
    return await outfit_controller.suggest_outfit(
        image=image,
        text_input=text_input,
        location=location,
        generate_model_image=generate_model_image,
        image_model=image_model,
        use_wardrobe_only=use_wardrobe_only_bool,
        source_wardrobe_item_id=source_wardrobe_item_id,
        previous_outfit_text=prev,
        occasion=occasion.strip() or None,
        season=season.strip() or None,
        style=style.strip() or None,
        db=db,
        current_user=current_user,
        guest_session_id=guest_session_id,
        guest_usage_service=guest_usage_service,
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
    source_wardrobe_item_id: int | None = Form(None),
    occasion: str = Form(""),
    season: str = Form(""),
    style: str = Form(""),
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
        source_wardrobe_item_id=source_wardrobe_item_id,
        occasion=occasion.strip() or None,
        season=season.strip() or None,
        style=style.strip() or None,
        db=db,
        current_user=current_user
    )


@router.post("/suggest-outfit-from-wardrobe", response_model=OutfitSuggestion)
async def suggest_outfit_from_wardrobe_only(
    body: WardrobeOnlyOutfitRequest = Body(...),
    outfit_controller: OutfitController = Depends(get_outfit_controller),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Suggest an outfit using ONLY the user's wardrobe items (no uploaded image).
    
    Args:
        body: WardrobeOnlyOutfitRequest with occasion, season, style, text_input
        outfit_controller: Outfit controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user (required)
        
    Returns:
        OutfitSuggestion object with recommendation built from wardrobe items only
    """
    if not current_user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Authentication required")

    prev = (body.previous_outfit_text or "").strip() or None
    avoid = [
        t.strip()
        for t in (body.avoid_outfit_texts or [])
        if t and str(t).strip()
    ]

    return await outfit_controller.suggest_outfit_from_wardrobe_only(
        text_input=body.text_input or "",
        occasion=body.occasion,
        season=body.season,
        style=body.style,
        db=db,
        current_user=current_user,
        selected_wardrobe_item_ids=body.selected_wardrobe_item_ids,
        previous_outfit_text=prev,
        avoid_outfit_texts=avoid or None,
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

