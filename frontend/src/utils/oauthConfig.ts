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

export function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}
