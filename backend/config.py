"""Application configuration and dependency injection"""
import os
from dotenv import load_dotenv
from services.ai_service import AIService

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
        "https://outfit-suggestor-app-production.up.railway.app"  # Railway backend (for docs)
    ]
    
    # Image similarity threshold for duplicate detection
    # Lower values = stricter matching (0 = identical, 5 = very similar, 10 = similar)
    IMAGE_SIMILARITY_THRESHOLD = int(os.getenv("IMAGE_SIMILARITY_THRESHOLD", 5))


# Singleton instance of AI Service
_ai_service_instance = None


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

