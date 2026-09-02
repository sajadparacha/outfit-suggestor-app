import { rest } from 'msw';

const API_BASE = 'http://localhost:8001';

const mockPresetLimit = 4;
let mockPresets: Array<{
  id: number;
  name: string;
  config: {
    reminder_time: string;
    shared_season: string;
    days: Array<{
      day_of_week: number;
      enabled: boolean;
      occasion: string;
      style: string;
      use_wardrobe_only: boolean;
    }>;
  };
  created_at: string;
  updated_at: string;
}> = [];
let mockPresetIdSeq = 1;

export const handlers = [
  // Default: App fetches recent history after a suggestion; tests can override with server.use.
  rest.get(`${API_BASE}/api/outfit-history`, (_req, res, ctx) => {
    return res(ctx.json([]));
  }),

  rest.get(`${API_BASE}/api/guest-usage`, (_req, res, ctx) => {
    return res(
      ctx.json({
        limit: 3,
        used: 0,
        remaining: 3,
        requires_signup: false,
      })
    );
  }),

  rest.post(`${API_BASE}/api/auth/oauth`, async (req, res, ctx) => {
    const body = await req.json();
    const provider = body?.provider;
    if (provider !== 'google' && provider !== 'apple') {
      return res(ctx.status(400), ctx.json({ detail: 'Unsupported OAuth provider' }));
    }
    if (!body?.id_token) {
      return res(ctx.status(401), ctx.json({ detail: 'Invalid OAuth token' }));
    }
    return res(
      ctx.json({
        access_token: `oauth-test-token-${provider}`,
        token_type: 'bearer',
        user: {
          id: 42,
          email: `${provider}@example.com`,
          full_name: `${provider} User`,
          is_active: true,
          email_verified: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      })
    );
  }),

  rest.get(`${API_BASE}/api/wardrobe/summary`, (_req, res, ctx) => {
    return res(
      ctx.json({
        total_items: 1,
        by_category: { shirt: 1 },
        by_color: { Blue: 1 },
        categories: ['shirt'],
      })
    );
  }),

  rest.get(`${API_BASE}/api/wardrobe`, (req, res, ctx) => {
    // Minimal payload needed by the UI (id/category/color/description/image_data)
    const limit = Number(req.url.searchParams.get('limit') ?? 10);
    const offset = Number(req.url.searchParams.get('offset') ?? 0);

    return res(
      ctx.json({
        items: [
          {
            id: 1,
            category: 'shirt',
            color: 'Blue',
            description: 'Integration test shirt',
            image_data: null,
            name: null,
          },
        ],
        total: 1,
        limit,
        offset,
      })
    );
  }),

  rest.get(`${API_BASE}/api/access-logs/stats`, (_req, res, ctx) => {
    return res(
      ctx.json({
        total_requests: 0,
        unique_ip_addresses: 0,
        average_response_time_ms: null,
        by_country: [],
        by_city: [],
      })
    );
  }),

  rest.get(`${API_BASE}/api/access-logs/usage`, (_req, res, ctx) => {
    return res(
      ctx.json({
        ai_calls: { total: 0, outfit_suggestions: 0, wardrobe_analysis: 0, unique_users: 0 },
        wardrobe_operations: { total: 0, add: 0, view: 0, unique_users: 0 },
        outfit_history: { views: 0, unique_users: 0 },
        top_users: [],
      })
    );
  }),

  rest.get(`${API_BASE}/api/access-logs/timeline`, (_req, res, ctx) => {
    return res(ctx.json({ group_by: 'day', timeline: [] }));
  }),

  rest.get(`${API_BASE}/api/reports/searches`, (_req, res, ctx) => {
    return res(
      ctx.json({
        total_searches: 0,
        by_occasion: [],
        by_season: [],
        by_style: [],
        timeline: [],
        recent: [],
      })
    );
  }),

  // Week Outfit Planner defaults (tests override with server.use as needed)
  rest.get(`${API_BASE}/api/week-plan`, (_req, res, ctx) => {
    return res(
      ctx.json({
        reminder_time: '07:30',
        timezone: 'UTC',
        shared_style: 'classic',
        shared_season: 'all-season',
        days: Array.from({ length: 7 }, (_, i) => ({
          day_of_week: i,
          enabled: false,
          occasion: 'everyday',
          style: 'classic',
          use_wardrobe_only: true,
          pinned_items: {},
          outfit: null,
        })),
        wardrobe_empty: false,
        message: null,
      })
    );
  }),

  rest.put(`${API_BASE}/api/week-plan`, async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.json({
        reminder_time: body.reminder_time ?? '07:30',
        timezone: body.timezone ?? 'UTC',
        shared_style: body.shared_style ?? 'classic',
        shared_season: body.shared_season ?? 'all-season',
        days: (body.days ?? []).map(
          (d: {
            day_of_week: number;
            enabled: boolean;
            occasion: string;
            style?: string;
            use_wardrobe_only?: boolean;
            pinned_items?: Record<string, number>;
          }) => ({
            day_of_week: d.day_of_week,
            enabled: d.enabled,
            occasion: d.occasion,
            style: d.style ?? 'classic',
            use_wardrobe_only: d.use_wardrobe_only ?? true,
            pinned_items: d.pinned_items ?? {},
            outfit: null,
          })
        ),
        wardrobe_empty: false,
        message: null,
      })
    );
  }),

  rest.post(`${API_BASE}/api/week-plan/generate`, async (req, res, ctx) => {
    const body = (await req.json().catch(() => ({}))) as { day_of_week?: number };
    const days = Array.from({ length: 7 }, (_, i) => {
      const enabled = body.day_of_week !== undefined ? i === body.day_of_week : i < 5;
      return {
        day_of_week: i,
        enabled,
        occasion: i === 0 ? 'work' : 'everyday',
        style: 'classic',
        use_wardrobe_only: true,
        outfit: enabled
          ? {
              summary: `Outfit for day ${i}`,
              shirt: 'White shirt',
              trouser: 'Navy trousers',
              blazer: 'Gray blazer',
              shoes: 'Brown shoes',
              belt: 'Brown belt',
              reasoning: 'Mock week plan outfit',
            }
          : null,
      };
    });
    return res(
      ctx.json({
        reminder_time: '07:30',
        timezone: 'UTC',
        shared_style: 'classic',
        shared_season: 'all-season',
        days,
        wardrobe_empty: false,
        message: null,
      })
    );
  }),

  rest.get(`${API_BASE}/api/week-plan/today`, (_req, res, ctx) => {
    return res(
      ctx.json({
        day_of_week: 0,
        enabled: false,
        occasion: null,
        use_wardrobe_only: true,
        outfit: null,
        reminder_time: '07:30',
        timezone: 'UTC',
        has_plan: true,
        message: null,
      })
    );
  }),

  rest.delete(`${API_BASE}/api/week-plan`, (_req, res, ctx) => {
    return res(ctx.status(204));
  }),

  rest.get(`${API_BASE}/api/week-plan/history`, (_req, res, ctx) => {
    return res(ctx.json({ items: [] }));
  }),

  rest.post(`${API_BASE}/api/week-plan/history/:id/restore`, (_req, res, ctx) => {
    return res(
      ctx.json({
        reminder_time: '07:30',
        timezone: 'UTC',
        shared_style: 'classic',
        shared_season: 'all-season',
        days: Array.from({ length: 7 }, (_, i) => ({
          day_of_week: i,
          enabled: i === 0,
          occasion: i === 0 ? 'work' : 'everyday',
          style: 'classic',
          use_wardrobe_only: true,
          outfit: null,
        })),
        wardrobe_empty: false,
        message: null,
      })
    );
  }),

  rest.get(`${API_BASE}/api/week-plan/presets`, (_req, res, ctx) => {
    return res(
      ctx.json({
        items: mockPresets,
        count: mockPresets.length,
        limit: mockPresetLimit,
        limit_source: 'default',
      })
    );
  }),

  rest.post(`${API_BASE}/api/week-plan/presets`, async (req, res, ctx) => {
    const body = await req.json();
    if (mockPresets.length >= mockPresetLimit) {
      return res(ctx.status(409), ctx.json({ detail: 'Preset limit reached' }));
    }
    const now = new Date().toISOString();
    const item = {
      id: mockPresetIdSeq++,
      name: String(body.name || '').trim(),
      config: body.config,
      created_at: now,
      updated_at: now,
    };
    mockPresets = [item, ...mockPresets];
    return res(ctx.json(item));
  }),

  rest.put(`${API_BASE}/api/week-plan/presets/:id`, async (req, res, ctx) => {
    const presetId = Number(req.params.id);
    const body = await req.json();
    const idx = mockPresets.findIndex((p) => p.id === presetId);
    if (idx < 0) {
      return res(ctx.status(404), ctx.json({ detail: 'Preset not found' }));
    }
    const updated = {
      ...mockPresets[idx],
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.config != null ? { config: body.config } : {}),
      updated_at: new Date().toISOString(),
    };
    mockPresets = mockPresets.map((p) => (p.id === presetId ? updated : p));
    return res(ctx.json(updated));
  }),

  rest.delete(`${API_BASE}/api/week-plan/presets/:id`, (req, res, ctx) => {
    const presetId = Number(req.params.id);
    mockPresets = mockPresets.filter((p) => p.id !== presetId);
    return res(ctx.status(204));
  }),

  rest.post(`${API_BASE}/api/week-plan/presets/:id/apply`, (req, res, ctx) => {
    const presetId = Number(req.params.id);
    const preset = mockPresets.find((p) => p.id === presetId);
    if (!preset) {
      return res(ctx.status(404), ctx.json({ detail: 'Preset not found' }));
    }
    return res(
      ctx.json({
        reminder_time: preset.config.reminder_time,
        timezone: 'UTC',
        shared_style: 'classic',
        shared_season: preset.config.shared_season,
        days: preset.config.days.map((d) => ({ ...d, outfit: null })),
        wardrobe_empty: false,
        message: null,
      })
    );
  }),

  rest.patch(`${API_BASE}/api/admin/users/:id/week-plan-preset-limit`, async (req, res, ctx) => {
    const userId = Number(req.params.id);
    const body = await req.json();
    const effective = body.limit ?? mockPresetLimit;
    return res(
      ctx.json({
        user_id: userId,
        week_plan_preset_limit_override: body.limit ?? null,
        effective_limit: effective,
        limit_source: body.limit != null ? 'override' : 'default',
      })
    );
  }),
];

