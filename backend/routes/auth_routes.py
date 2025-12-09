"""Authentication API routes"""
from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import json

from models.database import get_db
from models.user import User
from utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from config import Config
from dependencies import get_current_user, get_current_active_user

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# Pydantic models for request/response
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    is_active: bool
    email_verified: bool | None = None
    created_at: str

    model_config = {"from_attributes": False}  # Disable automatic ORM conversion


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/register", response_model=Token)
async def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user and automatically log them in.
    
    Args:
        user_data: User registration data (email, password, full_name)
        db: Database session
        
    Returns:
        Access token and user information (auto-login)
        
    Raises:
        HTTPException: If email already exists
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user (automatically verified and active)
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        is_active=True,
        email_verified=True,  # Auto-verify on registration
        activation_token=None,
        activation_token_expires=None
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto-login: Create access token
    access_token_expires = timedelta(minutes=Config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.id}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        is_active=new_user.is_active,
        email_verified=new_user.email_verified,
        created_at=new_user.created_at.isoformat() if new_user.created_at else ""
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response.model_dump()
    }


@router.get("/activate/{token}")
async def activate_account(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Activate user account using activation token from email.
    
    Args:
        token: Activation token from email link
        db: Database session
        
    Returns:
        Success or error message
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    # Find user by activation token
    user = db.query(User).filter(User.activation_token == token).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid activation token"
        )
    
    # Check if token is expired
    if user.activation_token_expires and user.activation_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activation token has expired. Please register again or request a new activation email."
        )
    
    # Check if already activated
    if user.email_verified:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Account is already activated. You can now log in."
            }
        )
    
    # Activate the account
    user.email_verified = True
    user.activation_token = None  # Clear the token
    user.activation_token_expires = None
    
    db.commit()
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": "Account activated successfully! You can now log in."
        }
    )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login and get access token.
    
    Args:
        form_data: OAuth2 form data (username=email, password)
        db: Database session
        
    Returns:
        Access token and user information
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # OAuth2PasswordRequestForm uses 'username' field for email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token (user.id will be converted to string in create_access_token)
    access_token_expires = timedelta(minutes=Config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        email_verified=user.email_verified,
        created_at=user.created_at.isoformat() if user.created_at else ""
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response.model_dump()
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current authenticated user information.
    
    Args:
        current_user: Current authenticated user from dependency
        
    Returns:
        Current user information
    """
    # Convert to response model manually to ensure proper serialization
    user_response = UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        created_at=current_user.created_at.isoformat() if current_user.created_at else ""
    )
    # Return as dict to ensure proper serialization
    return user_response.model_dump()


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change user password.
    
    Args:
        password_data: Current and new password
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If current password is incorrect or new password is invalid
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Validate new password (minimum length)
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )
    
    # Check if new password is different from current password
    if verify_password(password_data.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Update password
    try:
        current_user.hashed_password = get_password_hash(password_data.new_password)
        db.commit()
        db.refresh(current_user)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Password changed successfully"
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )

