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

  it('sends selected_wardrobe_item_ids for two unique-slot selections and shows the existing result UI', async () => {
    renderApp({ routerProps: { initialEntries: [ROUTES.WARDROBE] } });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    });
    expect(await screen.findByText('Blue oxford shirt')).toBeInTheDocument();
    expect(screen.getByText('Navy trousers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select at least 2 items/i })).toBeDisabled();

    fireEvent.click(await screen.findByRole('button', { name: /Select shirt for outfit completion/i }));
    fireEvent.click(screen.getByRole('button', { name: /Select trouser for outfit completion/i }));
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
});
