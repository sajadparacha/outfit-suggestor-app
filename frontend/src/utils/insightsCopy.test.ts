import { getReviewTypeLabel, INSIGHTS_COPY } from './insightsCopy';

describe('insightsCopy', () => {
  it('exposes primary label constants from spec', () => {
    expect(INSIGHTS_COPY.QUICK_WARDROBE_CHECK).toBe('Quick Wardrobe Check');
    expect(INSIGHTS_COPY.AI_STYLIST_REVIEW).toBe('AI Stylist Review');
    expect(INSIGHTS_COPY.WHATS_MISSING_TITLE).toBe("What's Missing From My Wardrobe?");
    expect(INSIGHTS_COPY.WHAT_TO_BUY_NEXT).toBe('What to Buy Next');
  });

  it('exposes secondary label and flow copy from spec', () => {
    expect(INSIGHTS_COPY.COLORS_TO_ADD).toBe('Colors to add');
    expect(INSIGHTS_COPY.STYLES_TO_TRY).toBe('Styles to try');
    expect(INSIGHTS_COPY.CATEGORIES_CHECKED).toBe('Categories checked');
    expect(INSIGHTS_COPY.BEST_CATEGORY_TO_SHOP_NEXT).toBe('Best category to shop next');
    expect(INSIGHTS_COPY.EMPTY_STATE).toBe(
      "Run a check to see what's missing in each part of your wardrobe."
    );
    expect(INSIGHTS_COPY.MODE_PICKER_TITLE).toBe('How would you like to check your wardrobe?');
    expect(INSIGHTS_COPY.LOADING_QUICK).toBe('Running your Quick Wardrobe Check...');
    expect(INSIGHTS_COPY.LOADING_AI).toBe('Preparing your AI Stylist Review...');
    expect(INSIGHTS_COPY.TOAST_AI_READY).toBe('Your AI Stylist Review is ready. ✅');
  });

  it('maps analysis mode and depth to review type labels', () => {
    expect(getReviewTypeLabel('free')).toBe(INSIGHTS_COPY.QUICK_WARDROBE_CHECK);
    expect(getReviewTypeLabel('premium')).toBe(INSIGHTS_COPY.AI_STYLIST_REVIEW);
    expect(getReviewTypeLabel(undefined, 'Basic')).toBe(INSIGHTS_COPY.QUICK_WARDROBE_CHECK);
    expect(getReviewTypeLabel(undefined, 'Premium')).toBe(INSIGHTS_COPY.AI_STYLIST_REVIEW);
  });
});
