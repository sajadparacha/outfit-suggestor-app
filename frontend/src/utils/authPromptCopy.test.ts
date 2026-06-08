import {
  AUTH_PROMPT_COPY,
  getAuthPromptCopy,
  prefersRegister,
} from './authPromptCopy';

describe('authPromptCopy', () => {
  it('exposes verbatim copy for all context keys', () => {
    expect(AUTH_PROMPT_COPY['first-outfit'].headline).toBe(
      'Save this outfit and build your wardrobe.'
    );
    expect(AUTH_PROMPT_COPY.like.subheadline).toBe(
      'Your liked outfits stay with you across devices.'
    );
    expect(AUTH_PROMPT_COPY.history.primaryCta).toBe('Create account');
    expect(AUTH_PROMPT_COPY.insights.primaryCta).toBe('Sign in');
  });

  it('returns copy via getAuthPromptCopy', () => {
    expect(getAuthPromptCopy('wardrobe').headline).toBe(
      'Upload your clothes once and get unlimited combinations.'
    );
  });

  it('prefersRegister matches primary CTA', () => {
    expect(prefersRegister('history')).toBe(true);
    expect(prefersRegister('settings')).toBe(false);
    expect(prefersRegister('guest-limit')).toBe(true);
  });
});
