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
];

