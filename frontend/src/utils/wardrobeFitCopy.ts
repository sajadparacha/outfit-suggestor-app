/**
 * Shared copy for wardrobe fit evaluate (“How this fits”).
 */

import type { WardrobeFitVerdict } from '../models/WardrobeModels';

export const WARDROBE_FIT_COPY = {
  action: 'How this fits',
  loading: 'Checking how this works with your wardrobe…',
  sectionPairs: 'Works with what you own',
  sectionGap: 'Missing for your goal',
  emptyPairs: 'Add items to see what this pairs with.',
  error: 'Couldn’t evaluate this piece. Try again.',
  retry: 'Try again',
  close: 'Close',
  getOutfit: 'Get outfit with this item',
  changeGoal: 'Change goal',
  goalDefaultsHint: 'Goal: smart-casual · work + everyday · classic',
} as const;

export const WARDROBE_FIT_VERDICT_LABELS: Record<WardrobeFitVerdict, string> = {
  strong_fit: 'Strong fit',
  weak_fit: 'Weak fit',
  redundant: 'Already covered',
};

export function wardrobeFitVerdictLabel(verdict: WardrobeFitVerdict | string): string {
  if (verdict in WARDROBE_FIT_VERDICT_LABELS) {
    return WARDROBE_FIT_VERDICT_LABELS[verdict as WardrobeFitVerdict];
  }
  return verdict;
}

export const DEFAULT_FIT_GOAL = {
  dress_code: 'smart-casual',
  lifestyle_mix: ['work', 'everyday'] as string[],
  primary_lifestyle: 'work',
  style_primary: 'classic',
  text_input: '',
};
