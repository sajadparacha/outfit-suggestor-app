import { fireEvent, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import { server } from '../../test/msw/server';
import { INSIGHTS_COPY } from '../../utils/insightsCopy';

const API_BASE = 'http://localhost:8001';

describe('Insights flow integration', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token');

    server.use(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            id: 1,
            email: 'tester@example.com',
            full_name: 'Test User',
            is_admin: false,
          })
        );
      }),
      rest.post(`${API_BASE}/api/wardrobe/analyze-gaps`, (_req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            occasion: 'casual',
            season: 'all',
            style: 'modern',
            analysis_mode: 'free',
            overall_summary: 'You should add brighter shirts and lightweight trousers.',
            analysis_by_category: {
              shirt: {
                category: 'shirt',
                owned_colors: ['white'],
                owned_styles: ['solid'],
                missing_colors: ['pastel pink', 'mint green'],
                missing_styles: ['linen'],
                recommended_purchases: ['Pastel pink linen shirt'],
                item_count: 1,
              },
              trouser: {
                category: 'trouser',
                owned_colors: ['navy blue'],
                owned_styles: ['chino'],
                missing_colors: ['light gray'],
                missing_styles: ['linen'],
                recommended_purchases: ['Light gray linen trousers'],
                item_count: 1,
              },
            },
          })
        );
      })
    );
  });

  afterEach(() => {
    localStorage.removeItem('auth_token');
  });

  it('opens insights, runs free analysis, and renders snapshot metrics', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Insights' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('link', { name: 'Insights' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wardrobe Insights/i })).toBeInTheDocument();
      expect(screen.getByText(/Analysis Preferences/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Analyze My Wardrobe/i }));

    await waitFor(() => {
      expect(screen.getByText(INSIGHTS_COPY.MODE_PICKER_TITLE)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(INSIGHTS_COPY.QUICK_WARDROBE_CHECK, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(/You should add brighter shirts/i)).toBeInTheDocument();
      expect(screen.getByText(INSIGHTS_COPY.CATEGORIES_CHECKED)).toBeInTheDocument();
      expect(screen.getByText(INSIGHTS_COPY.BEST_CATEGORY_TO_SHOP_NEXT)).toBeInTheDocument();
      expect(screen.getByText(INSIGHTS_COPY.WHATS_MISSING_TITLE)).toBeInTheDocument();
      expect(screen.getAllByText(/Shirt/i).length).toBeGreaterThan(0);
    });
  });
});
