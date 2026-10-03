/**
 * Shared copy for wardrobe fit evaluate (“How this fits”).
 */

import type { WardrobeFitVerdict } from '../models/WardrobeModels';
import { INSIGHTS_LIFESTYLE_STORAGE_KEY, loadInsightsLifestyle } from './insightsLifestyle';

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
  checkBeforeBuyAction: 'Check before you buy',
  checkBeforeBuyLoading: 'Checking how this would fit your wardrobe…',
  addToWardrobe: 'Add to wardrobe',
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

export type FitGoal = typeof DEFAULT_FIT_GOAL;

export const WARDROBE_FIT_LAST_GOAL_KEY = 'wardrobe_fit_last_goal';

export function wardrobeFitPairCountLabel(count: number): string {
  return `Pairs with ${count}`;
}

export function wardrobeFitGoalHint(goal: FitGoal): string {
  return `Goal: ${goal.dress_code} · ${goal.lifestyle_mix.join(' + ')} · ${goal.style_primary}`;
}

function cloneDefaultGoal(): FitGoal {
  return { ...DEFAULT_FIT_GOAL, lifestyle_mix: [...DEFAULT_FIT_GOAL.lifestyle_mix] };
}

function goalFromInsights(): FitGoal | null {
  try {
    if (!localStorage.getItem(INSIGHTS_LIFESTYLE_STORAGE_KEY)) return null;
  } catch {
    return null;
  }
  const prefs = loadInsightsLifestyle();
  return {
    dress_code: prefs.dressCodes[0] ?? DEFAULT_FIT_GOAL.dress_code,
    lifestyle_mix: [...prefs.lifestyleMix],
    primary_lifestyle: prefs.primaryLifestyle,
    style_primary: prefs.stylePrimaries[0] ?? DEFAULT_FIT_GOAL.style_primary,
    text_input: '',
  };
}

function loadLastFitGoal(): FitGoal | null {
  try {
    const raw = localStorage.getItem(WARDROBE_FIT_LAST_GOAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FitGoal>;
    if (
      typeof parsed.dress_code !== 'string' ||
      typeof parsed.primary_lifestyle !== 'string' ||
      typeof parsed.style_primary !== 'string' ||
      !Array.isArray(parsed.lifestyle_mix)
    ) {
      return null;
    }
    const mix = parsed.lifestyle_mix.filter((v): v is string => typeof v === 'string');
    return {
      dress_code: parsed.dress_code,
      lifestyle_mix: mix.length ? mix : [parsed.primary_lifestyle],
      primary_lifestyle: parsed.primary_lifestyle,
      style_primary: parsed.style_primary,
      text_input: typeof parsed.text_input === 'string' ? parsed.text_input : '',
    };
  } catch {
    return null;
  }
}

/** Priority: last-used fit goal > saved Insights prefs > defaults. */
export function loadInitialFitGoal(): FitGoal {
  return loadLastFitGoal() ?? goalFromInsights() ?? cloneDefaultGoal();
}

export function saveLastFitGoal(goal: FitGoal): void {
  try {
    localStorage.setItem(WARDROBE_FIT_LAST_GOAL_KEY, JSON.stringify(goal));
  } catch {
    // storage unavailable — goal just won't be remembered
  }
}
