"""Auth Service - Business logic for authentication operations"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from sqlalchemy.orm import Session

from models.user import User
from utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token
)


class AuthService:
    """Service for authentication-related business logic"""
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """
        Get user by email
        
        Args:
            db: Database session
            email: User email
            
        Returns:
            User object or None if not found
        """
        return db.query(User).filter(User.email == email).first()
    
    def create_user(
        self,
        db: Session,
        email: str,
        password: str,
        full_name: Optional[str] = None
    ) -> User:
        """
        Create a new user
        
        Args:
            db: Database session
            email: User email
            password: User password (will be hashed)
            full_name: User full name (optional)
            
        Returns:
            Created User object
        """
        hashed_password = get_password_hash(password)
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            auth_provider="password",
            provider_user_id=None,
            is_active=True,
            email_verified=True,  # Auto-verify on registration
            activation_token=None,
            activation_token_expires=None
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    def get_user_by_provider(
        self,
        db: Session,
        provider: str,
        provider_user_id: str,
    ) -> Optional[User]:
        return (
            db.query(User)
            .filter(
                User.auth_provider == provider,
                User.provider_user_id == provider_user_id,
            )
            .first()
        )

    def create_oauth_user(
        self,
        db: Session,
        *,
        email: str,
        provider: str,
        provider_user_id: str,
        full_name: Optional[str] = None,
    ) -> User:
        new_user = User(
            email=email,
            hashed_password=None,
            full_name=full_name,
            auth_provider=provider,
            provider_user_id=provider_user_id,
            is_active=True,
            email_verified=True,
            activation_token=None,
            activation_token_expires=None,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    def link_oauth_identity(
        self,
        db: Session,
        user: User,
        *,
        provider: str,
        provider_user_id: str,
        full_name: Optional[str] = None,
    ) -> User:
        user.auth_provider = provider
        user.provider_user_id = provider_user_id
        user.email_verified = True
        if full_name and not user.full_name:
            user.full_name = full_name
        db.commit()
        db.refresh(user)
        return user

    def find_or_create_oauth_user(
        self,
        db: Session,
        *,
        provider: str,
        provider_user_id: str,
        email: Optional[str],
        full_name: Optional[str] = None,
    ) -> User:
        existing = self.get_user_by_provider(db, provider, provider_user_id)
        if existing:
            return existing

        if email:
            by_email = self.get_user_by_email(db, email)
            if by_email:
                return self.link_oauth_identity(
                    db,
                    by_email,
                    provider=provider,
                    provider_user_id=provider_user_id,
                    full_name=full_name,
                )

        if not email:
            raise ValueError(
                "Email is required to create an account. "
                "Share your email with the provider and try again."
            )

        return self.create_oauth_user(
            db,
            email=email,
            provider=provider,
            provider_user_id=provider_user_id,
            full_name=full_name,
        )
    
    def authenticate_user(
        self,
        db: Session,
        email: str,
        password: str
    ) -> Optional[User]:
        """
        Authenticate a user by email and password
        
        Args:
            db: Database session
            email: User email
            password: Plain text password
            
        Returns:
            User object if authentication succeeds, None otherwise
        """
        user = self.get_user_by_email(db, email)
        
        if not user:
            return None

        if not user.hashed_password:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        return user
    
    def create_access_token(
        self,
        user_id: int,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create an access token for a user
        
        Args:
            user_id: User ID
            expires_delta: Optional expiration time delta
            
        Returns:
            JWT access token string
        """
        return create_access_token(
            data={"sub": user_id},
            expires_delta=expires_delta
        )
    
    def update_password(
        self,
        db: Session,
        user: User,
        new_password: str
    ) -> None:
        """
        Update user password
        
        Args:
            db: Database session
            user: User object
            new_password: New password (will be hashed)
            
        Raises:
            ValueError: If password validation fails
        """
        # Validate new password (minimum length)
        if len(new_password) < 6:
            raise ValueError("New password must be at least 6 characters long")
        
        if user.hashed_password and verify_password(new_password, user.hashed_password):
            raise ValueError("New password must be different from current password")
        
        # Update password (also enables password login for former OAuth-only users)
        user.hashed_password = get_password_hash(new_password)
        if not user.auth_provider:
            user.auth_provider = "password"
        db.commit()
        db.refresh(user)
    
    def activate_user_by_token(
        self,
        db: Session,
        token: str
    ) -> Dict[str, str]:
        """
        Activate user account using activation token
        
        Args:
            db: Database session
            token: Activation token
            
        Returns:
            Dict with status and optional error message
            Status can be: "success", "already_activated", "error"
        """
        # Find user by activation token
        user = db.query(User).filter(User.activation_token == token).first()
        
        if not user:
            return {"status": "error", "error": "Invalid activation token"}
        
        # Check if token is expired
        if user.activation_token_expires and user.activation_token_expires < datetime.utcnow():
            return {
                "status": "error",
                "error": "Activation token has expired. Please register again or request a new activation email."
            }
        
        # Check if already activated
        if user.email_verified:
            return {"status": "already_activated"}
        
        # Activate the account
        user.email_verified = True
        user.activation_token = None
        user.activation_token_expires = None
        
        db.commit()
        
        return {"status": "success"}



