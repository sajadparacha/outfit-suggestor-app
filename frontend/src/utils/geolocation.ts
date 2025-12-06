/**
 * Geolocation utilities for getting user's location
 */

export interface LocationInfo {
  location: string; // Human-readable location (e.g., "New York, USA")
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Get user's location using browser geolocation API and reverse geocoding
 * @returns Promise with location information
 */
export async function getUserLocation(): Promise<LocationInfo | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use reverse geocoding to get location details
          const locationInfo = await reverseGeocode(latitude, longitude);
          resolve({
            ...locationInfo,
            latitude,
            longitude,
          });
        } catch (error) {
          console.error('Error getting location details:', error);
          // Fallback to coordinates
          resolve({
            location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
            latitude,
            longitude,
          });
        }
      },
      (error) => {
        console.warn('Error getting geolocation:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get location details
 * Uses a free geocoding service (Nominatim)
 */
async function reverseGeocode(latitude: number, longitude: number): Promise<LocationInfo> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'OutfitSuggestorApp/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    const address = data.address || {};

    // Build location string
    const parts: string[] = [];
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    if (address.state || address.region) {
      parts.push(address.state || address.region);
    }
    if (address.country) {
      parts.push(address.country);
    }

    const location = parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

    return {
      location,
      country: address.country,
      region: address.state || address.region,
      city: address.city || address.town || address.village,
      latitude,
      longitude,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Fallback
    return {
      location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      latitude,
      longitude,
    };
  }
}

/**
 * Get location as a simple string for API requests
 */
export async function getLocationString(): Promise<string | null> {
  const locationInfo = await getUserLocation();
  return locationInfo?.location || null;
}

