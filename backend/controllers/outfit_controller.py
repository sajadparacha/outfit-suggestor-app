"""Outfit Controller - Handles outfit-related request orchestration"""
from typing import Optional, List, Dict, Tuple
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
import json
import base64

from models.outfit import OutfitSuggestion
from models.outfit_history import OutfitHistory
from models.user import User
from services.ai_service import AIService
from services.outfit_service import OutfitService
from services.wardrobe_matcher import WardrobeMatcher
from utils.image_processor import encode_image, validate_image


class OutfitController:
    """Controller for outfit suggestion operations"""
    
    def __init__(self, ai_service: AIService, outfit_service: OutfitService):
        """
        Initialize Outfit Controller
        
        Args:
            ai_service: AI service for outfit suggestions
            outfit_service: Outfit service for business logic
        """
        self.ai_service = ai_service
        self.outfit_service = outfit_service
        self.wardrobe_matcher = WardrobeMatcher()
    
    async def suggest_outfit(
        self,
        image: UploadFile,
        text_input: str,
        location: Optional[str],
        generate_model_image: str,
        image_model: Optional[str] = None,
        use_wardrobe_only: bool = False,
        db: Session = None,
        current_user: Optional[User] = None
    ) -> OutfitSuggestion:
        """
        Handle outfit suggestion request
        
        Args:
            image: Uploaded image file
            text_input: Additional context or preferences
            location: User's location (optional)
            generate_model_image: Whether to generate model image (as string)
            db: Database session
            current_user: Current authenticated user (optional)
            
        Returns:
            OutfitSuggestion object
            
        Raises:
            HTTPException: If validation fails or processing error occurs
        """
        try:
            # Validate image
            validate_image(image, max_size_mb=20)
            
            # Encode image to base64
            image_base64 = encode_image(image.file)
            
            # Determine wardrobe mode: use_wardrobe_only + authenticated user
            wardrobe_items_dict = None
            wardrobe_only_mode = False
            if use_wardrobe_only and current_user:
                from services.wardrobe_service import WardrobeService
                wardrobe_service = WardrobeService()
                wardrobe_items_dict = wardrobe_service.get_wardrobe_items_by_categories(
                    db=db,
                    user_id=current_user.id,
                    categories=["shirt", "trouser", "blazer", "shoes", "belt"]
                )
                # Only enable wardrobe_only if user has at least some items
                has_items = any(items for items in wardrobe_items_dict.values())
                if has_items:
                    wardrobe_only_mode = True
                else:
                    # Empty wardrobe - fall back to free generation
                    wardrobe_items_dict = None
            elif use_wardrobe_only and not current_user:
                raise HTTPException(
                    status_code=401,
                    detail="Please log in to use wardrobe-only mode"
                )
            
            suggestion, cost_info = self.ai_service.get_outfit_suggestion(
                image_base64, 
                text_input,
                wardrobe_items=wardrobe_items_dict,
                wardrobe_only=wardrobe_only_mode
            )
            
            # Parse generate_model_image from string to boolean
            should_generate_model_image = generate_model_image.lower() in ('true', '1', 'yes', 'on')
            
            # Generate model image if requested
            if should_generate_model_image:
                # Use provided model or default to DALL-E 3
                model = image_model if image_model in ["dalle3", "stable-diffusion", "nano-banana"] else "dalle3"
                model_image_base64, model_image_cost = await self._generate_model_image(
                    suggestion,
                    image_base64,
                    location,
                    model
                )
                suggestion.model_image = model_image_base64
                cost_info["model_image_cost"] = model_image_cost
                cost_info["total_cost"] = cost_info["gpt4_cost"] + model_image_cost
            
            # Match wardrobe items to outfit suggestion
            if current_user:
                # Get all wardrobe items
                from services.wardrobe_service import WardrobeService
                wardrobe_service = WardrobeService()
                all_wardrobe_items, _ = wardrobe_service.get_user_wardrobe(
                    db=db,
                    user_id=current_user.id,
                    category=None,
                    search=None,
                    limit=None,
                    offset=None
                )
                
                # Find matching items
                matching_items = self.wardrobe_matcher.match_wardrobe_to_outfit(
                    suggestion,
                    all_wardrobe_items
                )
                
                # Add matching items to suggestion (Pydantic will handle serialization)
                suggestion.matching_wardrobe_items = matching_items
            
            # Save to database using outfit service
            self.outfit_service.save_outfit_history(
                db=db,
                user_id=current_user.id if current_user else None,
                text_input=text_input,
                image_data=image_base64,
                model_image=suggestion.model_image,
                suggestion=suggestion
            )
            
            # Ensure cost_info has model_image_cost set
            if "model_image_cost" not in cost_info:
                cost_info["model_image_cost"] = 0.0
            if "total_cost" not in cost_info or cost_info["total_cost"] == cost_info.get("gpt4_cost", 0):
                cost_info["total_cost"] = cost_info.get("gpt4_cost", 0) + cost_info.get("model_image_cost", 0)
            
            # Add cost information to suggestion
            if hasattr(suggestion, 'model_dump'):
                suggestion_dict = suggestion.model_dump()
                suggestion_dict["cost"] = cost_info
                return OutfitSuggestion(**suggestion_dict)
            else:
                # For Pydantic v1 compatibility
                suggestion.cost = cost_info
                return suggestion
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )
    
    async def _generate_model_image(
        self,
        suggestion: OutfitSuggestion,
        uploaded_image_base64: str,
        location: Optional[str],
        model: str = "dalle3"
    ) -> Tuple[Optional[str], float]:
        """
        Generate model image using AI service
        
        Args:
            suggestion: Outfit suggestion
            uploaded_image_base64: Base64 encoded uploaded image
            location: User's location
            
        Returns:
            Base64 encoded model image or None if generation fails
        """
        try:
            # Parse location details if provided as JSON string
            location_details = None
            location_string = None
            
            if location:
                try:
                    if location.strip().startswith('{'):
                        location_details = json.loads(location)
                    else:
                        location_string = location
                except:
                    location_string = location
            
            result, cost = self.ai_service.generate_model_image(
                suggestion,
                uploaded_image_base64=uploaded_image_base64,
                location=location_string if location_string else None,
                location_details=location_details if location_details else None,
                model=model
            )
            return result, cost
        except HTTPException as http_err:
            # If alternative model fails, try DALL-E 3 as fallback
            if model in ["stable-diffusion", "nano-banana"]:
                print(f"⚠️ {model} failed: {http_err.detail}")
                print("🔄 Falling back to DALL-E 3...")
                try:
                    result, cost = self.ai_service.generate_model_image(
                        suggestion,
                        uploaded_image_base64=uploaded_image_base64,
                        location=location_string if location_string else None,
                        location_details=location_details if location_details else None,
                        model="dalle3"
                    )
                    return result, cost
                except Exception as fallback_err:
                    print(f"❌ DALL-E 3 fallback also failed: {str(fallback_err)}")
                    return None
            else:
                # DALL-E 3 failed, just return None
                print(f"❌ ERROR: Failed to generate model image with {model}: {str(http_err)}")
                return None
        except Exception as e:
            # Log error but don't fail the request
            print(f"❌ ERROR: Failed to generate model image: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    async def check_duplicate(
        self,
        image: UploadFile,
        db: Session,
        current_user: Optional[User]
    ) -> Dict:
        """
        Check if an uploaded image already exists in history
        
        Args:
            image: Uploaded image file
            db: Database session
            current_user: Current authenticated user (optional)
            
        Returns:
            Dict with duplicate status and matching entry if found
        """
        try:
            # Validate and encode image
            validate_image(image, max_size_mb=20)
            image_base64 = encode_image(image.file)
            
            # For anonymous users, don't check duplicates
            if not current_user:
                return {"is_duplicate": False}
            
            # Use outfit service to check for duplicates
            duplicate_result = self.outfit_service.check_duplicate_image(
                db=db,
                user_id=current_user.id,
                image_base64=image_base64
            )
            
            if duplicate_result:
                entry = duplicate_result
                return {
                    "is_duplicate": True,
                    "existing_suggestion": {
                        "id": entry.id,
                        "created_at": entry.created_at.isoformat(),
                        "text_input": entry.text_input,
                        "model_image": entry.model_image,
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
    
    async def get_outfit_history(
        self,
        limit: int,
        db: Session,
        current_user: Optional[User]
    ) -> List[Dict]:
        """
        Get outfit suggestion history
        
        Args:
            limit: Maximum number of history entries to return
            db: Database session
            current_user: Current authenticated user (optional)
            
        Returns:
            List of outfit history entries
        """
        try:
            # Must be authenticated to see history
            if not current_user:
                return []
            
            # Use outfit service to get history
            history = self.outfit_service.get_user_history(
                db=db,
                user_id=current_user.id,
                limit=limit
            )
            
            # Format response
            result = []
            for entry in history:
                result.append({
                    "id": entry.id,
                    "created_at": entry.created_at.isoformat(),
                    "text_input": entry.text_input,
                    "image_data": entry.image_data,
                    "model_image": getattr(entry, 'model_image', None),
                    "shirt": entry.shirt,
                    "trouser": entry.trouser,
                    "blazer": entry.blazer,
                    "shoes": entry.shoes,
                    "belt": entry.belt,
                    "reasoning": entry.reasoning
                })
            
            return result
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching history: {str(e)}"
            )
    
    async def delete_outfit_history(
        self,
        entry_id: int,
        db: Session,
        current_user: Optional[User]
    ) -> dict:
        """
        Delete an outfit history entry
        
        Args:
            entry_id: History entry ID to delete
            db: Database session
            current_user: Current authenticated user (required)
            
        Returns:
            Dict with success message
            
        Raises:
            HTTPException: If not authenticated or entry not found
        """
        try:
            # Must be authenticated to delete history
            if not current_user:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required to delete history"
                )
            
            # Use outfit service to delete entry
            deleted = self.outfit_service.delete_history_entry(
                db=db,
                entry_id=entry_id,
                user_id=current_user.id
            )
            
            if not deleted:
                raise HTTPException(
                    status_code=404,
                    detail="History entry not found or doesn't belong to user"
                )
            
            return {"message": "History entry deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error deleting history entry: {str(e)}"
            )
    
    async def suggest_outfit_from_wardrobe_item(
        self,
        wardrobe_item_id: int,
        text_input: str,
        location: Optional[str],
        generate_model_image: str,
        image_model: Optional[str] = None,
        use_wardrobe_only: bool = False,
        db: Session = None,
        current_user: Optional[User] = None
    ) -> OutfitSuggestion:
        """
        Handle outfit suggestion request using a wardrobe item's image
        
        Args:
            wardrobe_item_id: ID of the wardrobe item to use
            text_input: Additional context or preferences
            location: User's location (optional)
            generate_model_image: Whether to generate model image (as string)
            image_model: Image generation model (optional)
            db: Database session
            current_user: Current authenticated user (required)
            
        Returns:
            OutfitSuggestion object
            
        Raises:
            HTTPException: If validation fails or processing error occurs
        """
        try:
            # Require authentication
            if not current_user:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required to use wardrobe items"
                )
            
            # Get wardrobe item
            from services.wardrobe_service import WardrobeService
            wardrobe_service = WardrobeService()
            wardrobe_item = wardrobe_service.get_wardrobe_item(
                db=db,
                item_id=wardrobe_item_id,
                user_id=current_user.id
            )
            
            if not wardrobe_item:
                raise HTTPException(
                    status_code=404,
                    detail=f"Wardrobe item not found or doesn't belong to user"
                )
            
            # Check if item has an image
            if not wardrobe_item.image_data:
                raise HTTPException(
                    status_code=400,
                    detail="Wardrobe item doesn't have an image. Please upload an image for this item first."
                )
            
            # Use wardrobe item's image for outfit suggestion
            image_base64 = wardrobe_item.image_data
            
            wardrobe_items_dict = None
            wardrobe_only_mode = False
            if use_wardrobe_only:
                all_wardrobe_items, _ = wardrobe_service.get_user_wardrobe(
                    db=db,
                    user_id=current_user.id,
                    category=None,
                    search=None,
                    limit=None,
                    offset=None
                )
                if all_wardrobe_items:
                    wardrobe_items_dict = wardrobe_service.get_wardrobe_items_by_categories(
                        db=db,
                        user_id=current_user.id,
                        categories=["shirt", "trouser", "blazer", "shoes", "belt"]
                    )
                    wardrobe_only_mode = True
            
            suggestion, cost_info = self.ai_service.get_outfit_suggestion(
                image_base64,
                text_input,
                wardrobe_items=wardrobe_items_dict,
                wardrobe_only=wardrobe_only_mode
            )
            
            # Parse generate_model_image from string to boolean
            should_generate_model_image = generate_model_image.lower() in ('true', '1', 'yes', 'on')
            
            # Generate model image if requested
            if should_generate_model_image:
                model = image_model if image_model in ["dalle3", "stable-diffusion", "nano-banana"] else "dalle3"
                model_image_base64, model_image_cost = await self._generate_model_image(
                    suggestion,
                    image_base64,
                    location,
                    model
                )
                suggestion.model_image = model_image_base64
                cost_info["model_image_cost"] = model_image_cost
                cost_info["total_cost"] = cost_info["gpt4_cost"] + model_image_cost
            
            # Match wardrobe items to outfit suggestion
            all_wardrobe_items, _ = wardrobe_service.get_user_wardrobe(
                db=db,
                user_id=current_user.id,
                category=None,
                search=None,
                limit=None,
                offset=None
            )
            
            matching_items = self.wardrobe_matcher.match_wardrobe_to_outfit(
                suggestion,
                all_wardrobe_items
            )
            suggestion.matching_wardrobe_items = matching_items
            
            # Save to database using outfit service
            self.outfit_service.save_outfit_history(
                db=db,
                user_id=current_user.id,
                text_input=text_input,
                image_data=image_base64,
                model_image=suggestion.model_image,
                suggestion=suggestion
            )
            
            # Ensure cost_info has model_image_cost set
            if "model_image_cost" not in cost_info:
                cost_info["model_image_cost"] = 0.0
            if "total_cost" not in cost_info or cost_info["total_cost"] == cost_info.get("gpt4_cost", 0):
                cost_info["total_cost"] = cost_info.get("gpt4_cost", 0) + cost_info.get("model_image_cost", 0)
            
            # Add cost information to suggestion
            if hasattr(suggestion, 'model_dump'):
                suggestion_dict = suggestion.model_dump()
                suggestion_dict["cost"] = cost_info
                return OutfitSuggestion(**suggestion_dict)
            else:
                # For Pydantic v1 compatibility
                suggestion.cost = cost_info
                return suggestion
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )





