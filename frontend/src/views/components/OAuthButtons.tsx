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

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
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
              logo_alignment?: string;
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

const appleConfigHint =
  'Add REACT_APP_APPLE_CLIENT_ID to frontend/.env, then restart the app.';

const GIS_MIN_WIDTH = 200;
const GIS_MAX_WIDTH = 400;

const googleButtonClassName =
  'btn-brand flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold';

/**
 * Google's iframe keeps a fixed inner hit target (~40px). Stretching it with
 * CSS width/height does not remap clicks — only a strip (often the corners)
 * stays clickable. Transform scale maps the whole custom button to that target.
 */
export function scaleGoogleIdentityIframeToCover(
  iframe: HTMLElement,
  container: HTMLElement
): void {
  const targetWidth = container.clientWidth || container.offsetWidth;
  const targetHeight = container.clientHeight || container.offsetHeight;
  const sourceWidth = iframe.offsetWidth;
  const sourceHeight = iframe.offsetHeight;
  if (targetWidth <= 0 || targetHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return;
  }
  iframe.style.position = 'absolute';
  iframe.style.top = '0px';
  iframe.style.left = '0px';
  iframe.style.transformOrigin = '0 0';
  iframe.style.transform = `scale(${targetWidth / sourceWidth}, ${targetHeight / sourceHeight})`;
}

function googleOriginHint(): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return (
    `Add this exact origin under Authorized JavaScript origins in Google Cloud Console: ${origin}. ` +
    'Do not include a path. If you opened the app via an IP or 127.0.0.1, use that same origin (or switch to http://localhost:3000).'
  );
}

const OAuthButtons: React.FC<OAuthButtonsProps> = ({ onOAuthLogin, loading }) => {
  const googleWrapperRef = useRef<HTMLDivElement>(null);
  const googleButtonHostRef = useRef<HTMLDivElement>(null);
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

  // Load GIS once, then render into the always-mounted host (overlay).
  useEffect(() => {
    if (isOAuthTestStub || !GOOGLE_CLIENT_ID) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    let lastRenderWidth = 0;
    let resizeObserver: ResizeObserver | undefined;

    const coverCustomButton = () => {
      const host = googleButtonHostRef.current;
      const wrapper = googleWrapperRef.current;
      const iframe = host?.querySelector('iframe');
      if (!iframe || !wrapper) return false;
      if (iframe.offsetWidth <= 0 || iframe.offsetHeight <= 0) return false;
      scaleGoogleIdentityIframeToCover(iframe, wrapper);
      return true;
    };

    const renderGoogleButton = () => {
      const host = googleButtonHostRef.current;
      const wrapper = googleWrapperRef.current;
      if (!host || !wrapper || !window.google?.accounts?.id) return false;
      const measured = Math.round(wrapper.offsetWidth || host.offsetWidth || 0);
      if (measured <= 0 && lastRenderWidth === 0) return false;
      const width = Math.min(Math.max(measured || lastRenderWidth || 320, GIS_MIN_WIDTH), GIS_MAX_WIDTH);
      if (Math.abs(width - lastRenderWidth) < 2 && lastRenderWidth > 0) {
        return coverCustomButton();
      }
      lastRenderWidth = width;
      host.innerHTML = '';
      window.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width,
        shape: 'rectangular',
        logo_alignment: 'left',
      });
      return coverCustomButton() || host.childElementCount > 0;
    };

    void (async () => {
      try {
        await loadScript('https://accounts.google.com/gsi/client', 'google-gsi-client');
        if (cancelled) return;

        const ready = await waitForGoogleIdentityServices();
        if (cancelled) return;
        if (!ready || !window.google?.accounts?.id) {
          setSdkError(
            `Could not initialize Google sign-in. ${googleOriginHint()} Also check that accounts.google.com is not blocked by an extension.`
          );
          return;
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            void handleCredential('google', response.credential);
          },
          cancel_on_tap_outside: true,
        });

        // Host may not have layout yet; retry briefly.
        const tryRender = (attempt: number) => {
          if (cancelled) return;
          if (renderGoogleButton() && coverCustomButton()) {
            setGoogleReady(true);
            setSdkError(null);
            return;
          }
          if (attempt < 20) {
            retryTimer = window.setTimeout(() => tryRender(attempt + 1), 100);
          } else {
            setSdkError(`Google sign-in button failed to load. ${googleOriginHint()}`);
          }
        };
        tryRender(0);

        if (typeof ResizeObserver !== 'undefined' && googleWrapperRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (cancelled) return;
            renderGoogleButton();
            coverCustomButton();
          });
          resizeObserver.observe(googleWrapperRef.current);
        }
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
      if (retryTimer) window.clearTimeout(retryTimer);
      resizeObserver?.disconnect();
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
        {showGoogle &&
          (isOAuthTestStub ? (
            <button
              type="button"
              onClick={() => void handleCredential('google', 'test-google-id-token')}
              disabled={loading}
              className={`${googleButtonClassName} ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              Continue with Google
            </button>
          ) : (
            <div
              ref={googleWrapperRef}
              className={`relative w-full overflow-hidden ${googleButtonClassName} ${
                loading ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <div className="pointer-events-none">
                {googleReady ? 'Continue with Google' : 'Loading Google…'}
              </div>
              {/* Invisible GIS iframe, scaled to the full custom button hit area */}
              <div
                ref={googleButtonHostRef}
                className="absolute inset-0 z-10 overflow-hidden opacity-[0.01]"
                aria-label="Continue with Google"
              />
            </div>
          ))}

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
