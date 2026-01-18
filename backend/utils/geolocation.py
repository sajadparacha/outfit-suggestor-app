"""Geolocation service for IP address lookup."""
import requests
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)


def get_geolocation_from_ip(ip_address: str) -> Dict[str, Optional[str]]:
    """
    Get geolocation information from IP address using ipapi.co (free tier).
    
    Args:
        ip_address: IP address to lookup
        
    Returns:
        Dictionary with geolocation data:
        {
            'country': str or None,
            'country_code': str or None,
            'city': str or None,
            'region': str or None,
            'latitude': float or None,
            'longitude': float or None
        }
    """
    # Skip localhost and private IPs
    if ip_address in ['127.0.0.1', 'localhost', '::1'] or ip_address.startswith('192.168.') or ip_address.startswith('10.'):
        return {
            'country': None,
            'country_code': None,
            'city': None,
            'region': None,
            'latitude': None,
            'longitude': None
        }
    
    try:
        # Using ipapi.co free tier (1000 requests/day)
        # Alternative: ip-api.com (45 requests/minute)
        response = requests.get(
            f"https://ipapi.co/{ip_address}/json/",
            timeout=3
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Handle error responses
            if 'error' in data:
                logger.warning(f"Geolocation error for IP {ip_address}: {data.get('reason', 'Unknown error')}")
                return _empty_geolocation()
            
            return {
                'country': data.get('country_name'),
                'country_code': data.get('country_code'),
                'city': data.get('city'),
                'region': data.get('region'),
                'latitude': str(data.get('latitude')) if data.get('latitude') else None,
                'longitude': str(data.get('longitude')) if data.get('longitude') else None
            }
        else:
            logger.warning(f"Geolocation API returned status {response.status_code} for IP {ip_address}")
            return _empty_geolocation()
            
    except requests.exceptions.Timeout:
        logger.warning(f"Geolocation lookup timeout for IP {ip_address}")
        return _empty_geolocation()
    except requests.exceptions.RequestException as e:
        logger.error(f"Geolocation lookup failed for IP {ip_address}: {str(e)}")
        return _empty_geolocation()
    except Exception as e:
        logger.error(f"Unexpected error in geolocation lookup for IP {ip_address}: {str(e)}")
        return _empty_geolocation()


def _empty_geolocation() -> Dict[str, Optional[str]]:
    """Return empty geolocation data structure."""
    return {
        'country': None,
        'country_code': None,
        'city': None,
        'region': None,
        'latitude': None,
        'longitude': None
    }


def get_age_group_from_user(user_id: Optional[int], db) -> Optional[str]:
    """
    Get age group from user profile if available.
    For now, returns None - can be extended when age field is added to User model.
    
    Args:
        user_id: User ID (optional)
        db: Database session
        
    Returns:
        Age group string (e.g., "18-24", "25-34") or None
    """
    # TODO: Add age field to User model and implement age group calculation
    # For now, return None - can be inferred from other data or collected separately
    return None
