/**
 * Image utility functions
 * Helper functions for image processing and validation
 */

/**
 * Validate image file type
 * @param file - File to validate
 * @returns true if valid image file
 */
export const isValidImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
  return validTypes.includes(file.type);
};

/**
 * Validate image file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in megabytes (default: 10MB)
 * @returns true if file size is valid
 */
export const isValidImageSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Get human-readable file size
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Create object URL for image preview
 * @param file - Image file
 * @returns Object URL string
 */
export const createImagePreviewUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Revoke object URL to free memory
 * @param url - Object URL to revoke
 */
export const revokeImagePreviewUrl = (url: string): void => {
  URL.revokeObjectURL(url);
};

