import { loadScript, waitForGoogleIdentityServices } from './oauthConfig';

describe('oauthConfig loadScript', () => {
  afterEach(() => {
    document.querySelectorAll('script[id="test-script"]').forEach((n) => n.remove());
    // Reset module-level cache between tests by removing scripts; Map may retain
    // resolved promises which is fine for identical ids across tests if cleaned.
  });

  it('dedupes concurrent loads for the same script id', async () => {
    const p1 = loadScript('https://example.com/a.js', 'test-script');
    const p2 = loadScript('https://example.com/a.js', 'test-script');
    expect(p1).toBe(p2);
    expect(document.querySelectorAll('#test-script')).toHaveLength(1);

    const script = document.getElementById('test-script') as HTMLScriptElement;
    script.dispatchEvent(new Event('load'));
    await expect(p1).resolves.toBeUndefined();
    await expect(p2).resolves.toBeUndefined();
    expect(script.dataset.loaded).toBe('true');
  });
});

describe('waitForGoogleIdentityServices', () => {
  afterEach(() => {
    delete (window as { google?: unknown }).google;
  });

  it('resolves true when google.accounts.id appears', async () => {
    const pending = waitForGoogleIdentityServices(1000, 20);
    window.setTimeout(() => {
      (window as { google?: unknown }).google = {
        accounts: { id: { initialize: jest.fn(), renderButton: jest.fn() } },
      };
    }, 40);
    await expect(pending).resolves.toBe(true);
  });

  it('resolves false on timeout', async () => {
    await expect(waitForGoogleIdentityServices(80, 20)).resolves.toBe(false);
  });
});
