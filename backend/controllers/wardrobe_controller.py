"""Wardrobe Controller - Handles wardrobe-related request orchestration"""
from typing import Optional, List
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from models.user import User
from models.wardrobe_schemas import WardrobeItemCreate, WardrobeItemUpdate, WardrobeItemResponse, WardrobeSummaryResponse
from services.wardrobe_service import WardrobeService
from services.wardrobe_ai_service import WardrobeAIService
from utils.image_processor import encode_image, validate_image


class WardrobeController:
    """Controller for wardrobe operations"""
    
    def __init__(self, wardrobe_service: WardrobeService, wardrobe_ai_service: WardrobeAIService):
        """
        Initialize Wardrobe Controller
        
        Args:
            wardrobe_service: Wardrobe service for business logic
            wardrobe_ai_service: AI service for extracting item properties
        """
        self.wardrobe_service = wardrobe_service
        self.wardrobe_ai_service = wardrobe_ai_service
    
    async def analyze_wardrobe_image(
        self,
        image: UploadFile,
        model_type: str = "blip",
        current_user: User = None
    ) -> dict:
        """
        Analyze a wardrobe item image and extract properties using AI
        
        Args:
            image: Image file of the clothing item
            model_type: AI model to use - "blip" or "vit-gpt2" (default: "blip")
            current_user: Current authenticated user (optional for this endpoint)
            
        Returns:
            Dictionary with extracted properties
            
        Raises:
            HTTPException: If validation fails or analysis error occurs
        """
        try:
            # Validate image
            validate_image(image, max_size_mb=20)
            
            # Encode image to base64
            image_base64 = encode_image(image.file)
            
            # Extract properties using AI with specified model
            # Check if we're using Hugging Face (supports model selection) or OpenAI
            from config import Config
            if Config.WARDROBE_AI_MODEL.lower() in ['huggingface', 'hf']:
                # Using Hugging Face - create service instance with selected model
                from services.wardrobe_ai_service_hf import WardrobeAIServiceHF
                hf_token = Config.HUGGINGFACE_API_TOKEN
                hf_service = WardrobeAIServiceHF(hf_api_token=hf_token, model_type=model_type)
                properties = hf_service.extract_item_properties(image_base64)
            else:
                # OpenAI service - doesn't support model selection, use default
                properties = self.wardrobe_ai_service.extract_item_properties(image_base64)
            
            return properties
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error analyzing wardrobe item: {str(e)}"
            )
    
    async def add_wardrobe_item(
        self,
        image: Optional[UploadFile],
        item_data: WardrobeItemCreate,
        db: Session,
        current_user: User
    ) -> WardrobeItemResponse:
        """
        Add a new item to user's wardrobe
        
        Args:
            image: Optional image file of the item
            item_data: Wardrobe item data
            db: Database session
            current_user: Current authenticated user
            
        Returns:
            Created WardrobeItemResponse
            
        Raises:
            HTTPException: If validation fails
        """
        try:
            # Encode image if provided
            image_data = None
            if image:
                validate_image(image, max_size_mb=20)
                image_data = encode_image(image.file)
            
            # Add wardrobe item (simplified - only category, color, description)
            wardrobe_item = self.wardrobe_service.add_wardrobe_item(
                db=db,
                user_id=current_user.id,
                category=item_data.category,
                color=item_data.color,
                description=item_data.description,
                image_data=image_data
            )
            
            return WardrobeItemResponse.model_validate(wardrobe_item)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error adding wardrobe item: {str(e)}"
            )
    
    async def get_wardrobe(
        self,
        category: Optional[str],
        db: Session,
        current_user: User
    ) -> List[WardrobeItemResponse]:
        """
        Get user's wardrobe items
        
        Args:
            category: Optional category filter
            db: Database session
            current_user: Current authenticated user
            
        Returns:
            List of WardrobeItemResponse
        """
        try:
            items = self.wardrobe_service.get_user_wardrobe(
                db=db,
                user_id=current_user.id,
                category=category
            )
            
            return [WardrobeItemResponse.model_validate(item) for item in items]
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching wardrobe: {str(e)}"
            )
    
    async def get_wardrobe_item(
        self,
        item_id: int,
        db: Session,
        current_user: User
    ) -> WardrobeItemResponse:
        """
        Get a specific wardrobe item
        
        Args:
            item_id: Wardrobe item ID
            db: Database session
            current_user: Current authenticated user
            
        Returns:
            WardrobeItemResponse
            
        Raises:
            HTTPException: If item not found
        """
        try:
            item = self.wardrobe_service.get_wardrobe_item(
                db=db,
                item_id=item_id,
                user_id=current_user.id
            )
            
            if not item:
                raise HTTPException(
                    status_code=404,
                    detail="Wardrobe item not found"
                )
            
            return WardrobeItemResponse.model_validate(item)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching wardrobe item: {str(e)}"
            )
    
    async def update_wardrobe_item(
        self,
        item_id: int,
        item_data: WardrobeItemUpdate,
        image: Optional[UploadFile],
        db: Session,
        current_user: User
    ) -> WardrobeItemResponse:
        """
        Update a wardrobe item
        
        Args:
            item_id: Wardrobe item ID
            item_data: Updated item data
            image: Optional new image file
            db: Database session
            current_user: Current authenticated user
            
        Returns:
            Updated WardrobeItemResponse
            
        Raises:
            HTTPException: If item not found
        """
        try:
            # Encode new image if provided
            update_data = item_data.model_dump(exclude_unset=True)
            if image:
                validate_image(image, max_size_mb=20)
                update_data['image_data'] = encode_image(image.file)
            
            # Update item
            item = self.wardrobe_service.update_wardrobe_item(
                db=db,
                item_id=item_id,
                user_id=current_user.id,
                **update_data
            )
            
            if not item:
                raise HTTPException(
                    status_code=404,
                    detail="Wardrobe item not found"
                )
            
            return WardrobeItemResponse.model_validate(item)
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error updating wardrobe item: {str(e)}"
            )
    
    async def delete_wardrobe_item(
        self,
        item_id: int,
        db: Session,
        current_user: User
    ) -> dict:
        """
        Delete a wardrobe item
        
        Args:
            item_id: Wardrobe item ID
            db: Database session
            current_user: Current authenticated user
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If item not found
        """
        try:
            deleted = self.wardrobe_service.delete_wardrobe_item(
                db=db,
                item_id=item_id,
                user_id=current_user.id
            )
            
            if not deleted:
                raise HTTPException(
                    status_code=404,
                    detail="Wardrobe item not found"
                )
            
            return {"message": "Wardrobe item deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error deleting wardrobe item: {str(e)}"
            )
    
    async def get_wardrobe_summary(
        self,
        db: Session,
        current_user: User
    ) -> WardrobeSummaryResponse:
        """
        Get wardrobe summary
        
        Args:
            db: Database session
            current_user: Current authenticated user
            
        Returns:
            WardrobeSummaryResponse
        """
        try:
            summary = self.wardrobe_service.get_wardrobe_summary(
                db=db,
                user_id=current_user.id
            )
            
            return WardrobeSummaryResponse(**summary)
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching wardrobe summary: {str(e)}"
            )

