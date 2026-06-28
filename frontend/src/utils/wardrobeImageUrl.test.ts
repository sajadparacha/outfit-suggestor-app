import { wardrobeImageDataUrl } from './wardrobeImageUrl';

describe('wardrobeImageDataUrl', () => {
  it('prefixes raw base64 with a JPEG data URL', () => {
    expect(wardrobeImageDataUrl('abc123')).toBe('data:image/jpeg;base64,abc123');
  });

  it('returns null for empty input', () => {
    expect(wardrobeImageDataUrl(null)).toBeNull();
    expect(wardrobeImageDataUrl(undefined)).toBeNull();
    expect(wardrobeImageDataUrl('')).toBeNull();
  });

  it('passes through existing data URLs', () => {
    const url = 'data:image/png;base64,xyz';
    expect(wardrobeImageDataUrl(url)).toBe(url);
  });
});
