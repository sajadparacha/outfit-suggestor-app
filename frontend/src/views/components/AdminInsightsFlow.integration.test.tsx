import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import App from '../../App';
import { server } from '../../test/msw/server';

const API_BASE = 'http://localhost:8001';

const premiumAnalysisPayload = {
  occasion: 'casual',
  season: 'all',
  style: 'modern',
  analysis_mode: 'premium',
  overall_summary: 'Premium wardrobe analysis completed.',
  ai_prompt: 'ui-test-premium-prompt',
  ai_raw_response: '{"analysis":"ui-test-premium-response"}',
  cost: {
    gpt4_cost: 0.0123,
    total_cost: 0.0123,
    input_tokens: 120,
    output_tokens: 220,
  },
  analysis_by_category: {
    shirt: {
      category: 'shirt',
      owned_colors: ['white'],
      owned_styles: ['solid'],
      missing_colors: ['navy'],
      missing_styles: ['linen'],
      recommended_purchases: ['Navy linen shirt'],
      item_count: 1,
    },
    trouser: {
      category: 'trouser',
      owned_colors: ['gray'],
      owned_styles: ['chino'],
      missing_colors: ['olive'],
      missing_styles: ['linen'],
      recommended_purchases: ['Olive linen trousers'],
      item_count: 1,
    },
  },
};

describe('Admin insights flow integration', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'admin-test-token');

    server.use(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            id: 1,
            email: 'admin@example.com',
            full_name: 'Admin User',
            is_active: true,
            is_admin: true,
            created_at: '2026-01-01T00:00:00Z',
          })
        );
      }),
      rest.post(`${API_BASE}/api/wardrobe/analyze-gaps`, (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json(premiumAnalysisPayload));
      })
    );
  });

  afterEach(() => {
    localStorage.removeItem('auth_token');
  });

  it('shows admin cost, input prompt, and AI response after premium wardrobe analysis', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Insights' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Insights' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wardrobe Insights/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Analyze My Wardrobe/i }));

    await waitFor(() => {
      expect(screen.getByText(/Choose Analysis Mode/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Premium Analysis/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/Premium wardrobe analysis completed/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    expect(screen.getByTestId('admin-diagnostics')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-cost')).toBeInTheDocument();
    expect(screen.getByTestId('input-prompt')).toHaveTextContent('ui-test-premium-prompt');
    expect(screen.getByTestId('ai-response')).toHaveTextContent('ui-test-premium-response');
    expect(screen.getByTestId('analysis-cost')).toHaveTextContent(/\$0\.012/);
  });
});
