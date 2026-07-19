export type AuthPromptContextKey =
  | 'first-outfit'
  | 'like'
  | 'history'
  | 'wardrobe'
  | 'week'
  | 'insights'
  | 'settings'
  | 'guest-limit';

export const GUEST_AI_LIMIT = 3;

export interface AuthPromptCopy {
  headline: string;
  subheadline?: string;
  primaryCta: 'Create account' | 'Sign in';
}

export const AUTH_PROMPT_COPY: Record<AuthPromptContextKey, AuthPromptCopy> = {
  'first-outfit': {
    headline: 'Save this outfit and build your wardrobe.',
    subheadline: 'Create a free account to keep every look you love.',
    primaryCta: 'Create account',
  },
  like: {
    headline: 'Sign in to save favorites.',
    subheadline: 'Your liked outfits stay with you across devices.',
    primaryCta: 'Sign in',
  },
  history: {
    headline: 'Create an account to keep your outfit history.',
    subheadline: 'Every suggestion you generate will be saved automatically.',
    primaryCta: 'Create account',
  },
  wardrobe: {
    headline: 'Upload your clothes once and get unlimited combinations.',
    subheadline: 'Build a digital closet and get wardrobe-aware suggestions.',
    primaryCta: 'Create account',
  },
  week: {
    headline: 'Plan your week’s outfits in one place.',
    subheadline: 'Sign in to save day plans, generate looks, and see Today’s outfit.',
    primaryCta: 'Sign in',
  },
  insights: {
    headline: 'See what your wardrobe is missing.',
    subheadline: 'Sign in to run gap analysis on your saved items.',
    primaryCta: 'Sign in',
  },
  settings: {
    headline: 'Manage your account and preferences.',
    subheadline: 'Sign in to sync wardrobe, history, and settings.',
    primaryCta: 'Sign in',
  },
  'guest-limit': {
    headline:
      "You've used your 3 free AI outfit suggestions. Create an account to keep using the app.",
    primaryCta: 'Create account',
  },
};

export const FIRST_OUTFIT_PROMPT_KEY = 'first_outfit_prompt_seen';

export function getAuthPromptCopy(context: AuthPromptContextKey): AuthPromptCopy {
  return AUTH_PROMPT_COPY[context];
}

export function prefersRegister(context: AuthPromptContextKey): boolean {
  return getAuthPromptCopy(context).primaryCta === 'Create account';
}

export function getGuestRemainingHint(remaining: number): string {
  return `${remaining} of ${GUEST_AI_LIMIT} free AI suggestions left`;
}
