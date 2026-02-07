"""Image processing utilities"""
import base64
import io
from PIL import Image
from fastapi import UploadFile, HTTPException


def validate_image(image: UploadFile, max_size_mb: int | None = None) -> None:
    """
    Validate uploaded image file
    
    Args:
        image: Uploaded image file
        max_size_mb: Maximum allowed file size in MB (default: from Config.MAX_IMAGE_SIZE_MB)
        
    Raises:
        HTTPException: If validation fails
    """
    if max_size_mb is None:
        try:
            from config import Config
            max_size_mb = Config.MAX_IMAGE_SIZE_MB
        except ImportError:
            max_size_mb = 10
    # Validate content type
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check file size
    if image.size and image.size > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400, 
            detail=f"Image too large. Please upload an image smaller than {max_size_mb}MB"
        )


def encode_image(image_file) -> str:
    """
    Convert image file to base64 string for OpenAI API
    
    Args:
        image_file: Image file object
        
    Returns:
        Base64 encoded string of the image
    """
    image = Image.open(image_file)
    
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize if too large (OpenAI has size limits)
    max_size = 1024
    if image.width > max_size or image.height > max_size:
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Convert to base64
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

