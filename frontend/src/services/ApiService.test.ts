/**
 * Unit tests for ApiService — request shape for recent outfit API fields.
 */
import apiService from './ApiService';
import { GuestLimitReachedError } from '../models/GuestModels';

describe('ApiService.getSuggestion', () => {
  const originalFetch = global.fetch;

  function mockJsonResponse(body?: object, status = 200, ok = true) {
    const responseBody = body ?? {
      shirt: 'x',
      trouser: 'x',
      blazer: 'x',
      shoes: 'x',
      belt: 'x',
      reasoning: 'x',
    };
    const res = {
      ok,
      status,
      headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
      json: async () => responseBody,
      clone() {
        return res;
      },
    };
    return res;
  }

  beforeEach(() => {
    localStorage.clear();
    apiService.setAuthToken(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue(mockJsonResponse()) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('appends source_wardrobe_item_id to FormData when provided', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await apiService.getSuggestion(file, '', false, null, 'dalle3', false, 99);

    expect(global.fetch).toHaveBeenCalled();
    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect(fd.get('source_wardrobe_item_id')).toBe('99');
  });

  it('does not append source_wardrobe_item_id when null', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await apiService.getSuggestion(file, '', false, null, 'dalle3', false, null);

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const fd = init.body as FormData;
    expect(fd.get('source_wardrobe_item_id')).toBeNull();
  });

  it('appends occasion, season, and style to FormData when provided', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await apiService.getSuggestion(
      file,
      '',
      false,
      null,
      'dalle3',
      false,
      null,
      null,
      'business',
      'summer',
      'modern'
    );

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const fd = init.body as FormData;
    expect(fd.get('occasion')).toBe('business');
    expect(fd.get('season')).toBe('summer');
    expect(fd.get('style')).toBe('modern');
  });

  it('appends previous_outfit_text when asking for an alternate outfit', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await apiService.getSuggestion(
      file,
      '',
      false,
      null,
      'dalle3',
      false,
      null,
      'Shirt: white\nTrousers: navy'
    );

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const fd = init.body as FormData;
    expect(fd.get('previous_outfit_text')).toBe('Shirt: white\nTrousers: navy');
  });

  it('sends X-Guest-Session-Id when unauthenticated', async () => {
    localStorage.setItem('guest_session_id', 'test-guest-uuid');
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await apiService.getSuggestion(file);

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Guest-Session-Id']).toBe('test-guest-uuid');
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('throws GuestLimitReachedError on 403 guest_limit_reached', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          detail:
            "You've used your 3 free AI outfit suggestions. Create an account to keep using the app.",
          code: 'guest_limit_reached',
        },
        403,
        false
      )
    ) as unknown as typeof fetch;

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await expect(apiService.getSuggestion(file)).rejects.toBeInstanceOf(GuestLimitReachedError);
  });
});

describe('ApiService.getGuestUsage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('guest_session_id', 'guest-123');
    apiService.setAuthToken(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fetches guest usage with X-Guest-Session-Id header', async () => {
    const usage = { limit: 3, used: 1, remaining: 2, requires_signup: false };
    const res = {
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
      json: async () => usage,
      clone() {
        return res;
      },
    };
    global.fetch = jest.fn().mockResolvedValue(res) as unknown as typeof fetch;

    const result = await apiService.getGuestUsage();

    expect(result).toEqual(usage);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/guest-usage');
    expect((init.headers as Record<string, string>)['X-Guest-Session-Id']).toBe('guest-123');
  });
});

describe('ApiService.analyzeWardrobeGaps', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const responseBody = {
      occasion: 'business',
      season: 'winter',
      style: 'classic',
      overall_summary: 'Looks balanced.',
      analysis_by_category: {},
    };
    const res = {
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
      json: async () => responseBody,
      clone() {
        return res;
      },
    };
    global.fetch = jest.fn().mockResolvedValue(res) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('posts occasion, season, style and text_input payload', async () => {
    await apiService.analyzeWardrobeGaps({
      occasion: 'business',
      season: 'winter',
      style: 'classic',
      text_input: 'No bright colors',
    });

    expect(global.fetch).toHaveBeenCalled();
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/wardrobe/analyze-gaps');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(
      JSON.stringify({
        occasion: 'business',
        season: 'winter',
        style: 'classic',
        text_input: 'No bright colors',
      })
    );
  });

  it('includes analysis_mode when provided', async () => {
    await apiService.analyzeWardrobeGaps({
      occasion: 'formal',
      season: 'summer',
      style: 'modern',
      text_input: 'premium flow',
      analysis_mode: 'premium',
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(
      JSON.stringify({
        occasion: 'formal',
        season: 'summer',
        style: 'modern',
        text_input: 'premium flow',
        analysis_mode: 'premium',
      })
    );
  });
});
