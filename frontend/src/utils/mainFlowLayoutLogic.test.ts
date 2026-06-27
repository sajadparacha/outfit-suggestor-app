import {
  MAIN_FLOW_MAX_CONTENT_WIDTH,
  MAIN_FLOW_SIDE_BY_SIDE_GAP_PX,
  isWardrobeStylePending,
  showsCompactResultLayout,
  showsStickyResultActions,
} from './mainFlowLayoutLogic';

describe('mainFlowLayoutLogic', () => {
  describe('layout constants (iOS parity)', () => {
    it('matches side-by-side shell constants', () => {
      expect(MAIN_FLOW_MAX_CONTENT_WIDTH).toBe(980);
      expect(MAIN_FLOW_SIDE_BY_SIDE_GAP_PX).toBe(20);
    });
  });

  describe('showsStickyResultActions', () => {
    it('is true when compact result and not guest-gated', () => {
      expect(showsStickyResultActions(true, false)).toBe(true);
    });

    it('is false during creation', () => {
      expect(showsStickyResultActions(false, false)).toBe(false);
    });

    it('is false when guest limit gate is active', () => {
      expect(showsStickyResultActions(true, true)).toBe(false);
    });
  });

  describe('showsCompactResultLayout', () => {
    it('is false when there is no suggestion', () => {
      expect(showsCompactResultLayout(false, null, false)).toBe(false);
    });

    it('is true when a result is ready', () => {
      expect(showsCompactResultLayout(true, null, false)).toBe(true);
    });

    it('is false when wardrobe style is pending with highlight despite stale suggestion', () => {
      expect(showsCompactResultLayout(true, 42, true)).toBe(false);
    });
  });

  describe('isWardrobeStylePending', () => {
    it('is true when wardrobe item loaded without suggestion', () => {
      expect(isWardrobeStylePending(42, false, false)).toBe(true);
      expect(showsCompactResultLayout(false, 42, false)).toBe(false);
    });

    it('is true when highlightGenerateButton is set', () => {
      expect(isWardrobeStylePending(null, true, true)).toBe(true);
      expect(isWardrobeStylePending(42, true, true)).toBe(true);
    });
  });
});
