export const FIRST_RUN_COACH_DISMISSED_KEY = 'first_run_coach_dismissed';
export const FIRST_RUN_PREFS_EXPANDED_KEY = 'first_run_prefs_expanded';

export type FirstRunCoachStep = 1 | 2 | 3;

export function getActiveCoachStep(hasImage: boolean, hasSuggestion: boolean): FirstRunCoachStep {
  if (hasSuggestion) return 3;
  if (hasImage) return 2;
  return 1;
}

export function isFirstRunCoachDismissed(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_COACH_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function dismissFirstRunCoach(): void {
  try {
    localStorage.setItem(FIRST_RUN_COACH_DISMISSED_KEY, 'true');
  } catch {
    // ignore storage errors
  }
}

export function isFirstRunPrefsExpanded(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_PREFS_EXPANDED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setFirstRunPrefsExpanded(): void {
  try {
    localStorage.setItem(FIRST_RUN_PREFS_EXPANDED_KEY, 'true');
  } catch {
    // ignore storage errors
  }
}

export function shouldCollapsePreferences(hasSuggestion: boolean): boolean {
  if (isFirstRunCoachDismissed()) return false;
  if (hasSuggestion) return false;
  if (isFirstRunPrefsExpanded()) return false;
  return true;
}
