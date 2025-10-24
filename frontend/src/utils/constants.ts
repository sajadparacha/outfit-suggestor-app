/**
 * Application constants
 * Centralized configuration and constant values
 */

export const FILTER_OPTIONS = {
  occasions: [
    { value: 'casual', label: 'Casual' },
    { value: 'business', label: 'Business' },
    { value: 'formal', label: 'Formal' },
    { value: 'party', label: 'Party' },
    { value: 'date', label: 'Date Night' }
  ],
  seasons: [
    { value: 'all', label: 'All Seasons' },
    { value: 'spring', label: 'Spring' },
    { value: 'summer', label: 'Summer' },
    { value: 'fall', label: 'Fall' },
    { value: 'winter', label: 'Winter' }
  ],
  styles: [
    { value: 'modern', label: 'Modern' },
    { value: 'classic', label: 'Classic' },
    { value: 'trendy', label: 'Trendy' },
    { value: 'minimalist', label: 'Minimalist' },
    { value: 'bold', label: 'Bold' }
  ]
};

export const IMAGE_CONFIG = {
  maxSizeMB: 10,
  acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
  acceptedExtensions: ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
};

export const API_CONFIG = {
  defaultBaseUrl: 'http://localhost:8001',
  timeout: 30000 // 30 seconds
};

export const UI_CONFIG = {
  toastDuration: 3000, // 3 seconds
  loadingMessages: [
    'Analyzing your style...',
    'Creating perfect combinations...',
    'Finding the best match...',
    'Almost there...'
  ]
};

