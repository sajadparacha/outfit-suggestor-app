import { rest } from 'msw';

const API_BASE = 'http://localhost:8001';

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
          }) => ({
            day_of_week: d.day_of_week,
            enabled: d.enabled,
            occasion: d.occasion,
            style: d.style ?? 'classic',
            use_wardrobe_only: d.use_wardrobe_only ?? true,
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
];

