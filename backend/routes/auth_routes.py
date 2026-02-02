"""Authentication API routes - Thin HTTP layer using controllers"""
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from models.database import get_db
from models.user import User
from controllers.auth_controller import AuthController
from config import get_auth_controller
from dependencies import get_current_active_user

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
    is_admin: bool = False
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
    auth_controller: AuthController = Depends(get_auth_controller),
    db: Session = Depends(get_db)
):
    """
    Register a new user and automatically log them in.
    
    Args:
        user_data: User registration data (email, password, full_name)
        auth_controller: Auth controller dependency injection
        db: Database session
        
    Returns:
        Access token and user information (auto-login)
        
    Raises:
        HTTPException: If email already exists
    """
    return await auth_controller.register(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        db=db
    )


@router.get("/activate/{token}")
async def activate_account(
    token: str,
    auth_controller: AuthController = Depends(get_auth_controller),
    db: Session = Depends(get_db)
):
    """
    Activate user account using activation token from email.
    
    Args:
        token: Activation token from email link
        auth_controller: Auth controller dependency injection
        db: Database session
        
    Returns:
        Success or error message
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    return await auth_controller.activate_account(token=token, db=db)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_controller: AuthController = Depends(get_auth_controller),
    db: Session = Depends(get_db)
):
    """
    Login and get access token.
    
    Args:
        form_data: OAuth2 form data (username=email, password)
        auth_controller: Auth controller dependency injection
        db: Database session
        
    Returns:
        Access token and user information
        
    Raises:
        HTTPException: If credentials are invalid
    """
    return await auth_controller.login(form_data=form_data, db=db)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    auth_controller: AuthController = Depends(get_auth_controller)
):
    """
    Get current authenticated user information.
    
    Args:
        current_user: Current authenticated user from dependency
        auth_controller: Auth controller dependency injection
        
    Returns:
        Current user information
    """
    return await auth_controller.get_current_user_info(current_user=current_user)


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    auth_controller: AuthController = Depends(get_auth_controller),
    db: Session = Depends(get_db)
):
    """
    Change user password.
    
    Args:
        password_data: Current and new password
        current_user: Current authenticated user
        auth_controller: Auth controller dependency injection
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If current password is incorrect or new password is invalid
    """
    return await auth_controller.change_password(
        current_password=password_data.current_password,
        new_password=password_data.new_password,
        current_user=current_user,
        db=db
    )

