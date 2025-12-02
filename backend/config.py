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
    # Example Postgres URL:
    # postgresql://username:password@localhost:5432/outfit_suggestor
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/outfit_suggestor",
    )

    # CORS settings
    ALLOWED_ORIGINS = [
        "http://localhost:3000",  # React dev server
        "https://sajadparacha.github.io"  # GitHub Pages URL
    ]


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

