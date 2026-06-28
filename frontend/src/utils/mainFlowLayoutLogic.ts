/**
 * Creation vs compact result layout for Suggest main flow.
 * Keep in sync with MainFlowLayoutLogic.swift
 */

/** Max content width for main flow (matches web `max-w-[1100px]`). */
export const MAIN_FLOW_MAX_CONTENT_WIDTH = 1100;

/** Gap between side-by-side columns (matches web `gap-6` / 24px). */
export const MAIN_FLOW_SIDE_BY_SIDE_GAP_PX = 24;

/** True when sticky bottom result actions should appear (compact result, not guest-gated). */
export function showsStickyResultActions(
  showsCompactResultLayout: boolean,
  showsGuestLimitGate: boolean
): boolean {
  return showsCompactResultLayout && !showsGuestLimitGate;
}

/** True when wardrobe "Style this item" loaded an item but user has not generated a new outfit yet. */
export function isWardrobeStylePending(
  sourceWardrobeItemId: number | null | undefined,
  hasSuggestion: boolean,
  highlightGenerateButton: boolean
): boolean {
  if (highlightGenerateButton) return true;
  if (sourceWardrobeItemId != null && !hasSuggestion) return true;
  return false;
}

/** When true, show compact summary + result column; when false, show full creation input with Generate Outfit. */
export function showsCompactResultLayout(
  hasSuggestion: boolean,
  sourceWardrobeItemId: number | null | undefined,
  highlightGenerateButton: boolean
): boolean {
  return (
    hasSuggestion &&
    !isWardrobeStylePending(sourceWardrobeItemId, hasSuggestion, highlightGenerateButton)
  );
}
