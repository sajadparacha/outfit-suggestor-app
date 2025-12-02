"""
Main FastAPI application entry point
Refactored with proper service architecture for multi-platform client support
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import Config
from routes.outfit_routes import router as outfit_router
from models.database import Base, engine


# Initialize FastAPI app
app = FastAPI(
    title="AI Outfit Suggestor API",
    version="2.0.0",
    description="RESTful API for AI-powered outfit suggestions. Supports multiple client platforms (Web, Android, iOS)"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables (simple auto-migration for now)
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(outfit_router)


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
