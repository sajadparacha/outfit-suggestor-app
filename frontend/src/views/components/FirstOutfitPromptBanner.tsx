import React from 'react';
import { getAuthPromptCopy } from '../../utils/authPromptCopy';

interface FirstOutfitPromptBannerProps {
  onCreateAccount: () => void;
  onSignIn: () => void;
  onDismiss: () => void;
}

const FirstOutfitPromptBanner: React.FC<FirstOutfitPromptBannerProps> = ({
  onCreateAccount,
  onSignIn,
  onDismiss,
}) => {
  const { headline, subheadline } = getAuthPromptCopy('first-outfit');

  return (
    <div
      className="mt-6 rounded-2xl border border-brand-blue/30 bg-brand-gradient-soft p-5 shadow-lg backdrop-blur"
      role="region"
      aria-label="Save your outfit prompt"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 text-left">
          <h3 className="text-lg font-semibold text-white">{headline}</h3>
          {subheadline && (
            <p className="mt-1 text-sm text-slate-200">{subheadline}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCreateAccount}
              className="btn-brand min-h-[40px] rounded-full px-4 py-2 text-sm font-semibold"
            >
              Create account
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="min-h-[40px] rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/20"
            >
              Sign in
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss save outfit prompt"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default FirstOutfitPromptBanner;
