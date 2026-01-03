"""Wardrobe API routes - Thin HTTP layer using controllers"""
from fastapi import APIRouter, File, UploadFile, Depends, Form
from typing import Optional, List
from sqlalchemy.orm import Session

from models.wardrobe_schemas import (
    WardrobeItemCreate, 
    WardrobeItemUpdate, 
    WardrobeItemResponse,
    WardrobeSummaryResponse
)
from models.user import User
from models.database import get_db
from controllers.wardrobe_controller import WardrobeController
from config import get_wardrobe_controller
from dependencies import get_current_active_user


router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])


# IMPORTANT: More specific routes must be defined BEFORE less specific ones
# These routes must come before @router.post("") to avoid route conflicts

@router.post("/check-duplicate", name="check_wardrobe_duplicate")
async def check_wardrobe_duplicate(
    image: UploadFile = File(...),
    wardrobe_controller: WardrobeController = Depends(get_wardrobe_controller),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Check if an image already exists in user's wardrobe
    
    Args:
        image: Image file to check for duplicates
        wardrobe_controller: Wardrobe controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user
        
    Returns:
        Dictionary with is_duplicate flag and existing_item if duplicate found
    """
    return await wardrobe_controller.check_duplicate_wardrobe_image(
        image=image,
        db=db,
        current_user=current_user
    )


@router.post("/analyze-image", name="analyze_wardrobe_image")
async def analyze_wardrobe_image(
    image: UploadFile = File(...),
    model_type: str = Form("blip"),  # Default to BLIP, can be "blip" or "vit-gpt2"
    wardrobe_controller: WardrobeController = Depends(get_wardrobe_controller),
    current_user: User = Depends(get_current_active_user)
):
    """
    Analyze a wardrobe item image and extract properties using AI
    
    Args:
        image: Image file of the clothing item
        model_type: AI model to use - "blip" or "vit-gpt2" (default: "blip")
        wardrobe_controller: Wardrobe controller dependency injection
        current_user: Current authenticated user
        
    Returns:
        Dictionary with extracted properties (category, color, description, model_used)
    """
    return await wardrobe_controller.analyze_wardrobe_image(
        image=image,
        model_type=model_type,
        current_user=current_user
    )


@router.post("", response_model=WardrobeItemResponse, status_code=201)
async def add_wardrobe_item(
    category: str = Form(...),
    color: str = Form(...),
    description: str = Form(...),
    image: Optional[UploadFile] = File(None),
    wardrobe_controller: WardrobeController = Depends(get_wardrobe_controller),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a new item to user's wardrobe (simplified - only category, color, description)
    
    Args:
        category: Clothing category (required) - shirt, trouser, blazer, shoes, belt, etc.
        color: Item color with specific shade (required)
        description: Style description including fit, formality, pattern (required)
        image: Item image file (optional)
        wardrobe_controller: Wardrobe controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user
        
    Returns:
        Created WardrobeItemResponse
    """
    item_data = WardrobeItemCreate(
        category=category,
        color=color,
        description=description
    )
    
    return await wardrobe_controller.add_wardrobe_item(
        image=image,
        item_data=item_data,
        db=db,
        current_user=current_user
    )


@router.get("", response_model=List[WardrobeItemResponse])
async def get_wardrobe(
    category: Optional[str] = None,
    wardrobe_controller: WardrobeController = Depends(get_wardrobe_controller),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get user's wardrobe items, optionally filtered by category
    
    Args:
        category: Optional category filter
        wardrobe_controller: Wardrobe controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user
        
    Returns:
        List of WardrobeItemResponse
    """
    return await wardrobe_controller.get_wardrobe(
        category=category,
        db=db,
        current_user=current_user
    )


@router.get("/summary", response_model=WardrobeSummaryResponse)
async def get_wardrobe_summary(
    wardrobe_controller: WardrobeController = Depends(get_wardrobe_controller),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get wardrobe summary with statistics
    
    Args:
        wardrobe_controller: Wardrobe controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user
        
    Returns:
        WardrobeSummaryResponse
    """
    return await wardrobe_controller.get_wardrobe_summary(
        db=db,
        current_user=current_user
    )


@router.get("/{item_id}", response_model=WardrobeItemResponse)
async def get_wardrobe_item(
    item_id: int,
    wardrobe_controller: WardrobeController = Depends(get_wardrobe_controller),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific wardrobe item
    
    Args:
        item_id: Wardrobe item ID
        wardrobe_controller: Wardrobe controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user
        
    Returns:
        WardrobeItemResponse
    """
    return await wardrobe_controller.get_wardrobe_item(
        item_id=item_id,
        db=db,
        current_user=current_user
    )


@router.put("/{item_id}", response_model=WardrobeItemResponse)
async def update_wardrobe_item(
    item_id: int,
    category: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    size: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    condition: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    wardrobe_controller: WardrobeController = Depends(get_wardrobe_controller),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a wardrobe item
    
    Args:
        item_id: Wardrobe item ID
        category: Clothing category (optional)
        name: Item name (optional)
        description: Item description (optional)
        color: Item color (optional)
        brand: Brand name (optional)
        size: Size (optional)
        tags: Tags (optional)
        condition: Condition (optional)
        image: New image file (optional)
        wardrobe_controller: Wardrobe controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user
        
    Returns:
        Updated WardrobeItemResponse
    """
    item_data = WardrobeItemUpdate(
        category=category,
        name=name,
        description=description,
        color=color,
        brand=brand,
        size=size,
        tags=tags,
        condition=condition
    )
    
    return await wardrobe_controller.update_wardrobe_item(
        item_id=item_id,
        item_data=item_data,
        image=image,
        db=db,
        current_user=current_user
    )


@router.delete("/{item_id}")
async def delete_wardrobe_item(
    item_id: int,
    wardrobe_controller: WardrobeController = Depends(get_wardrobe_controller),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a wardrobe item
    
    Args:
        item_id: Wardrobe item ID
        wardrobe_controller: Wardrobe controller dependency injection
        db: Database session dependency injection
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    return await wardrobe_controller.delete_wardrobe_item(
        item_id=item_id,
        db=db,
        current_user=current_user
    )

