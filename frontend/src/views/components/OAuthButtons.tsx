import React, { useCallback, useEffect, useRef, useState } from 'react';
import { OAuthProvider } from '../../models/AuthModels';
import {
  APPLE_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  isOAuthProviderConfigured,
  isOAuthTestStub,
  loadScript,
  waitForGoogleIdentityServices,
} from '../../utils/oauthConfig';

interface OAuthButtonsProps {
  onOAuthLogin: (provider: OAuthProvider, idToken: string) => Promise<void>;
  loading: boolean;
}

interface GoogleTokenClient {
  requestAccessToken: (override?: { prompt?: string }) => void;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            prompt?: string;
          }) => GoogleTokenClient;
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

const appleConfigHint =
  'Add REACT_APP_APPLE_CLIENT_ID to frontend/.env, then restart the app.';

const googleButtonClassName =
  'btn-brand flex min-h-[44px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold';

function googleOriginHint(): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return (
    `Add this exact origin under Authorized JavaScript origins in Google Cloud Console: ${origin}. ` +
    'Do not include a path. If you opened the app via an IP or 127.0.0.1, use that same origin (or switch to http://localhost:3000).'
  );
}

const OAuthButtons: React.FC<OAuthButtonsProps> = ({ onOAuthLogin, loading }) => {
  const googleTokenClientRef = useRef<GoogleTokenClient | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(isOAuthTestStub);
  const [appleReady, setAppleReady] = useState(isOAuthTestStub);

  const googleConfigured = isOAuthProviderConfigured('google');
  const appleConfigured = isOAuthProviderConfigured('apple');
  const missingAllSocialConfig = !isOAuthTestStub && !googleConfigured && !appleConfigured;

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

    void (async () => {
      try {
        await loadScript('https://accounts.google.com/gsi/client', 'google-gsi-client');
        if (cancelled) return;

        const ready = await waitForGoogleIdentityServices();
        if (cancelled) return;
        if (!ready || !window.google?.accounts?.oauth2?.initTokenClient) {
          setSdkError(
            `Could not initialize Google sign-in. ${googleOriginHint()} Also check that accounts.google.com is not blocked by an extension.`
          );
          return;
        }

        googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: (response) => {
            if (response.error) {
              if (response.error === 'popup_closed_by_user') return;
              if (response.error === 'popup_failed_to_open') {
                setSdkError('Allow popups for this site, then try Continue with Google again.');
                return;
              }
              setSdkError(response.error_description || response.error);
              return;
            }
            if (!response.access_token) {
              setSdkError('Google sign-in did not return a token.');
              return;
            }
            void handleCredential('google', response.access_token);
          },
        });
        setGoogleReady(true);
        setSdkError(null);
      } catch {
        if (!cancelled) {
          setSdkError(
            'Could not load Google sign-in script. Check your network or disable blockers for accounts.google.com.'
          );
        }
      }
    })();

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
    if (!googleConfigured) {
      setSdkError(`Google sign-in is not configured. ${googleOriginHint()}`);
      return;
    }
    const client = googleTokenClientRef.current;
    if (!client) {
      setSdkError('Google sign-in is still loading. Try again in a moment.');
      return;
    }
    // Must run in the click/tap handler so browsers allow Google's account picker.
    client.requestAccessToken({ prompt: 'select_account' });
  };

  const handleAppleClick = async () => {
    if (loading) return;
    if (isOAuthTestStub) {
      await handleCredential('apple', 'test-apple-id-token');
      return;
    }
    if (!appleConfigured) {
      setSdkError(`Apple sign-in is not configured. ${appleConfigHint}`);
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
      const message =
        err instanceof Error ? err.message : 'Apple sign-in was cancelled or failed.';
      setSdkError(message);
    }
  };

  const showGoogle = isOAuthTestStub || googleConfigured;
  const showApple = isOAuthTestStub || appleConfigured;
  const showOAuthSection = showGoogle || showApple || missingAllSocialConfig;

  if (!showOAuthSection) {
    return null;
  }

  return (
    <div className="space-y-3">
      {sdkError && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3">
          <div className="text-sm text-red-200">{sdkError}</div>
        </div>
      )}

      {missingAllSocialConfig && !sdkError && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
          <div className="text-sm text-amber-100">
            Social sign-in needs a client ID in <code className="text-amber-50">frontend/.env</code>.
            Set <code className="text-amber-50">REACT_APP_GOOGLE_CLIENT_ID</code>, then restart the app.
          </div>
        </div>
      )}

      {(showGoogle || showApple) && (
        <div className="relative flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-wide text-slate-500">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      )}

      <div className="space-y-2">
        {showGoogle && (
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading || (!isOAuthTestStub && !googleReady)}
            className={`${googleButtonClassName} ${
              loading || (!isOAuthTestStub && !googleReady) ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {googleReady ? 'Continue with Google' : 'Loading Google…'}
          </button>
        )}

        {showApple && (
          <button
            type="button"
            onClick={() => void handleAppleClick()}
            disabled={loading || (!isOAuthTestStub && appleConfigured && !appleReady)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 ${
              loading || (!isOAuthTestStub && appleConfigured && !appleReady)
                ? 'cursor-not-allowed opacity-50'
                : ''
            }`}
          >
            Continue with Apple
          </button>
        )}
      </div>
    </div>
  );
};

export default OAuthButtons;
