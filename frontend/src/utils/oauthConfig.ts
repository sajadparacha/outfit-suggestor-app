import { OAuthProvider } from '../models/AuthModels';

export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID ?? '';
export const APPLE_CLIENT_ID = process.env.REACT_APP_APPLE_CLIENT_ID ?? '';

/** In Jest, skip external SDKs and use stub id_tokens from button clicks. */
export const isOAuthTestStub = process.env.NODE_ENV === 'test';

export function isOAuthProviderConfigured(provider: OAuthProvider): boolean {
  if (isOAuthTestStub) return true;
  if (provider === 'google') return GOOGLE_CLIENT_ID.length > 0;
  return APPLE_CLIENT_ID.length > 0;
}

/** Deduplicate concurrent loads (React Strict Mode remounts the same script). */
const scriptPromises = new Map<string, Promise<void>>();

export function loadScript(src: string, id: string): Promise<void> {
  const cached = scriptPromises.get(id);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing ?? document.createElement('script');
    const onLoad = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    const onError = () => {
      scriptPromises.delete(id);
      reject(new Error(`Failed to load script: ${src}`));
    };

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    if (!existing) {
      script.id = id;
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    }
  });

  scriptPromises.set(id, promise);
  return promise;
}

/** Wait until GIS exposes window.google.accounts.id (script onload can race). */
export function waitForGoogleIdentityServices(
  timeoutMs = 8000,
  intervalMs = 50
): Promise<boolean> {
  const hasGoogleId = () =>
    Boolean(
      (window as Window & { google?: { accounts?: { id?: unknown } } }).google
        ?.accounts?.id
    );

  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && hasGoogleId()) {
      resolve(true);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (hasGoogleId()) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, intervalMs);
  });
}
