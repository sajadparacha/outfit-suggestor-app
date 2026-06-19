/**
 * Application constants
 * Centralized configuration and constant values
 */

export const FILTER_OPTIONS = {
  occasions: [
    { value: 'everyday', label: 'Everyday' },
    { value: 'work', label: 'Work' },
    { value: 'date-night', label: 'Date Night' },
    { value: 'dinner-night-out', label: 'Dinner / Night Out' },
    { value: 'party', label: 'Party' },
    { value: 'wedding-guest', label: 'Wedding Guest' },
    { value: 'formal-event', label: 'Formal Event' },
    { value: 'travel', label: 'Travel' },
    { value: 'workout', label: 'Workout' },
    { value: 'errands', label: 'Errands' },
    { value: 'lounge', label: 'Lounge' },
    { value: 'outdoor', label: 'Outdoor' },
  ],
  seasons: [
    { value: 'spring', label: 'Spring' },
    { value: 'summer', label: 'Summer' },
    { value: 'fall', label: 'Fall' },
    { value: 'winter', label: 'Winter' },
    { value: 'transitional', label: 'Transitional' },
    { value: 'all-season', label: 'All Season' },
  ],
  styles: [
    { value: 'classic', label: 'Classic' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'smart-casual', label: 'Smart Casual' },
    { value: 'streetwear', label: 'Streetwear' },
    { value: 'sporty', label: 'Sporty' },
    { value: 'preppy', label: 'Preppy' },
    { value: 'boho', label: 'Boho' },
    { value: 'edgy', label: 'Edgy' },
    { value: 'romantic', label: 'Romantic' },
    { value: 'trendy', label: 'Trendy' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'elegant', label: 'Elegant' },
  ],
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
  undoDeleteDurationMs: 5000, // wardrobe delete undo window
  loadingMessages: [
    'Analyzing your style...',
    'Creating perfect combinations...',
    'Finding the best match...',
    'Almost there...'
  ]
};

