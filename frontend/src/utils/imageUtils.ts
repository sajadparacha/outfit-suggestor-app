/**
 * Image utility functions
 * Helper functions for image processing and validation
 */

import { OUTFIT_MAX_WIDTH, OUTFIT_MAX_HEIGHT, OUTFIT_QUALITY, OUTFIT_MAX_SIZE_MB, WARDROBE_MAX_WIDTH, WARDROBE_MAX_HEIGHT, WARDROBE_QUALITY, WARDROBE_MAX_SIZE_MB } from '../constants/imageLimits';

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

/**
 * Compress image file to reduce size
 * @param file - Image file to compress
 * @param maxWidth - Maximum width (default: 1920)
 * @param maxHeight - Maximum height (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @param maxSizeMB - Maximum size in MB (default: 8MB)
 * @returns Promise with compressed File
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85,
  maxSizeMB: number = 8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'));
              return;
            }
            
            // Check if compressed size is acceptable
            const sizeMB = blob.size / (1024 * 1024);
            if (sizeMB <= maxSizeMB) {
              // Create new File from blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // If still too large, compress more aggressively
              if (quality > 0.5) {
                compressImage(file, maxWidth, maxHeight, quality - 0.1, maxSizeMB)
                  .then(resolve)
                  .catch(reject);
              } else {
                // Last resort: reduce dimensions
                compressImage(file, maxWidth * 0.8, maxHeight * 0.8, 0.7, maxSizeMB)
                  .then(resolve)
                  .catch(reject);
              }
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image for outfit suggestion (stricter: smaller payload, cheaper AI)
 */
export const compressImageForOutfit = (file: File): Promise<File> => {
  return compressImage(file, OUTFIT_MAX_WIDTH, OUTFIT_MAX_HEIGHT, OUTFIT_QUALITY, OUTFIT_MAX_SIZE_MB);
};

/**
 * Compress image for wardrobe add (higher quality for storage)
 */
export const compressImageForWardrobe = (file: File): Promise<File> => {
  return compressImage(file, WARDROBE_MAX_WIDTH, WARDROBE_MAX_HEIGHT, WARDROBE_QUALITY, WARDROBE_MAX_SIZE_MB);
};