import { screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import { server } from '../../test/msw/server';
import { ROUTES } from '../../navigation/routes';

const API_BASE = 'http://localhost:8001';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  is_admin: false,
};

describe('Wardrobe multi-select complete outfit integration', () => {
  let capturedRequestBody: Record<string, unknown> | null;

  beforeEach(() => {
    capturedRequestBody = null;
    HTMLElement.prototype.scrollIntoView = jest.fn();
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('first_run_coach_dismissed', 'true');
    localStorage.setItem('wardrobe_flow_tip_dismissed', 'true');

    server.use(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) => res(ctx.json(mockUser))),
      rest.get(`${API_BASE}/api/wardrobe/summary`, (_req, res, ctx) =>
        res(
          ctx.json({
            total_items: 3,
            by_category: { shirt: 1, trouser: 1, blazer: 1 },
            by_color: { Blue: 1, Navy: 1, Charcoal: 1 },
            categories: ['shirt', 'trouser', 'blazer'],
          })
        )
      ),
      rest.get(`${API_BASE}/api/wardrobe`, (_req, res, ctx) =>
        res(
          ctx.json({
            items: [
              {
                id: 11,
                category: 'shirt',
                color: 'Blue',
                description: 'Blue oxford shirt',
                image_data: 'shirtImage',
                name: null,
              },
              {
                id: 22,
                category: 'trouser',
                color: 'Navy',
                description: 'Navy trousers',
                image_data: 'trouserImage',
                name: null,
              },
              {
                id: 33,
                category: 'blazer',
                color: 'Charcoal',
                description: 'Charcoal blazer',
                image_data: 'blazerImage',
                name: null,
              },
            ],
            total: 3,
            limit: 10,
            offset: 0,
          })
        )
      ),
      rest.post(`${API_BASE}/api/suggest-outfit-from-wardrobe`, async (req, res, ctx) => {
        capturedRequestBody = await req.json();
        return res(
          ctx.json({
            shirt: 'Blue oxford shirt',
            trouser: 'Navy trousers',
            blazer: 'Charcoal blazer',
            shoes: 'Black loafers',
            belt: 'Black leather belt',
            reasoning: 'Completed around selected wardrobe pieces.',
            shirt_id: 11,
            trouser_id: 22,
            matching_wardrobe_items: {
              shirt: [
                {
                  id: 11,
                  category: 'shirt',
                  color: 'Blue',
                  description: 'Blue oxford shirt',
                  image_data: 'shirtImage',
                },
              ],
              trouser: [
                {
                  id: 22,
                  category: 'trouser',
                  color: 'Navy',
                  description: 'Navy trousers',
                  image_data: 'trouserImage',
                },
              ],
              blazer: [],
              shoes: [],
              belt: [],
            },
          })
        );
      })
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sends selected_wardrobe_item_ids for one selected item and shows the existing result UI', async () => {
    renderApp({ routerProps: { initialEntries: [ROUTES.WARDROBE] } });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    });
    expect(await screen.findByText('Blue oxford shirt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select at least 1 item/i })).toBeDisabled();

    fireEvent.click(await screen.findByRole('button', { name: /Add shirt to outfit completion/i }));
    fireEvent.click(screen.getByRole('button', { name: /Complete outfit with AI/i }));

    await waitFor(() => {
      expect(capturedRequestBody?.selected_wardrobe_item_ids).toEqual([11]);
      expect(capturedRequestBody).toEqual(
        expect.objectContaining({
          occasion: expect.any(String),
          season: expect.any(String),
          style: expect.any(String),
          text_input: expect.any(String),
        })
      );
    });

    await waitFor(() => {
      expect(document.getElementById('outfit-result-hero')).toBeInTheDocument();
      expect(screen.getByText('Black loafers')).toBeInTheDocument();
    });
  });

  it('sends selected_wardrobe_item_ids for two unique-slot selections and shows the existing result UI', async () => {
    renderApp({ routerProps: { initialEntries: [ROUTES.WARDROBE] } });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    });
    expect(await screen.findByText('Blue oxford shirt')).toBeInTheDocument();
    expect(screen.getByText('Navy trousers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select at least 1 item/i })).toBeDisabled();

    fireEvent.click(await screen.findByRole('button', { name: /Add shirt to outfit completion/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add trouser to outfit completion/i }));
    fireEvent.click(screen.getByRole('button', { name: /Complete outfit with AI/i }));

    await waitFor(() => {
      expect(capturedRequestBody?.selected_wardrobe_item_ids).toEqual([11, 22]);
      expect(capturedRequestBody).toEqual(
        expect.objectContaining({
          occasion: expect.any(String),
          season: expect.any(String),
          style: expect.any(String),
          text_input: expect.any(String),
        })
      );
    });

    await waitFor(() => {
      expect(document.getElementById('outfit-result-hero')).toBeInTheDocument();
      expect(screen.getByText('Black loafers')).toBeInTheDocument();
    });
  });

  it('sends selected_wardrobe_item_ids for shirt and trouser alias categories', async () => {
    server.use(
      rest.get(`${API_BASE}/api/wardrobe`, (_req, res, ctx) =>
        res(
          ctx.json({
            items: [
              {
                id: 12,
                category: 't-shirt',
                color: 'White',
                description: 'White T-shirt',
                image_data: 'tshirtImage',
                name: null,
              },
              {
                id: 34,
                category: 'polo',
                color: 'Navy',
                description: 'Navy polo',
                image_data: 'poloImage',
                name: null,
              },
              {
                id: 44,
                category: 'jeans',
                color: 'Blue',
                description: 'Blue jeans',
                image_data: 'jeansImage',
                name: null,
              },
              {
                id: 55,
                category: 'pants',
                color: 'Khaki',
                description: 'Khaki pants',
                image_data: 'pantsImage',
                name: null,
              },
            ],
            total: 4,
            limit: 10,
            offset: 0,
          })
        )
      )
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WARDROBE] } });

    expect(await screen.findByText('White T-shirt')).toBeInTheDocument();
    ['t-shirt', 'polo', 'jeans', 'pants'].forEach((category) => {
      expect(screen.getByRole('button', { name: new RegExp(`Add ${category} to outfit completion`, 'i') })).toBeEnabled();
    });
    expect(screen.queryByText('Outfit completion unavailable')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add t-shirt to outfit completion/i }));
    expect(screen.getByRole('button', { name: /Remove t-shirt from outfit completion/i }))
      .toHaveTextContent('Remove from outfit completion');
    expect(screen.getByTestId('wardrobe-selection-status')).toHaveTextContent('1 selected: shirt');

    fireEvent.click(screen.getByRole('button', { name: /Add jeans to outfit completion/i }));
    expect(screen.getByRole('button', { name: /Remove jeans from outfit completion/i }))
      .toHaveTextContent('Remove from outfit completion');
    expect(screen.getByTestId('wardrobe-selection-status')).toHaveTextContent('2 selected: shirt, trousers');

    fireEvent.click(screen.getByRole('button', { name: /Complete outfit with AI/i }));

    await waitFor(() => {
      expect(capturedRequestBody?.selected_wardrobe_item_ids).toEqual([12, 44]);
    });
  });

  it('renders Preferences on Wardrobe completion panel with filter labels', async () => {
    renderApp({ routerProps: { initialEntries: [ROUTES.WARDROBE] } });

    await waitFor(() => {
      expect(screen.getByTestId('wardrobe-completion-preferences')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Select occasion')).toBeInTheDocument();
    expect(screen.getByLabelText('Select season')).toBeInTheDocument();
    expect(screen.getByLabelText('Select style preference')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Use my wardrobe only')).toBeInTheDocument();
  });

  it('renders core filter chips and extended chips when summary includes counts', async () => {
    server.resetHandlers(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) => res(ctx.json(mockUser))),
      rest.get(`${API_BASE}/api/wardrobe/summary`, (_req, res, ctx) =>
        res(
          ctx.json({
            total_items: 5,
            by_category: { shirt: 1, polo: 1, t_shirt: 1, jeans: 1, watch: 1 },
            by_color: {},
            categories: ['shirt', 'polo', 't_shirt', 'jeans', 'watch'],
          })
        )
      ),
      rest.get(`${API_BASE}/api/wardrobe`, (_req, res, ctx) =>
        res(
          ctx.json({
            items: [
              {
                id: 11,
                category: 'shirt',
                color: 'Blue',
                description: 'Blue oxford shirt',
                image_data: 'shirtImage',
                name: null,
              },
              {
                id: 12,
                category: 'polo',
                color: 'Navy',
                description: 'Navy polo',
                image_data: 'poloImage',
                name: null,
              },
              {
                id: 13,
                category: 't_shirt',
                color: 'White',
                description: 'White tee',
                image_data: 'teeImage',
                name: null,
              },
              {
                id: 14,
                category: 'jeans',
                color: 'Blue',
                description: 'Blue jeans',
                image_data: 'jeansImage',
                name: null,
              },
              {
                id: 15,
                category: 'watch',
                color: 'Black',
                description: 'Sport watch',
                image_data: null,
                name: null,
              },
            ],
            total: 5,
            limit: 10,
            offset: 0,
          })
        )
      ),
      rest.get(`${API_BASE}/api/outfit-history`, (_req, res, ctx) => res(ctx.json([]))),
      rest.post(`${API_BASE}/api/suggest-outfit-from-wardrobe`, async (req, res, ctx) => {
        capturedRequestBody = await req.json();
        return res(
          ctx.json({
            shirt: 'Blue oxford shirt',
            trouser: 'Navy trousers',
            blazer: 'Charcoal blazer',
            shoes: 'Black loafers',
            belt: 'Black leather belt',
            reasoning: 'Completed around selected wardrobe pieces.',
          })
        );
      })
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WARDROBE] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /All \(5\)/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^Shirt\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Trousers\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Polo\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /T-shirt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Jeans\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Other\b/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Shorts\b/i })).not.toBeInTheDocument();
    expect(screen.getByText('Sport watch')).toBeInTheDocument();
  });

  it('sends updated occasion when changed in Wardrobe preferences before completing outfit', async () => {
    renderApp({ routerProps: { initialEntries: [ROUTES.WARDROBE] } });

    await waitFor(() => {
      expect(screen.getByLabelText('Select occasion')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Select occasion'), { target: { value: 'party' } });
    fireEvent.click(await screen.findByRole('button', { name: /Add shirt to outfit completion/i }));
    fireEvent.click(screen.getByRole('button', { name: /Complete outfit with AI/i }));

    await waitFor(() => {
      expect(capturedRequestBody).toEqual(
        expect.objectContaining({
          occasion: 'party',
          selected_wardrobe_item_ids: [11],
        })
      );
    });
  });

  it('shows selection summary and blocks duplicate slot selection', async () => {
    server.use(
      rest.get(`${API_BASE}/api/wardrobe`, (_req, res, ctx) =>
        res(
          ctx.json({
            items: [
              {
                id: 11,
                category: 'shirt',
                color: 'Blue',
                description: 'Blue oxford shirt',
                image_data: 'shirtImage',
                name: null,
              },
              {
                id: 12,
                category: 'polo',
                color: 'White',
                description: 'White polo',
                image_data: 'shirtImage2',
                name: null,
              },
            ],
            total: 2,
            limit: 10,
            offset: 0,
          })
        )
      )
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WARDROBE] } });

    await waitFor(() => {
      expect(screen.getByText('Blue oxford shirt')).toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole('button', { name: /Add shirt to outfit completion/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add polo to outfit completion/i }));

    expect(screen.getByText('Choose one item per outfit slot')).toBeInTheDocument();
    expect(screen.getByTestId('wardrobe-selection-status')).toHaveTextContent('1 selected: shirt');
  });
});
