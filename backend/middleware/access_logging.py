"""Middleware for logging access requests."""
import time
from typing import Callable, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

try:
    from models.database import get_db, SessionLocal
    from models.access_log import AccessLog
    from utils.geolocation import get_geolocation_from_ip, get_age_group_from_user
    from utils.auth import decode_access_token
except ImportError:
    from backend.models.database import get_db, SessionLocal
    from backend.models.access_log import AccessLog
    from backend.utils.geolocation import get_geolocation_from_ip, get_age_group_from_user
    from backend.utils.auth import decode_access_token


class AccessLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all API requests with geolocation and user information.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log access information."""
        start_time = time.time()
        
        # Get client IP address
        ip_address = self._get_client_ip(request)
        
        # Get user information if authenticated
        user_id = None
        age_group = None
        try:
            # Extract user_id from JWT token if present
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                if token:  # Make sure token is not empty
                    payload = decode_access_token(token)
                    if payload and payload.get("sub"):
                        try:
                            user_id = int(payload.get("sub"))
                            # Debug logging for /api/check-duplicate
                            if "/check-duplicate" in str(request.url.path):
                                print(f"🔍 DEBUG: Extracted user_id={user_id} from token for {request.url.path}")
                        except (ValueError, TypeError) as e:
                            if "/check-duplicate" in str(request.url.path):
                                print(f"⚠️  DEBUG: Failed to convert user_id: {e}")
                    elif "/check-duplicate" in str(request.url.path):
                        print(f"⚠️  DEBUG: No payload or sub in token for {request.url.path}")
                elif "/check-duplicate" in str(request.url.path):
                    print(f"⚠️  DEBUG: Empty token for {request.url.path}")
            elif "/check-duplicate" in str(request.url.path):
                print(f"⚠️  DEBUG: No Authorization header for {request.url.path}")
        except Exception as e:
            # Not authenticated or token invalid - that's fine, but log for debugging
            if "/check-duplicate" in str(request.url.path):
                print(f"❌ DEBUG: Exception extracting user_id for {request.url.path}: {str(e)}")
            pass
        
        # Get geolocation (async in background to not block request)
        geolocation = get_geolocation_from_ip(ip_address)
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Get request details
        endpoint = str(request.url.path)
        method = request.method
        user_agent = request.headers.get("User-Agent")
        referer = request.headers.get("Referer")
        
        # Determine operation type for usage tracking
        operation_type = self._determine_operation_type(endpoint, method)

        # Only persist logs for defined operation types
        if operation_type is None:
            return response

        # Log access asynchronously (don't block response)
        # Use a database session directly to avoid dependency injection issues
        try:
            db = SessionLocal()
            try:
                # Create access log entry
                access_log = AccessLog(
                    ip_address=ip_address,
                    user_agent=user_agent,
                    endpoint=endpoint,
                    method=method,
                    operation_type=operation_type,
                    country=geolocation.get('country'),
                    country_code=geolocation.get('country_code'),
                    city=geolocation.get('city'),
                    region=geolocation.get('region'),
                    latitude=geolocation.get('latitude'),
                    longitude=geolocation.get('longitude'),
                    user_id=user_id,
                    age_group=age_group,
                    status_code=response.status_code,
                    response_time_ms=response_time_ms,
                    referer=referer,
                    request_size=int(request.headers.get("Content-Length")) if request.headers.get("Content-Length") else None,
                    response_size=int(response.headers.get("Content-Length")) if response.headers.get("Content-Length") else None
                )
                
                db.add(access_log)
                db.commit()
                # Debug logging for check-duplicate to track user_id
                if "/check-duplicate" in endpoint:
                    print(f"✅ Logged access: {endpoint} - {method} - User ID: {user_id} - IP: {ip_address}")
            except Exception as e:
                db.rollback()
                # Log error but don't fail the request
                import logging
                import traceback
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to log access: {str(e)}")
                print(f"❌ Error logging access: {str(e)}")  # Debug logging
                print(traceback.format_exc())  # Print full traceback
            finally:
                db.close()
        except Exception as e:
            # If we can't get DB session, just skip logging
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not log access: {str(e)}")
            print(f"❌ Could not get DB session: {str(e)}")  # Debug logging
            print(traceback.format_exc())  # Print full traceback
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Get client IP address from request.
        Handles proxies and load balancers.
        """
        # Check for forwarded IP (common in production with proxies/load balancers)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _determine_operation_type(self, endpoint: str, method: str) -> Optional[str]:
        """
        Determine operation type based on endpoint and method.
        Used for usage tracking of AI calls, wardrobe operations, and outfit history.
        """
        # Normalize path (strip trailing slash) for reliable matching
        path = endpoint.rstrip("/")

        # AI Calls
        if path == "/api/suggest-outfit" and method == "POST":
            return "ai_outfit_suggestion"
        if path.startswith("/api/suggest-outfit-from-wardrobe-item/") and method == "POST":
            return "ai_outfit_suggestion"
        if path == "/api/wardrobe/analyze-image" and method == "POST":
            return "ai_wardrobe_analysis"
        
        # Wardrobe Operations
        if path.startswith("/api/wardrobe") and method == "POST" and path != "/api/wardrobe/analyze-image":
            if path == "/api/wardrobe/check-duplicate":
                return "wardrobe_check_duplicate"
            return "wardrobe_add"
        if path.startswith("/api/wardrobe") and method == "PUT":
            return "wardrobe_update"
        if path.startswith("/api/wardrobe") and method == "DELETE":
            return "wardrobe_delete"
        if path == "/api/wardrobe" and method == "GET":
            return "wardrobe_view"
        if path == "/api/wardrobe/summary" and method == "GET":
            return "wardrobe_summary"

        # Outfit History
        if path == "/api/outfit-history" and method == "GET":
            return "outfit_history_view"

        # Authentication (optional - can track logins)
        if path == "/api/auth/login" and method == "POST":
            return "auth_login"
        if path == "/api/auth/register" and method == "POST":
            return "auth_register"
        
        # Default: return None for other endpoints
        return None
