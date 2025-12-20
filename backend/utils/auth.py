"""Authentication utilities for JWT tokens and password hashing."""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
import secrets


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: The plain text password
        hashed_password: The hashed password to verify against
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        # Ensure password is bytes
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: The plain text password to hash
        
    Returns:
        The hashed password as a string
    """
    # Bcrypt has a 72-byte limit, truncate if necessary
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
    else:
        password_bytes = password
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
    
    # Generate salt and hash
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Return as string
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing the data to encode in the token (typically user ID or email)
        expires_delta: Optional timedelta for token expiration. If None, uses default from config.
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    # JWT 'sub' claim must be a string
    if 'sub' in to_encode and not isinstance(to_encode['sub'], str):
        to_encode['sub'] = str(to_encode['sub'])
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Import Config lazily to avoid import-time dependency issues
        try:  # Support running both as a package (backend.*) and from backend/ directly
            from config import Config  # type: ignore
        except ImportError:  # When imported as backend.utils.auth
            from backend.config import Config  # type: ignore

        expire = datetime.utcnow() + timedelta(minutes=Config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})

    # Import Config lazily here as well
    try:  # Support running both as a package (backend.*) and from backend/ directly
        from config import Config  # type: ignore
    except ImportError:  # When imported as backend.utils.auth
        from backend.config import Config  # type: ignore

    encoded_jwt = jwt.encode(to_encode, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT access token.
    
    Args:
        token: The JWT token string to decode
        
    Returns:
        Dictionary containing the decoded token data, or None if token is invalid
    """
    try:
        # Import Config lazily to avoid import-time dependency issues
        try:  # Support running both as a package (backend.*) and from backend/ directly
            from config import Config  # type: ignore
        except ImportError:  # When imported as backend.utils.auth
            from backend.config import Config  # type: ignore

        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_activation_token() -> str:
    """
    Generate a secure random activation token.
    
    Returns:
        A URL-safe random token string
    """
    # Generate a 32-byte random token (URL-safe base64 encoded = 43 characters)
    return secrets.token_urlsafe(32)

