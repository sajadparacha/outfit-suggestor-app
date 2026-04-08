/**
 * Unit tests for ApiService — request shape for recent outfit API fields.
 */
import apiService from './ApiService';

describe('ApiService.getSuggestion', () => {
  const originalFetch = global.fetch;

  function mockJsonResponse() {
    const body = {
      shirt: 'x',
      trouser: 'x',
      blazer: 'x',
      shoes: 'x',
      belt: 'x',
      reasoning: 'x',
    };
    const res = {
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
      json: async () => body,
      clone() {
        return res;
      },
    };
    return res;
  }

  beforeEach(() => {
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
});
