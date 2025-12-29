"""Application configuration and dependency injection"""
import os
from dotenv import load_dotenv
from services.ai_service import AIService
from services.auth_service import AuthService
from services.wardrobe_ai_service import WardrobeAIService
from controllers.outfit_controller import OutfitController

# Load environment variables
load_dotenv()


class Config:
    """Application configuration"""
    # API & server settings
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
    NANO_BANANA_API_KEY = os.getenv("NANO_BANANA_API_KEY")
    HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")  # Optional: for Inference API
    PORT = int(os.getenv("PORT", 8001))
    
    # Wardrobe AI model selection: "openai" or "huggingface"
    WARDROBE_AI_MODEL = os.getenv("WARDROBE_AI_MODEL", "openai")  # Default to OpenAI
    
    # Hugging Face model selection: "blip" or "vit-gpt2"
    HUGGINGFACE_MODEL_TYPE = os.getenv("HUGGINGFACE_MODEL_TYPE", "blip")  # Default to BLIP
    
    # Image generation model settings
    DEFAULT_IMAGE_MODEL = os.getenv("DEFAULT_IMAGE_MODEL", "dalle3")  # "dalle3", "stable-diffusion", "nano-banana"
    
    # ChatGPT model version for outfit suggestions
    CHATGPT_MODEL = os.getenv("CHATGPT_MODEL", "gpt-4o")  # "gpt-4o" or "gpt-5.2" (when available)

    # Database settings
    # Railway provides DATABASE_URL, fallback to local for development
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    # If DATABASE_URL is not set, use local default
    if not DATABASE_URL:
        DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/outfit_suggestor"
        print("⚠️  WARNING: DATABASE_URL not set, using local database")
    else:
        print(f"✅ Using database: {DATABASE_URL[:30]}...")  # Log first 30 chars for debugging

    # CORS settings
    ALLOWED_ORIGINS = [
        "http://localhost:3000",  # React dev server
        "https://sajadparacha.github.io",  # GitHub Pages URL
        "https://web-production-dfcf8.up.railway.app",  # Railway backend (for docs)
        "*"  # Allow all origins for now (can restrict later)
    ]
    
    # Image similarity threshold for duplicate detection
    # Lower values = stricter matching (0 = identical, 5 = very similar, 10 = similar)
    IMAGE_SIMILARITY_THRESHOLD = int(os.getenv("IMAGE_SIMILARITY_THRESHOLD", 5))
    
    # JWT Authentication settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
    
    # Email configuration for account activation
    EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "true").lower() == "true"
    EMAIL_SMTP_HOST = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
    EMAIL_SMTP_PORT = int(os.getenv("EMAIL_SMTP_PORT", "587"))
    EMAIL_SMTP_USER = os.getenv("EMAIL_SMTP_USER", "")  # Your email address
    EMAIL_SMTP_PASSWORD = os.getenv("EMAIL_SMTP_PASSWORD", "")  # Your email password or app password
    EMAIL_FROM_ADDRESS = os.getenv("EMAIL_FROM_ADDRESS", EMAIL_SMTP_USER)
    EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Outfit Suggestor")
    
    # Frontend URL for activation links
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Activation token expiration (in hours)
    ACTIVATION_TOKEN_EXPIRE_HOURS = int(os.getenv("ACTIVATION_TOKEN_EXPIRE_HOURS", "24"))


# Singleton instances
_ai_service_instance = None
_auth_service_instance = None
_outfit_controller_instance = None
_auth_controller_instance = None
_wardrobe_service_instance = None
_wardrobe_controller_instance = None
_wardrobe_ai_service_instance = None


def get_ai_service() -> AIService:
    """
    Get AI Service instance (dependency injection)
    
    Returns:
        AIService singleton instance
    """
    global _ai_service_instance
    
    if _ai_service_instance is None:
        api_key = Config.OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        replicate_token = Config.REPLICATE_API_TOKEN
        nano_banana_key = Config.NANO_BANANA_API_KEY
        _ai_service_instance = AIService(
            api_key=api_key, 
            replicate_token=replicate_token,
            nano_banana_key=nano_banana_key,
            chatgpt_model=Config.CHATGPT_MODEL
        )
    
    return _ai_service_instance




