"""Auth Controller - Handles authentication request orchestration"""
from datetime import timedelta
from typing import Optional, Dict
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from models.user import User
from services.auth_service import AuthService


class AuthController:
    """Controller for authentication operations"""
    
    def __init__(self, auth_service: AuthService):
        """
        Initialize Auth Controller
        
        Args:
            auth_service: Auth service for business logic
        """
        self.auth_service = auth_service
    
    async def register(
        self,
        email: str,
        password: str,
        full_name: Optional[str],
        db: Session
    ) -> Dict:
        """
        Register a new user and automatically log them in
        
        Args:
            email: User email
            password: User password
            full_name: User full name (optional)
            db: Database session
            
        Returns:
            Dict with access token and user information
            
        Raises:
            HTTPException: If email already exists
        """
        # Check if user already exists
        existing_user = self.auth_service.get_user_by_email(db, email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user using auth service
        new_user = self.auth_service.create_user(
            db=db,
            email=email,
            password=password,
            full_name=full_name
        )
        
        # Auto-login: Create access token
        from config import Config  # Local import to avoid circular dependency
        access_token_expires = timedelta(minutes=Config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.auth_service.create_access_token(
            user_id=new_user.id,
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": self._format_user_response(new_user)
        }
    
    async def login(
        self,
        form_data: OAuth2PasswordRequestForm,
        db: Session
    ) -> Dict:
        """
        Login and get access token
        
        Args:
            form_data: OAuth2 form data (username=email, password)
            db: Database session
            
        Returns:
            Dict with access token and user information
            
        Raises:
            HTTPException: If credentials are invalid
        """
        # Authenticate user using auth service
        user = self.auth_service.authenticate_user(
            db=db,
            email=form_data.username,
            password=form_data.password
        )
        
        if not user:
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
        
        # Create access token
        from config import Config  # Local import to avoid circular dependency
        access_token_expires = timedelta(minutes=Config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.auth_service.create_access_token(
            user_id=user.id,
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": self._format_user_response(user)
        }
    
    async def get_current_user_info(self, current_user: User) -> Dict:
        """
        Get current authenticated user information
        
        Args:
            current_user: Current authenticated user
            
        Returns:
            User information dict
        """
        return self._format_user_response(current_user)
    
    async def change_password(
        self,
        current_password: str,
        new_password: str,
        current_user: User,
        db: Session
    ) -> JSONResponse:
        """
        Change user password
        
        Args:
            current_password: Current password
            new_password: New password
            current_user: Current authenticated user
            db: Database session
            
        Returns:
            Success message
            
        Raises:
            HTTPException: If current password is incorrect or new password is invalid
        """
        # Verify current password
        from utils.auth import verify_password
        if not verify_password(current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Validate and update password using auth service
        try:
            self.auth_service.update_password(
                db=db,
                user=current_user,
                new_password=new_password
            )
        except ValueError as e:
            # Convert service ValueError to HTTPException
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to change password: {str(e)}"
            )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Password changed successfully"}
        )
    
    async def activate_account(
        self,
        token: str,
        db: Session
    ) -> JSONResponse:
        """
        Activate user account using activation token
        
        Args:
            token: Activation token from email link
            db: Database session
            
        Returns:
            Success or error message
            
        Raises:
            HTTPException: If token is invalid or expired
        """
        # Find and activate user using auth service
        result = self.auth_service.activate_user_by_token(db, token)
        
        if result["status"] == "already_activated":
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"message": "Account is already activated. You can now log in."}
            )
        
        if result["status"] == "success":
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"message": "Account activated successfully! You can now log in."}
            )
        
        # If we get here, there was an error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Invalid activation token")
        )
    
    def _format_user_response(self, user: User) -> Dict:
        """
        Format user object to response dict
        
        Args:
            user: User object
            
        Returns:
            Formatted user dict
        """
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "email_verified": user.email_verified,
            "created_at": user.created_at.isoformat() if user.created_at else ""
        }

