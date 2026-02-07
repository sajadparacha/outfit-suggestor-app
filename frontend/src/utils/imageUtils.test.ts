/**
 * Unit tests for imageUtils
 */
import {
  isValidImageSize,
  isValidImageType,
  formatFileSize,
} from './imageUtils';

describe('imageUtils', () => {
  describe('isValidImageSize', () => {
    it('returns true for file under max size', () => {
      const file = new File(['x'.repeat(1024)], 'test.jpg', { type: 'image/jpeg' });
      expect(isValidImageSize(file, 10)).toBe(true);
    });

    it('returns false for file over max size', () => {
      const size = 11 * 1024 * 1024; // 11 MB
      const file = new File([new ArrayBuffer(size)], 'test.jpg', { type: 'image/jpeg' });
      expect(isValidImageSize(file, 10)).toBe(false);
    });

    it('returns true for file at exact limit', () => {
      const size = 10 * 1024 * 1024; // 10 MB
      const file = new File([new ArrayBuffer(size)], 'test.jpg', { type: 'image/jpeg' });
      expect(isValidImageSize(file, 10)).toBe(true);
    });

    it('uses default 10MB when maxSizeMB not provided', () => {
      const smallFile = new File(['x'], 'test.jpg', { type: 'image/jpeg' });
      expect(isValidImageSize(smallFile)).toBe(true);
    });
  });

  describe('isValidImageType', () => {
    it('returns true for jpeg', () => {
      const file = new File(['x'], 'test.jpg', { type: 'image/jpeg' });
      expect(isValidImageType(file)).toBe(true);
    });

    it('returns true for png', () => {
      const file = new File(['x'], 'test.png', { type: 'image/png' });
      expect(isValidImageType(file)).toBe(true);
    });

    it('returns true for webp', () => {
      const file = new File(['x'], 'test.webp', { type: 'image/webp' });
      expect(isValidImageType(file)).toBe(true);
    });

    it('returns false for non-image', () => {
      const file = new File(['x'], 'test.pdf', { type: 'application/pdf' });
      expect(isValidImageType(file)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('formats KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('formats MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('returns "0 Bytes" for zero', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });
  });

  describe('compressImageForOutfit and compressImageForWardrobe', () => {
    // Note: Full compression tests require canvas/toBlob which jsdom does not support.
    // These are tested implicitly via integration tests. Unit tests cover validation only.
    it('compressImageForOutfit is a function', () => {
      const { compressImageForOutfit } = require('./imageUtils');
      expect(typeof compressImageForOutfit).toBe('function');
    });
    it('compressImageForWardrobe is a function', () => {
      const { compressImageForWardrobe } = require('./imageUtils');
      expect(typeof compressImageForWardrobe).toBe('function');
    });
  });
});
