import React from 'react';
import { AuthPromptContextKey, getAuthPromptCopy } from '../../utils/authPromptCopy';

interface AuthGateCardProps {
  contextKey: AuthPromptContextKey;
  onCreateAccount: () => void;
  onSignIn: () => void;
}

const AuthGateCard: React.FC<AuthGateCardProps> = ({
  contextKey,
  onCreateAccount,
  onSignIn,
}) => {
  const { headline, subheadline } = getAuthPromptCopy(contextKey);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-xl backdrop-blur">
      <h2 className="text-2xl font-bold text-white">{headline}</h2>
      {subheadline && (
        <p className="mt-3 text-slate-200">{subheadline}</p>
      )}
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCreateAccount}
          className="btn-brand min-h-[44px] w-full rounded-full px-6 py-2.5 font-semibold transition-colors sm:w-auto"
        >
          Create account
        </button>
        <button
          type="button"
          onClick={onSignIn}
          className="min-h-[44px] w-full rounded-full border border-white/15 bg-white/10 px-6 py-2.5 font-medium text-slate-200 transition hover:bg-white/20 sm:w-auto"
        >
          Sign in
        </button>
      </div>
    </div>
  );
};

export default AuthGateCard;
