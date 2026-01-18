"""
Main FastAPI application entry point
Refactored with proper service architecture for multi-platform client support
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

try:  # Support running both as a package (backend.*) and from backend/ directly
    from config import Config
except ImportError:  # When imported as backend.main
    from backend.config import Config
from routes.outfit_routes import router as outfit_router
from routes.auth_routes import router as auth_router
from routes.wardrobe_routes import router as wardrobe_router
from routes.access_log_routes import router as access_log_router
from models.database import Base, engine
# Import models to ensure they're registered with SQLAlchemy
from models.user import User  # noqa: F401
from models.outfit_history import OutfitHistory  # noqa: F401
from models.wardrobe import WardrobeItem  # noqa: F401
from models.access_log import AccessLog  # noqa: F401

# Startup logging
print("=" * 50)
print("🚀 Starting AI Outfit Suggestor API")
print("=" * 50)
print(f"📊 Environment Variables Check:")
print(f"   PORT: {os.getenv('PORT', 'Not set (using 8001)')}")
print(f"   OPENAI_API_KEY: {'✅ Set' if os.getenv('OPENAI_API_KEY') else '❌ Not set'}")
print(f"   REPLICATE_API_TOKEN: {'✅ Set' if os.getenv('REPLICATE_API_TOKEN') else '❌ Not set (Stable Diffusion disabled)'}")
print(f"   DATABASE_URL: {'✅ Set' if os.getenv('DATABASE_URL') else '❌ Not set'}")
print(f"   IMAGE_SIMILARITY_THRESHOLD: {os.getenv('IMAGE_SIMILARITY_THRESHOLD', '5 (default)')}")
print("=" * 50)


# Initialize FastAPI app
app = FastAPI(
    title="AI Outfit Suggestor API",
    version="2.0.0",
    description="RESTful API for AI-powered outfit suggestions. Supports multiple client platforms (Web, Android, iOS)"
)

# Configure CORS
print(f"🌐 CORS Configuration:")
print(f"   Allowed Origins: {Config.ALLOWED_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add access logging middleware
try:
    from middleware.access_logging import AccessLoggingMiddleware
    app.add_middleware(AccessLoggingMiddleware)
    print("✅ Access logging middleware enabled")
except ImportError:
    print("⚠️  Access logging middleware not available")

# Create database tables (simple auto-migration for now)
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth_router)
app.include_router(outfit_router)
app.include_router(wardrobe_router)
app.include_router(access_log_router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AI Outfit Suggestor API is running!",
        "version": "2.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI Outfit Suggestor",
        "version": "2.0.0"
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=Config.PORT)
