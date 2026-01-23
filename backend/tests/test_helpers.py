"""
Helper functions for tests that need authenticated endpoints
"""
from fastapi import Depends
from dependencies import get_current_user, get_current_active_user, get_optional_user
from main import app
from models.user import User


def setup_auth_override(user: User):
    """Setup authentication overrides for a specific user"""
    def override_get_current_user():
        return user
    
    def override_get_current_active_user():
        return user
    
    def override_get_optional_user():
        return user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user
    app.dependency_overrides[get_optional_user] = override_get_optional_user


def clear_auth_override():
    """Clear authentication overrides"""
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)
    app.dependency_overrides.pop(get_optional_user, None)
