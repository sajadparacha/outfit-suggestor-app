import { rest, RestRequest } from 'msw';
import type { MatchingWardrobeItems, OutfitHistoryEntry } from '../../models/OutfitModels';

const API_BASE = 'http://localhost:8001';

/** Detail-shaped history entry (full `image_data`); list handlers strip it like the backend. */
export type MockHistoryEntry = OutfitHistoryEntry & { image_thumbnail: string | null };

export function makeHistoryEntry(id: number, overrides: Partial<MockHistoryEntry> = {}): MockHistoryEntry {
  return {
    id,
    created_at: new Date(Date.UTC(2026, 0, 1) + id * 60000).toISOString(),
    text_input: '',
    image_data: `full-photo-${id}`,
    image_thumbnail: `thumb-photo-${id}`,
    model_image: null,
    shirt: `Shirt ${id}`,
    trouser: `Trouser ${id}`,
    blazer: `Blazer ${id}`,
    shoes: `Shoes ${id}`,
    belt: `Belt ${id}`,
    reasoning: `Reasoning ${id}`,
    ...overrides,
  };
}

const HISTORY_SLOT_ID_FIELDS = [
  'shirt_id',
  'trouser_id',
  'blazer_id',
  'shoes_id',
  'belt_id',
  'sweater_id',
  'outerwear_id',
  'tie_id',
] as const;

function toHistoryListEntry(entry: MockHistoryEntry, includeImages: boolean) {
  const matching = entry.matching_wardrobe_items
    ? Object.fromEntries(
        Object.entries(entry.matching_wardrobe_items).map(([slot, items]) => [
          slot,
          (items ?? []).map((item: MatchingWardrobeItems['shirt'][number]) => ({
            ...item,
            image_data: null,
            image_thumbnail: includeImages ? item.image_thumbnail ?? null : null,
          })),
        ])
      ) as unknown as MatchingWardrobeItems
    : entry.matching_wardrobe_items;
  return {
    ...entry,
    image_data: null,
    image_thumbnail: includeImages ? entry.image_thumbnail : null,
    model_image: includeImages ? entry.model_image : null,
    matching_wardrobe_items: matching,
  };
}

export type HistoryRequestLog = Array<{
  limit: number;
  offset: number;
  wardrobeItemId: number | null;
  includeImages: boolean;
}>;

/**
 * Contract-accurate GET /api/outfit-history (paging, clamp 100, wardrobe_item_id filter,
 * include_images) + GET /api/outfit-history/:id over `entries` (newest first).
 */
