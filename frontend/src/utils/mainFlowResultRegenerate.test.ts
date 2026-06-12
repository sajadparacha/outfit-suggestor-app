import {
  canGenerateAnotherFromResult,
  shouldShowCompactUploadActions,
} from './mainFlowResultRegenerate';

describe('mainFlowResultRegenerate', () => {
  describe('canGenerateAnotherFromResult', () => {
    it('returns false without a suggestion', () => {
      expect(canGenerateAnotherFromResult('history', true, true, false)).toBe(false);
    });

    it('returns true with uploaded image', () => {
      expect(canGenerateAnotherFromResult(null, true, false, true)).toBe(true);
    });

    it('returns true for random wardrobe result without upload', () => {
      expect(canGenerateAnotherFromResult('wardrobe', false, true, true)).toBe(true);
    });

    it('returns true for history result with preview image', () => {
      expect(canGenerateAnotherFromResult('history', false, true, true)).toBe(true);
    });

    it('returns false for history without preview', () => {
      expect(canGenerateAnotherFromResult('history', false, false, true)).toBe(false);
    });
  });

  describe('shouldShowCompactUploadActions', () => {
    it('is true when viewing a result', () => {
      expect(shouldShowCompactUploadActions(true)).toBe(true);
    });

    it('is false in creation mode', () => {
      expect(shouldShowCompactUploadActions(false)).toBe(false);
    });
  });
});
