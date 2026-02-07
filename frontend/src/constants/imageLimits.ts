/**
 * Image size and compression limits
 * Align with backend MAX_IMAGE_SIZE_MB (default 10)
 */

/** Max size in MB for outfit suggestion (stricter: faster, cheaper AI) */
export const OUTFIT_MAX_SIZE_MB = 5;

/** Max size in MB for wardrobe add (slightly looser for quality) */
export const WARDROBE_MAX_SIZE_MB = 10;

/** Max file size in MB before upload (client-side validation) */
export const CLIENT_MAX_SIZE_MB = 10;

/** Outfit suggestion: max dimensions (AI works well at 1024-1280) */
export const OUTFIT_MAX_WIDTH = 1280;
export const OUTFIT_MAX_HEIGHT = 1280;
export const OUTFIT_QUALITY = 0.75;

/** Wardrobe: max dimensions (higher for storage quality) */
export const WARDROBE_MAX_WIDTH = 1920;
export const WARDROBE_MAX_HEIGHT = 1920;
export const WARDROBE_QUALITY = 0.85;
