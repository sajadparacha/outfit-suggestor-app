"""Application configuration and dependency injection"""
import os
from dotenv import load_dotenv
from services.ai_service import AIService
from services.auth_service import AuthService
from controllers.outfit_controller import OutfitController

# Load environment variables
load_dotenv()


class Config:
    """Application configuration"""
    # API & server settings
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    PORT = int(os.getenv("PORT", 8001))

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
        _ai_service_instance = AIService(api_key=api_key)
    
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

