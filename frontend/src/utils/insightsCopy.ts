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

  SHOPPING_LIST_TITLE: 'Shopping list',
  SHOPPING_LIST_SUBTITLE:
    'Turn your highest-impact wardrobe gaps into focused shopping searches.',
  SHOPPING_LIST_EMPTY: 'No shopping list items for this analysis.',
  SHOPPING_LIST_COLUMN_BUY: 'Buy',
  SHOPPING_LIST_COLUMN_LOOK_FOR: 'Look for',
  SHOPPING_LIST_COLUMN_SEARCH_ONLINE: 'Search online',
  SHOPPING_LIST_SEE_ALL_OPTIONS: 'See all options',
  SHOPPING_LIST_HIDE_OPTIONS: 'Hide options',
  SHOPPING_LIST_SEARCH_ALL: 'Search all',
  SHOPPING_LIST_EXPORT_WHATSAPP: 'Export to WhatsApp',
  SHOPPING_LIST_EXPORT_PDF: 'Export as PDF',
  SHOPPING_LIST_COPY: 'Copy list',
  SHOPPING_LIST_COPIED: 'Copied to clipboard',
  SHOPPING_LIST_EXPORT_ERROR: 'Could not export shopping list.',
  SHOPPING_LIST_PRINT_TITLE: 'ClosIQ Shopping List',
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