def get_auth_service() -> AuthService:
    """
    Get Auth Service instance (dependency injection)
    
    Returns:
        AuthService singleton instance
    """
    global _auth_service_instance
    
    if _auth_service_instance is None:
        _auth_service_instance = AuthService()
    
    return _auth_service_instance


def get_outfit_controller() -> OutfitController:
    """
    Get Outfit Controller instance (dependency injection)
    
    Returns:
        OutfitController singleton instance
    """
    global _outfit_controller_instance
    
    if _outfit_controller_instance is None:
        from services.outfit_service import OutfitService  # Lazy import to avoid circular dependency

        ai_service = get_ai_service()
        outfit_service = OutfitService()
        _outfit_controller_instance = OutfitController(ai_service, outfit_service)
    
    return _outfit_controller_instance


def get_auth_controller():
    """
    Get Auth Controller instance (dependency injection)
    
    Returns:
        AuthController singleton instance
    """
    # Lazy import to avoid circular dependency (AuthController imports Config)
    from controllers.auth_controller import AuthController  # type: ignore

    global _auth_controller_instance
    
    if _auth_controller_instance is None:
        auth_service = get_auth_service()
        _auth_controller_instance = AuthController(auth_service)
    
    return _auth_controller_instance


def get_wardrobe_service():
    """
    Get Wardrobe Service instance (dependency injection)
    
    Returns:
        WardrobeService singleton instance
    """
    from services.wardrobe_service import WardrobeService  # Lazy import to avoid circular dependency
    
    global _wardrobe_service_instance
    
    if _wardrobe_service_instance is None:
        _wardrobe_service_instance = WardrobeService()
    
    return _wardrobe_service_instance


def get_wardrobe_controller():
    """
    Get Wardrobe Controller instance (dependency injection)
    
    Returns:
        WardrobeController singleton instance
    """
    from controllers.wardrobe_controller import WardrobeController  # Lazy import to avoid circular dependency
    
    global _wardrobe_controller_instance
    
    if _wardrobe_controller_instance is None:
        wardrobe_service = get_wardrobe_service()
        wardrobe_ai_service = get_wardrobe_ai_service()
        _wardrobe_controller_instance = WardrobeController(wardrobe_service, wardrobe_ai_service)
    
    return _wardrobe_controller_instance


def get_wardrobe_ai_service():
    """
    Get Wardrobe AI Service instance (dependency injection)
    Supports both OpenAI and Hugging Face models
    
    Returns:
        WardrobeAIService or WardrobeAIServiceHF singleton instance
    """
    global _wardrobe_ai_service_instance
    
    if _wardrobe_ai_service_instance is None:
        model_type = Config.WARDROBE_AI_MODEL.lower()
        
        if model_type == "huggingface" or model_type == "hf":
            # Use Hugging Face (FREE)
            from services.wardrobe_ai_service_hf import WardrobeAIServiceHF
            hf_token = Config.HUGGINGFACE_API_TOKEN  # Optional - can be None for local models
            hf_model_type = Config.HUGGINGFACE_MODEL_TYPE  # "blip" or "vit-gpt2"
            _wardrobe_ai_service_instance = WardrobeAIServiceHF(hf_api_token=hf_token, model_type=hf_model_type)
            print(f"✅ Using Hugging Face {hf_model_type.upper()} (FREE) for wardrobe analysis")
        else:
            # Use OpenAI (default)
            api_key = Config.OPENAI_API_KEY
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")
            _wardrobe_ai_service_instance = WardrobeAIService(api_key=api_key)
            print("✅ Using OpenAI GPT-4o for wardrobe analysis")
    
    return _wardrobe_ai_service_instance

