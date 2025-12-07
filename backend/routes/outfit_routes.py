"""Outfit suggestion API routes"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
import imagehash
from PIL import Image
import io
import base64

from models.outfit import OutfitSuggestion
from models.outfit_history import OutfitHistory
from models.user import User
from models.database import get_db
from services.ai_service import AIService
from utils.image_processor import encode_image, validate_image
from config import get_ai_service, Config
from dependencies import get_current_active_user, get_optional_user


router = APIRouter(prefix="/api", tags=["outfit"])


def images_are_similar(image1: str, image2: str, threshold: int = None) -> bool:
    """
    Compare two base64 images for similarity using perceptual hashing
    
    Args:
        image1: Base64 encoded image string
        image2: Base64 encoded image string
        threshold: Hamming distance threshold (0 = identical, higher = more different)
                  If None, uses Config.IMAGE_SIMILARITY_THRESHOLD
    
    Returns:
        True if images are similar within threshold, False otherwise
    
    How it works:
        - Converts base64 to PIL Images
        - Computes perceptual hash (pHash) for each image
        - pHash captures visual features (not exact pixels)
        - Compares hashes using Hamming distance
        - Returns True if distance <= threshold
    
    Examples:
        - Same image, different size: distance ~0-2 (similar!)
        - Same shirt, different angle: distance ~3-7 (similar!)
        - Different shirts: distance >15 (not similar)
    """
    if threshold is None:
        threshold = Config.IMAGE_SIMILARITY_THRESHOLD
    
    try:
        # Decode base64 to image bytes
        img1_bytes = base64.b64decode(image1)
        img2_bytes = base64.b64decode(image2)
        
        # Open as PIL Images
        img1 = Image.open(io.BytesIO(img1_bytes))
        img2 = Image.open(io.BytesIO(img2_bytes))
        
        # Compute perceptual hashes (fingerprints of visual content)
        hash1 = imagehash.phash(img1)
        hash2 = imagehash.phash(img2)
        
        # Calculate Hamming distance (number of different bits)
        distance = hash1 - hash2
        
        # Log for debugging (optional)
        print(f"Image comparison - Distance: {distance}, Threshold: {threshold}, Similar: {distance <= threshold}")
        
        return distance <= threshold
        
    except Exception as e:
        # If perceptual hashing fails, fall back to exact match
        print(f"Perceptual hashing failed: {e}, falling back to exact match")
        return image1 == image2


@router.post("/suggest-outfit", response_model=OutfitSuggestion)
async def suggest_outfit(
    image: UploadFile = File(...),
    text_input: str = Form(""),
    location: str = Form(None),  # User's location (e.g., "New York, USA")
    generate_model_image: str = Form("false"),  # Whether to generate model image (comes as string from FormData)
    ai_service: AIService = Depends(get_ai_service),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
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
        validate_image(image, max_size_mb=20)
        
        # Encode image to base64
        image_base64 = encode_image(image.file)
        
        # Get outfit suggestion from AI service
        suggestion = ai_service.get_outfit_suggestion(image_base64, text_input)
        
        # Parse generate_model_image from string to boolean
        should_generate_model_image = generate_model_image.lower() in ('true', '1', 'yes', 'on')
        print(f"🔍 DEBUG: Generate model image requested: {should_generate_model_image} (raw value: '{generate_model_image}')")
        print(f"🔍 DEBUG: Location received: {location}")
        
        # Generate model image if requested
        model_image_base64 = None
        if should_generate_model_image:
            print(f"✅ Starting model image generation...")
            try:
                # Parse location details if provided as JSON string
                location_details = None
                location_string = None
                
                if location:
                    try:
                        import json
                        # Try to parse as JSON first
                        if location.strip().startswith('{'):
                            location_details = json.loads(location)
                        else:
                            # Use as simple string location
                            location_string = location
                    except:
                        # If parsing fails, use as string
                        location_string = location
                
                print(f"🔍 DEBUG: Generating model image with location: {location_string or 'None (using default)'}")
                print(f"🔍 DEBUG: Calling ai_service.generate_model_image...")
                model_image_base64 = ai_service.generate_model_image(
                    suggestion,
                    location=location_string if location_string else None,
                    location_details=location_details if location_details else None
                )
                print(f"✅ Model image generated successfully, length: {len(model_image_base64) if model_image_base64 else 0}")
                # Add model image to suggestion
                suggestion.model_image = model_image_base64
                print(f"✅ Model image added to suggestion: {bool(suggestion.model_image)}")
            except Exception as e:
                # Log error but don't fail the request if image generation fails
                print(f"❌ ERROR: Failed to generate model image: {str(e)}")
                import traceback
                traceback.print_exc()
                suggestion.model_image = None
        else:
            print(f"⏭️  Skipping model image generation (should_generate_model_image = {should_generate_model_image})")
        
        # Save to database (including the image, model image, and user if authenticated)
        history_entry = OutfitHistory(
            user_id=current_user.id if current_user else None,
            text_input=text_input,
            image_data=image_base64,  # Store the base64 encoded uploaded image
            model_image=suggestion.model_image,  # Store the generated model image if available
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
        
        # Debug: Log response before returning
        print(f"🔍 DEBUG: Returning suggestion with model_image: {bool(suggestion.model_image)}")
        if suggestion.model_image:
            print(f"✅ Model image length: {len(suggestion.model_image)}")
            print(f"✅ Model image preview (first 50 chars): {suggestion.model_image[:50]}...")
        else:
            print(f"❌ No model_image in suggestion response")
        
        # Ensure model_image is included in the response
        # Return the Pydantic model directly - it should serialize correctly
        print(f"🔍 DEBUG: Final suggestion object - model_image present: {bool(suggestion.model_image)}")
        if hasattr(suggestion, 'model_dump'):
            dump = suggestion.model_dump()
            print(f"🔍 DEBUG: model_dump() has model_image: {bool(dump.get('model_image'))}")
        
        return suggestion
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/check-duplicate")
async def check_duplicate(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    """
    Check if an uploaded image already exists in history
    
    Args:
        image: Uploaded image file
        db: Database session dependency injection
        
    Returns:
        Dict with duplicate status and matching entry if found
    """
    try:
        # Validate and encode image
        validate_image(image, max_size_mb=20)
        image_base64 = encode_image(image.file)
        
        # Query user's history entries with images (if authenticated)
        query = db.query(OutfitHistory).filter(OutfitHistory.image_data.isnot(None))
        if current_user:
            query = query.filter(OutfitHistory.user_id == current_user.id)
        else:
            # For anonymous users, don't check duplicates (return no duplicates)
            return {"is_duplicate": False}
        history = query.order_by(OutfitHistory.created_at.desc()).all()
        
        # Check for duplicate
        for entry in history:
            if images_are_similar(image_base64, entry.image_data):
                return {
                    "is_duplicate": True,
                    "existing_suggestion": {
                        "id": entry.id,
                        "created_at": entry.created_at.isoformat(),
                        "text_input": entry.text_input,
                        "model_image": entry.model_image,  # Include model image if available
                        "shirt": entry.shirt,
                        "trouser": entry.trouser,
                        "blazer": entry.blazer,
                        "shoes": entry.shoes,
                        "belt": entry.belt,
                        "reasoning": entry.reasoning
                    }
                }
        
        return {"is_duplicate": False}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error checking duplicate: {str(e)}"
        )


@router.get("/outfit-history", response_model=List[dict])
async def get_outfit_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
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
        # CRITICAL: Must be authenticated to see history
        if not current_user:
            # For anonymous users, return empty history
            return []
        
        # Strict filtering: Only return entries that belong to the authenticated user
        user_id = current_user.id
        history = (
            db.query(OutfitHistory)
            .filter(OutfitHistory.user_id == user_id)  # Explicit filter by authenticated user's ID
            .order_by(OutfitHistory.created_at.desc())
            .limit(limit)
            .all()
        )
        
        # Double-check: Verify all entries belong to this user (safety check)
        for entry in history:
            if entry.user_id != user_id:
                raise HTTPException(
                    status_code=500,
                    detail=f"Data integrity error: Entry {entry.id} does not belong to user {user_id}"
                )
        
        result = [
            {
                "id": entry.id,
                "created_at": entry.created_at.isoformat(),
                "text_input": entry.text_input,
                "image_data": entry.image_data,  # Include the base64 uploaded image
                "model_image": getattr(entry, 'model_image', None),  # Include the generated model image if available (handle missing column gracefully)
                "shirt": entry.shirt,
                "trouser": entry.trouser,
                "blazer": entry.blazer,
                "shoes": entry.shoes,
                "belt": entry.belt,
                "reasoning": entry.reasoning
            }
            for entry in history
        ]
        
        # Debug: Log entries with model images
        entries_with_model = [r for r in result if r.get("model_image")]
        if entries_with_model:
            print(f"📋 Returning {len(entries_with_model)} history entries with model images")
            for entry in entries_with_model:
                print(f"  Entry {entry['id']}: model_image length = {len(entry['model_image']) if entry['model_image'] else 0}")
        else:
            print("📋 No history entries have model images")
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching history: {str(e)}"
        )

