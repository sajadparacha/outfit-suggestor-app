/**
 * Integration: History screen pagination, thumbnails and full-image enlarge (spec: api-response-size).
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
import {
  installIntersectionObserverMock,
  observedTestIds,
  triggerIntersection,
  uninstallIntersectionObserverMock,
} from '../../test/intersectionObserverMock';

const API_BASE = 'http://localhost:8001';
const SENTINEL = 'history-load-more-sentinel';

jest.setTimeout(20000);

const mockUser = { id: 1, email: 'test@example.com', full_name: 'Test User', is_admin: false };

/** 25 entries, newest first (ids 25 → 1). */
const entries = Array.from({ length: 25 }, (_, i) => makeHistoryEntry(25 - i));

describe('History pagination integration', () => {
  let requests: HistoryRequestLog;
  let detailRequests: number[];

  beforeEach(() => {
    requests = [];
    detailRequests = [];
    installIntersectionObserverMock();
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('first_run_coach_dismissed', 'true');
    server.use(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) => res(ctx.json(mockUser))),
      ...createHistoryHandlers(entries, {
        requests,
        detailRequests,
        listDelay: (query) => (query.offset > 0 ? 150 : 0),
      })
    );
  });

  afterEach(() => {
    uninstallIntersectionObserverMock();
    localStorage.clear();
  });

  const renderHistory = async () => {
    renderApp({ routerProps: { initialEntries: ['/history'] } });
    expect(await screen.findByText('Shirt 25')).toBeInTheDocument();
  };

  it('loads 20, loads the next page from the sentinel, then stops on a short page', async () => {
    await renderHistory();

    expect(requests).toEqual([{ limit: 20, offset: 0, wardrobeItemId: null, includeImages: true }]);
    expect(screen.getByText('Showing last 20 entries.')).toBeInTheDocument();
    expect(screen.queryByText(/load all/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
    expect(screen.getByText('Shirt 6')).toBeInTheDocument();
    expect(screen.queryByText('Shirt 5')).not.toBeInTheDocument();
    await waitFor(() => expect(observedTestIds()).toContain(SENTINEL));

    act(() => triggerIntersection(SENTINEL));

    expect(await screen.findByRole('status', { name: 'Loading more looks' })).toBeInTheDocument();
    expect(await screen.findByText('Shirt 1')).toBeInTheDocument();
    expect(requests[1]).toEqual({ limit: 20, offset: 20, wardrobeItemId: null, includeImages: true });

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Loading more looks' })).not.toBeInTheDocument();
    });
    await waitFor(() => expect(screen.queryByTestId(SENTINEL)).not.toBeInTheDocument());
    expect(screen.getByText('Showing all 25 entries')).toBeInTheDocument();
    expect(screen.queryByText(/Showing last/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();

    act(() => triggerIntersection(SENTINEL));
    expect(requests).toHaveLength(2);
    expect(requests.every((query) => query.limit <= 100)).toBe(true);
  });

  it('Refresh refetches the first page and resets pagination', async () => {
    await renderHistory();
    await waitFor(() => expect(observedTestIds()).toContain(SENTINEL));
    act(() => triggerIntersection(SENTINEL));
    expect(await screen.findByText('Showing all 25 entries')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));

    expect(await screen.findByText('Showing last 20 entries.')).toBeInTheDocument();
    expect(requests[requests.length - 1]).toEqual({
      limit: 20,
      offset: 0,
      wardrobeItemId: null,
      includeImages: true,
    });
    expect(screen.queryByText('Shirt 5')).not.toBeInTheDocument();
    expect(await screen.findByTestId(SENTINEL)).toBeInTheDocument();
  });

  it('Oldest First loads the remaining pages (page size 100) so ordering spans all history', async () => {
    await renderHistory();

    fireEvent.change(screen.getByDisplayValue('Newest First'), { target: { value: 'oldest' } });

    expect(await screen.findByText('Showing all 25 entries')).toBeInTheDocument();
    expect(requests).toContainEqual({ limit: 100, offset: 20, wardrobeItemId: null, includeImages: true });
    expect(requests.every((query) => query.limit <= 100)).toBe(true);
    const shirts = screen.getAllByText(/^Shirt \d+$/).map((el) => el.textContent);
    expect(shirts[0]).toBe('Shirt 1');
    expect(shirts[shirts.length - 1]).toBe('Shirt 25');
  });

  it('list cards use image_thumbnail; enlarge fetches the detail and shows the full photo', async () => {
    await renderHistory();

    const card = screen.getByTestId('history-entry-upload-25');
    expect(within(card).getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,thumb-photo-25');
    expect(detailRequests).toEqual([]);

    fireEvent.click(card);

    await waitFor(() => {
      const viewerSrcs = screen
        .getAllByAltText('Uploaded outfit')
        .map((img) => img.getAttribute('src'));
      expect(viewerSrcs).toContain('data:image/jpeg;base64,full-photo-25');
    });
    expect(detailRequests).toEqual([25]);
  });

  it('search loads the remaining pages (page size 100) before filtering client-side', async () => {
    await renderHistory();

    fireEvent.change(screen.getByPlaceholderText(/Search by clothing items/i), {
      target: { value: 'Reasoning 3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText(/Found 1 result for/)).toBeInTheDocument();
    expect(requests).toContainEqual({ limit: 100, offset: 20, wardrobeItemId: null, includeImages: true });
    expect(requests.every((query) => query.limit <= 100)).toBe(true);
  });

  it('delete removes the entry locally without refetching pages', async () => {
    server.use(
      rest.delete(`${API_BASE}/api/outfit-history/:id`, (_req, res, ctx) => res(ctx.status(204)))
    );
    await renderHistory();
    const listRequestsBefore = requests.length;

    fireEvent.click(screen.getAllByTitle(/Delete this entry/i)[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Shirt 25')).not.toBeInTheDocument());
    expect(await screen.findByText('Shirt 24')).toBeInTheDocument();
    expect(screen.queryByText('Shirt 25')).not.toBeInTheDocument();
    expect(screen.getByText('Shirt 6')).toBeInTheDocument();
    expect(requests).toHaveLength(listRequestsBefore);
  });
});
