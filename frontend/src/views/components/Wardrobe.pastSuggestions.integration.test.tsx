/**
 * Integration: Wardrobe grid thumbnails + Past Suggestions server filter / paging (spec: api-response-size).
 */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import { server } from '../../test/msw/server';
import {
  createHistoryHandlers,
  HistoryRequestLog,
  makeHistoryEntry,
} from '../../test/msw/handlers';
import { clearFullImageCache } from '../../utils/fullImageCache';
import {
  installIntersectionObserverMock,
  observedTestIds,
  triggerIntersection,
  uninstallIntersectionObserverMock,
} from '../../test/intersectionObserverMock';

const API_BASE = 'http://localhost:8001';
const SENTINEL = 'history-suggestions-load-more-sentinel';
const ITEM_ID = 7;
const THUMB = btoa('thumb-7');
const FULL = btoa('full-7');

jest.setTimeout(20000);

const mockUser = { id: 1, email: 'test@example.com', full_name: 'Test User', is_admin: false };

const listItem = {
  id: ITEM_ID,
  category: 'shirt',
  name: null,
  description: 'Thumbnail shirt',
  color: 'Blue',
  brand: null,
  size: null,
  image_data: null,
  image_thumbnail: THUMB,
  tags: null,
  condition: null,
  wear_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/** 25 entries linked to the item (ids 125 → 101) + 1 unrelated entry the server filters out. */
const linkedEntries = Array.from({ length: 25 }, (_, i) =>
  makeHistoryEntry(125 - i, i % 2 === 0 ? { shirt_id: ITEM_ID } : { source_wardrobe_item_id: ITEM_ID })
);
const unrelatedEntry = makeHistoryEntry(200, { shirt: 'Unrelated shirt' });

describe('Wardrobe Past Suggestions integration', () => {
  let requests: HistoryRequestLog;
  let wardrobeDetailRequests: number[];
  let historyDetailRequests: number[];

  beforeEach(() => {
    requests = [];
    wardrobeDetailRequests = [];
    historyDetailRequests = [];
    clearFullImageCache();
    installIntersectionObserverMock();
    HTMLElement.prototype.scrollIntoView = jest.fn();
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('first_run_coach_dismissed', 'true');
    localStorage.setItem('wardrobe_flow_tip_dismissed', 'true');
    server.use(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) => res(ctx.json(mockUser))),
      rest.get(`${API_BASE}/api/wardrobe`, (req, res, ctx) =>
        res(
          ctx.json({
            items: [listItem],
            total: 1,
            limit: Number(req.url.searchParams.get('limit') ?? 10),
            offset: 0,
          })
        )
      ),
      rest.get(`${API_BASE}/api/wardrobe/:id`, (req, res, ctx) => {
        if (!/^\d+$/.test(String(req.params.id))) return undefined;
        wardrobeDetailRequests.push(Number(req.params.id));
        return res(ctx.json({ ...listItem, image_data: FULL }));
      }),
      ...createHistoryHandlers([unrelatedEntry, ...linkedEntries], { requests, detailRequests: historyDetailRequests })
    );
  });

  afterEach(() => {
    uninstallIntersectionObserverMock();
    localStorage.clear();
  });

  const renderWardrobe = async () => {
    renderApp({ routerProps: { initialEntries: ['/wardrobe'] } });
    expect(await screen.findByText('Thumbnail shirt')).toBeInTheDocument();
  };

  const pastSuggestionRequests = () => requests.filter((query) => query.wardrobeItemId != null);

  const imageSrcs = () =>
    [...screen.queryAllByRole('img'), ...screen.queryAllByRole('presentation')].map((img) =>
      img.getAttribute('src')
    );

  it('wardrobe grid renders image_thumbnail; enlarge fetches the full photo', async () => {
    await renderWardrobe();

    const enlarge = screen.getByTestId(`wardrobe-item-enlarge-${ITEM_ID}`);
    expect(within(enlarge).getByRole('img')).toHaveAttribute('src', `data:image/jpeg;base64,${THUMB}`);
    expect(wardrobeDetailRequests).toEqual([]);

    fireEvent.click(enlarge);
    await waitFor(() => {
      expect(screen.getByAltText('Full size view').getAttribute('src')).toBe(`data:image/jpeg;base64,${FULL}`);
    });
    expect(wardrobeDetailRequests).toEqual([ITEM_ID]);
  });

  it('requests wardrobe_item_id with paging, loads more on scroll, no client-side filter', async () => {
    await renderWardrobe();

    fireEvent.click(screen.getByTestId(`wardrobe-item-menu-${ITEM_ID}`));
    fireEvent.click(screen.getByTestId(`wardrobe-menu-past-suggestions-${ITEM_ID}`));

    const modal = await screen.findByTestId('history-suggestions-modal');
    expect(within(modal).getAllByRole('button', { name: 'Use This' })).toHaveLength(20);
    expect(pastSuggestionRequests()).toEqual([
      { limit: 20, offset: 0, wardrobeItemId: ITEM_ID, includeImages: true },
    ]);
    expect(within(modal).queryByText(/Unrelated shirt/)).not.toBeInTheDocument();

    await waitFor(() => expect(observedTestIds()).toContain(SENTINEL));
    act(() => triggerIntersection(SENTINEL));

    await waitFor(() => {
      expect(within(modal).getAllByRole('button', { name: 'Use This' })).toHaveLength(25);
    });
    expect(pastSuggestionRequests()[1]).toEqual({
      limit: 20,
      offset: 20,
      wardrobeItemId: ITEM_ID,
      includeImages: true,
    });
    await waitFor(() => expect(screen.queryByTestId(SENTINEL)).not.toBeInTheDocument());
    act(() => triggerIntersection(SENTINEL));
    expect(pastSuggestionRequests()).toHaveLength(2);
  });

  it('keeps existing empty copy when the server returns no entries for the item', async () => {
    server.use(...createHistoryHandlers([unrelatedEntry], { requests }));
    await renderWardrobe();

    fireEvent.click(screen.getByTestId(`wardrobe-item-menu-${ITEM_ID}`));
    fireEvent.click(screen.getByTestId(`wardrobe-menu-past-suggestions-${ITEM_ID}`));

    expect(
      await screen.findByText(/No history suggestions found for this wardrobe item yet/i)
    ).toBeInTheDocument();
    expect(pastSuggestionRequests()[0].wardrobeItemId).toBe(ITEM_ID);
  });

  it('selecting a past suggestion fetches the wardrobe item detail before loading it into Suggest', async () => {
    await renderWardrobe();

    fireEvent.click(screen.getByTestId(`wardrobe-item-menu-${ITEM_ID}`));
    fireEvent.click(screen.getByTestId(`wardrobe-menu-past-suggestions-${ITEM_ID}`));
    const modal = await screen.findByTestId('history-suggestions-modal');
    expect(wardrobeDetailRequests).toEqual([]);

    fireEvent.click(within(modal).getAllByRole('button', { name: 'Use This' })[0]);

    await waitFor(() => {
      expect(screen.queryByTestId('history-suggestions-modal')).not.toBeInTheDocument();
    });
    expect(wardrobeDetailRequests).toEqual([ITEM_ID]);
    expect(await screen.findByText(/Item loaded on Suggest/i)).toBeInTheDocument();
    expect(screen.getAllByText('Shirt 125').length).toBeGreaterThan(0);

    await waitFor(() => expect(historyDetailRequests).toEqual([125]));
    await waitFor(() => expect(imageSrcs()).toContain('data:image/jpeg;base64,full-photo-125'));
  });

  it('keeps the thumbnail preview when the selected entry detail fails', async () => {
    server.use(
      rest.get(`${API_BASE}/api/outfit-history/:id`, (req, res, ctx) => {
        historyDetailRequests.push(Number(req.params.id));
        return res(ctx.status(500), ctx.json({ detail: 'boom' }));
      })
    );
    await renderWardrobe();

    fireEvent.click(screen.getByTestId(`wardrobe-item-menu-${ITEM_ID}`));
    fireEvent.click(screen.getByTestId(`wardrobe-menu-past-suggestions-${ITEM_ID}`));
    const modal = await screen.findByTestId('history-suggestions-modal');
    fireEvent.click(within(modal).getAllByRole('button', { name: 'Use This' })[0]);

    expect(await screen.findByText(/Item loaded on Suggest/i)).toBeInTheDocument();
    await waitFor(() => expect(historyDetailRequests).toEqual([125]));
    expect(screen.getAllByText('Shirt 125').length).toBeGreaterThan(0);
    expect(imageSrcs()).not.toContain('data:image/jpeg;base64,full-photo-125');
  });
});
