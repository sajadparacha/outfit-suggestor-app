/**
 * Unit tests for imageLimits constants
 */
import {
  OUTFIT_MAX_SIZE_MB,
  WARDROBE_MAX_SIZE_MB,
  CLIENT_MAX_SIZE_MB,
  OUTFIT_MAX_WIDTH,
  OUTFIT_MAX_HEIGHT,
  OUTFIT_QUALITY,
  WARDROBE_MAX_WIDTH,
  WARDROBE_MAX_HEIGHT,
  WARDROBE_QUALITY,
} from './imageLimits';

describe('imageLimits', () => {
  it('OUTFIT_MAX_SIZE_MB is 5', () => {
    expect(OUTFIT_MAX_SIZE_MB).toBe(5);
  });

  it('WARDROBE_MAX_SIZE_MB is 10', () => {
    expect(WARDROBE_MAX_SIZE_MB).toBe(10);
  });

  it('CLIENT_MAX_SIZE_MB is 10', () => {
    expect(CLIENT_MAX_SIZE_MB).toBe(10);
  });

  it('OUTFIT_MAX_WIDTH is 1280', () => {
    expect(OUTFIT_MAX_WIDTH).toBe(1280);
  });

  it('OUTFIT_MAX_HEIGHT is 1280', () => {
    expect(OUTFIT_MAX_HEIGHT).toBe(1280);
  });

  it('OUTFIT_QUALITY is 0.75', () => {
    expect(OUTFIT_QUALITY).toBe(0.75);
  });

  it('WARDROBE_MAX_WIDTH is 1920', () => {
    expect(WARDROBE_MAX_WIDTH).toBe(1920);
  });

  it('WARDROBE_MAX_HEIGHT is 1920', () => {
    expect(WARDROBE_MAX_HEIGHT).toBe(1920);
  });

  it('WARDROBE_QUALITY is 0.85', () => {
    expect(WARDROBE_QUALITY).toBe(0.85);
  });

  it('outfit limits are stricter than wardrobe', () => {
    expect(OUTFIT_MAX_SIZE_MB).toBeLessThan(WARDROBE_MAX_SIZE_MB);
    expect(OUTFIT_MAX_WIDTH).toBeLessThanOrEqual(WARDROBE_MAX_WIDTH);
    expect(OUTFIT_QUALITY).toBeLessThan(WARDROBE_QUALITY);
  });
});
