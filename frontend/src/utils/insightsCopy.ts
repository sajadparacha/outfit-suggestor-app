/** User-facing Insights copy — keep in sync with `.cursor/specs/insights-ux-copy.md` */

export const INSIGHTS_COPY = {
  QUICK_WARDROBE_CHECK: 'Quick Wardrobe Check',
  AI_STYLIST_REVIEW: 'AI Stylist Review',
  WHATS_MISSING_TITLE: "What's Missing From My Wardrobe?",
  WHAT_TO_BUY_NEXT: 'What to Buy Next',

  COLORS_TO_ADD: 'Colors to add',
  STYLES_TO_TRY: 'Styles to try',
  CATEGORIES_CHECKED: 'Categories checked',
  BEST_CATEGORY_TO_SHOP_NEXT: 'Best category to shop next',
  EMPTY_STATE: "Run a check to see what's missing in each part of your wardrobe.",

  MODE_PICKER_TITLE: 'How would you like to check your wardrobe?',
  MODE_PICKER_SUBTITLE: 'Pick the level of detail you want from your stylist.',
  QUICK_MODE_SUBTITLE: 'Fast snapshot with practical buy-next guidance.',
  AI_MODE_SUBTITLE: 'Deeper styling advice tailored to your occasion and wardrobe.',

  REVIEW_TYPE_PREFIX: 'Review type:',
  LOADING_QUICK: 'Running your Quick Wardrobe Check...',
  LOADING_AI: 'Preparing your AI Stylist Review...',
  TOAST_AI_READY: 'Your AI Stylist Review is ready. ✅',
} as const;

export function getReviewTypeLabel(
  analysisMode?: string | null,
  analysisDepth?: string | null
): string {
  if (analysisDepth) {
    const normalized = analysisDepth.trim().toLowerCase();
    if (normalized.includes('premium')) {
      return INSIGHTS_COPY.AI_STYLIST_REVIEW;
    }
    if (normalized.includes('basic') || normalized.includes('free')) {
      return INSIGHTS_COPY.QUICK_WARDROBE_CHECK;
    }
  }

  return (analysisMode || 'free') === 'premium'
    ? INSIGHTS_COPY.AI_STYLIST_REVIEW
    : INSIGHTS_COPY.QUICK_WARDROBE_CHECK;
}
