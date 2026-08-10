import React, { useCallback, useEffect, useRef, useState } from 'react';
import { OAuthProvider } from '../../models/AuthModels';
import {
  APPLE_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  isOAuthProviderConfigured,
  isOAuthTestStub,
  loadScript,
} from '../../utils/oauthConfig';

interface OAuthButtonsProps {
  onOAuthLogin: (provider: OAuthProvider, idToken: string) => Promise<void>;
  loading: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              width?: number;
              shape?: string;
            }
          ) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: { id_token: string };
        }>;
      };
    };
  }
}

const OAuthButtons: React.FC<OAuthButtonsProps> = ({ onOAuthLogin, loading }) => {
  const googleButtonHostRef = useRef<HTMLDivElement>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(isOAuthTestStub);
  const [appleReady, setAppleReady] = useState(isOAuthTestStub);

  const handleCredential = useCallback(
    async (provider: OAuthProvider, idToken: string) => {
      setSdkError(null);
      try {
        await onOAuthLogin(provider, idToken);
      } catch {
        // Parent surfaces auth controller error
      }
    },
    [onOAuthLogin]
  );

  useEffect(() => {
    if (isOAuthTestStub || !GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    loadScript('https://accounts.google.com/gsi/client', 'google-gsi-client')
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            void handleCredential('google', response.credential);
          },
        });

        if (googleButtonHostRef.current) {
          window.google.accounts.id.renderButton(googleButtonHostRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            width: googleButtonHostRef.current.offsetWidth || 320,
            shape: 'rectangular',
          });
        }
        setGoogleReady(true);
      })
      .catch(() => {
        if (!cancelled) setSdkError('Could not load Google sign-in.');
      });

    return () => {
      cancelled = true;
    };
  }, [handleCredential]);

  useEffect(() => {
    if (isOAuthTestStub || !APPLE_CLIENT_ID) return;

    let cancelled = false;

    loadScript(
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
      'apple-auth-js'
    )
      .then(() => {
        if (cancelled || !window.AppleID?.auth) return;
        window.AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: 'name email',
          redirectURI: window.location.origin,
          usePopup: true,
        });
        setAppleReady(true);
      })
      .catch(() => {
        if (!cancelled) setSdkError('Could not load Apple sign-in.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleGoogleClick = () => {
    if (loading) return;
    if (isOAuthTestStub) {
      void handleCredential('google', 'test-google-id-token');
      return;
    }
    if (!isOAuthProviderConfigured('google')) {
      setSdkError('Google sign-in is not configured.');
      return;
    }
    const nativeBtn = googleButtonHostRef.current?.querySelector('[role="button"]') as HTMLElement | null;
    if (nativeBtn) {
      nativeBtn.click();
    } else {
      setSdkError('Google sign-in is still loading. Try again in a moment.');
    }
  };

  const handleAppleClick = async () => {
    if (loading) return;
    if (isOAuthTestStub) {
      await handleCredential('apple', 'test-apple-id-token');
      return;
    }
    if (!isOAuthProviderConfigured('apple')) {
      setSdkError('Apple sign-in is not configured.');
      return;
    }
    if (!window.AppleID?.auth) {
      setSdkError('Apple sign-in is still loading. Try again in a moment.');
      return;
    }
    try {
      const response = await window.AppleID.auth.signIn();
      await handleCredential('apple', response.authorization.id_token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple sign-in was cancelled or failed.';
      setSdkError(message);
    }
  };

  const showGoogleCustom = isOAuthTestStub || !GOOGLE_CLIENT_ID || !googleReady;

  return (
    <div className="space-y-3">
      {sdkError && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3">
          <div className="text-sm text-red-200">{sdkError}</div>
        </div>
      )}

      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-wide text-slate-500">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="space-y-2">
        {showGoogleCustom ? (
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading || (!isOAuthTestStub && !isOAuthProviderConfigured('google'))}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 ${
              loading ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            Continue with Google
          </button>
        ) : (
          <div
            ref={googleButtonHostRef}
            className={`flex w-full justify-center overflow-hidden rounded-xl [&>div]:!w-full ${
              loading ? 'pointer-events-none opacity-50' : ''
            }`}
            aria-label="Continue with Google"
          />
        )}

        <button
          type="button"
          onClick={() => void handleAppleClick()}
          disabled={
            loading ||
            (!isOAuthTestStub && !isOAuthProviderConfigured('apple')) ||
            (!isOAuthTestStub && APPLE_CLIENT_ID.length > 0 && !appleReady)
          }
          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 ${
            loading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          Continue with Apple
        </button>
      </div>
    </div>
  );
};

export default OAuthButtons;
