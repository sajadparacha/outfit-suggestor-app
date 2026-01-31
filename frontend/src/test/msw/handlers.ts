import { rest } from 'msw';

const API_BASE = 'http://localhost:8001';

export const handlers = [
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
];