export function createHistoryHandlers(
  entries: MockHistoryEntry[],
  options: {
    requests?: HistoryRequestLog;
    detailRequests?: number[];
    /** Optional per-request delay (ms) for list pages, e.g. to observe the load-more spinner. */
    listDelay?: (query: HistoryRequestLog[number]) => number;
  } = {}
) {
  const parseQuery = (req: RestRequest) => {
    const limit = Math.min(Number(req.url.searchParams.get('limit') ?? 20), 100);
    const offset = Number(req.url.searchParams.get('offset') ?? 0);
    const rawItemId = req.url.searchParams.get('wardrobe_item_id');
    const wardrobeItemId = rawItemId != null ? Number(rawItemId) : null;
    const includeImages = req.url.searchParams.get('include_images') !== 'false';
    return { limit, offset, wardrobeItemId, includeImages };
  };

  return [
    rest.get(`${API_BASE}/api/outfit-history`, (req, res, ctx) => {
      const query = parseQuery(req);
      options.requests?.push(query);
      const filtered =
        query.wardrobeItemId == null
          ? entries
          : entries.filter(
              (entry) =>
                entry.source_wardrobe_item_id === query.wardrobeItemId ||
                HISTORY_SLOT_ID_FIELDS.some((field) => entry[field] === query.wardrobeItemId)
            );
      const page = filtered
        .slice(query.offset, query.offset + query.limit)
        .map((entry) => toHistoryListEntry(entry, query.includeImages));
      const delayMs = options.listDelay?.(query) ?? 0;
      return delayMs > 0 ? res(ctx.delay(delayMs), ctx.json(page)) : res(ctx.json(page));
    }),
    rest.get(`${API_BASE}/api/outfit-history/:id`, (req, res, ctx) => {
      const id = Number(req.params.id);
      options.detailRequests?.push(id);
      const entry = entries.find((candidate) => candidate.id === id);
      if (!entry) {
        return res(ctx.status(404), ctx.json({ detail: 'History entry not found' }));
      }
      return res(ctx.json(entry));
    }),
  ];
}

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
  // Default: empty history (list + 404 detail); tests override with server.use(...createHistoryHandlers(entries)).
  ...createHistoryHandlers([]),

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
    // List shape: image_data is always null; image_thumbnail carries the photo (null = no photo).
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
            image_thumbnail: null,
            name: null,
          },
        ],
        total: 1,
        limit,
        offset,
      })
    );
  }),

  // Detail shape: full image_data + image_thumbnail. Non-numeric paths (summary, random-outfit…) fall through.
  rest.get(`${API_BASE}/api/wardrobe/:id`, (req, res, ctx) => {
    const raw = String(req.params.id);
    if (!/^\d+$/.test(raw)) return undefined;
    const id = Number(raw);
    return res(
      ctx.json({
        id,
        category: 'shirt',
        name: null,
        description: 'Integration test shirt',
        color: 'Blue',
        brand: null,
        size: null,
        image_data: btoa(`full-wardrobe-${id}`),
        image_thumbnail: btoa(`thumb-wardrobe-${id}`),
        tags: null,
        condition: null,
        wear_count: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      })
    );
  }),

  rest.post(`${API_BASE}/api/wardrobe/evaluate-fit`, async (req, res, ctx) => {
    const body = await req.json();
    const itemId = body.wardrobe_item_id ?? 1;
    return res(
      ctx.json({
        candidate: {
          id: itemId,
          category: body.category ?? 'shirt',
          label: 'Blue shirt',
          color: body.color ?? 'Blue',
          image_data: null,
        },
        goal: {
          label: 'business-casual',
          dress_code: body.dress_code ?? 'smart-casual',
          lifestyle_mix: body.lifestyle_mix ?? ['work', 'everyday'],
          primary_lifestyle: body.primary_lifestyle ?? 'work',
          style_primary: body.style_primary ?? 'classic',
          text_input: body.text_input ?? '',
        },
        pairs_with: [
          {
            category: 'trouser',
            count: 2,
            items: [
              { id: 12, label: 'Navy chinos', color: 'navy', image_data: null },
              { id: 13, label: 'Gray trousers', color: 'gray', image_data: null },
            ],
          },
          {
            category: 'shoes',
            count: 1,
            items: [{ id: 20, label: 'Brown loafers', color: 'brown', image_data: null }],
          },
        ],
        outfit_multiplier: 6,
        verdict: 'strong_fit',
        missing_for_goal: {
          category: 'blazer',
          label: 'structured blazer',
          reason: 'A blazer would unlock more work looks with this shirt.',
          candidate_fills_this_gap: false,
        },
        summary_text: 'This shirt works with 2 trousers and 1 pair of shoes you own.',
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

  rest.post(`${API_BASE}/api/error-events`, (_req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ id: 1, fingerprint: 'test-fp' }));
  }),

  rest.get(`${API_BASE}/api/admin/error-events`, (_req, res, ctx) => {
    return res(ctx.json({ total: 0, limit: 100, offset: 0, events: [] }));
  }),

  rest.get(`${API_BASE}/api/admin/error-events/:id`, (req, res, ctx) => {
    return res(
      ctx.json({
        id: Number(req.params.id),
        source: 'client',
        error_code: 'client_render_error',
        message: 'Mock error',
        suggested_cause: 'A React section threw while rendering.',
        suggested_solution: 'Use the stack and route in the event detail.',
        resolved: false,
        created_at: '2026-06-01T12:00:00Z',
      })
    );
  }),

  rest.patch(`${API_BASE}/api/admin/error-events/:id/resolved`, (req, res, ctx) => {
    return res(
      ctx.json({
        id: Number(req.params.id),
        source: 'client',
        error_code: 'client_render_error',
        message: 'Mock error',
        suggested_cause: 'A React section threw while rendering.',
        suggested_solution: 'Use the stack and route in the event detail.',
        resolved: true,
        resolved_at: '2026-06-02T00:00:00Z',
        created_at: '2026-06-01T12:00:00Z',
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

