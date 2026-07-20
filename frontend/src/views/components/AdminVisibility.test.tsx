/**
 * Admin UX gating — non-admins must not see admin surfaces.
 */
import { fireEvent, screen, waitFor, render as renderComponent } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import { server } from '../../test/msw/server';
import { ROUTES } from '../../navigation/routes';
import UserGuide from './UserGuide';
import Sidebar from './Sidebar';
import WardrobeInsightsPage from './insights/WardrobeInsightsPage';
import { DEFAULT_FILTERS } from '../../utils/outfitPreferences';
import { INSIGHTS_COPY } from '../../utils/insightsCopy';

const API_BASE = 'http://localhost:8001';

const nonAdminUser = {
  id: 1,
  email: 'user@example.com',
  full_name: 'Regular User',
  is_active: true,
  is_admin: false,
  created_at: '2026-01-01T00:00:00Z',
};

const premiumAnalysisPayload = {
  occasion: 'casual',
  season: 'all',
  style: 'modern',
  analysis_mode: 'premium',
  overall_summary: 'Premium wardrobe analysis completed.',
  ai_prompt: 'hidden-prompt',
  ai_raw_response: '{"analysis":"hidden-response"}',
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
  },
};

function mockNonAdminAuth() {
  server.use(
    rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) => {
      return res(ctx.status(200), ctx.json(nonAdminUser));
    })
  );
}

describe('Admin visibility gating', () => {
  describe('Sidebar (unit)', () => {
    const sidebarProps = {
      filters: { occasion: 'casual', season: 'all', style: 'modern' },
      setFilters: jest.fn(),
      preferenceText: '',
      setPreferenceText: jest.fn(),
      image: null,
      setImage: jest.fn(),
      onGetSuggestion: jest.fn(),
      loading: false,
      generateModelImage: false,
      setGenerateModelImage: jest.fn(),
      imageModel: 'dalle3',
      setImageModel: jest.fn(),
      modelGenerationEnabled: false,
      isAuthenticated: true,
      isAdmin: false,
      showAiPromptResponse: false,
      setShowAiPromptResponse: jest.fn(),
    };

    it('hides Advanced options and model preview controls for non-admins', () => {
      renderComponent(<Sidebar {...sidebarProps} modelGenerationEnabled />);

      expect(screen.queryByText(/Advanced options/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Include AI model preview/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Show AI Prompt/i)).not.toBeInTheDocument();
    });
  });

  describe('UserGuide (unit)', () => {
    it('hides admin how-to content for non-admins', () => {
      renderComponent(<UserGuide isAdmin={false} />);

      expect(screen.queryByText(/Show AI Prompt & Response/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Admin users:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Reports$/)).not.toBeInTheDocument();
    });

    it('shows admin how-to content for admins', () => {
      renderComponent(<UserGuide isAdmin={true} />);

      // Guide mentions this toggle in more than one admin tip (Suggest + Week Planner).
      expect(screen.getAllByText(/Show AI Prompt & Response/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Admin users:/i)).toBeInTheDocument();
      expect(screen.getByText(/^Reports$/)).toBeInTheDocument();
    });
  });

  describe('WardrobeInsightsPage (unit)', () => {
    it('does not render admin diagnostics for non-admins even with premium metadata', () => {
      renderComponent(
        <WardrobeInsightsPage
          result={premiumAnalysisPayload as any}
          loading={false}
          error={null}
          isAdmin={false}
          filters={DEFAULT_FILTERS}
          setFilters={() => undefined}
          preferenceText=""
          setPreferenceText={() => undefined}
          onAnalyze={() => undefined}
          onNavigateToGuide={() => undefined}
          onNavigateToWardrobe={() => undefined}
        />
      );

      expect(screen.queryByTestId('admin-diagnostics')).not.toBeInTheDocument();
      expect(screen.queryByText(/Admin diagnostics/i)).not.toBeInTheDocument();
    });
  });

  describe('App integration (non-admin)', () => {
    beforeEach(() => {
      localStorage.setItem('auth_token', 'non-admin-token');
      mockNonAdminAuth();
    });

    afterEach(() => {
      localStorage.removeItem('auth_token');
    });

    it('hides sidebar admin controls on main route even with ?modelGeneration=true', async () => {
      renderApp({
        routerProps: { initialEntries: ['/?modelGeneration=true'] },
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
      });

      expect(screen.queryByText(/Advanced options/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Include AI model preview/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Reports/i })).not.toBeInTheDocument();
    });

    it('redirects non-admin from /admin/reports to main suggest route', async () => {
      renderApp({
        routerProps: { initialEntries: [ROUTES.ADMIN_REPORTS] },
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
      });

      expect(screen.queryByText(/Admin privileges are required/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Reports/i })).not.toBeInTheDocument();
    });

    it('redirects non-admin from /admin/integration-tests to main suggest route', async () => {
      renderApp({
        routerProps: { initialEntries: [ROUTES.ADMIN_INTEGRATION_TESTS] },
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
      });

      expect(screen.queryByText(/Admin privileges are required/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Integration Tests/i })).not.toBeInTheDocument();
    });

    it('hides admin diagnostics after premium insights analysis for non-admin', async () => {
      server.use(
        rest.post(`${API_BASE}/api/wardrobe/analyze-gaps`, (_req, res, ctx) => {
          return res(ctx.status(200), ctx.json(premiumAnalysisPayload));
        })
      );

      renderApp();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Insights' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('link', { name: 'Insights' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Wardrobe Insights/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Analyze My Wardrobe/i }));

      await waitFor(() => {
        expect(screen.getByText(INSIGHTS_COPY.MODE_PICKER_TITLE)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: new RegExp(INSIGHTS_COPY.AI_STYLIST_REVIEW, 'i') }));

      await waitFor(() => {
        expect(screen.getByText(/Premium wardrobe analysis completed/i)).toBeInTheDocument();
      });

      expect(screen.queryByTestId('admin-diagnostics')).not.toBeInTheDocument();
      expect(screen.queryByText(/Admin diagnostics/i)).not.toBeInTheDocument();
    });

    it('hides admin guide content when navigating to /guide as non-admin', async () => {
      renderApp({
        routerProps: { initialEntries: [ROUTES.GUIDE] },
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /How to use/i })).toBeInTheDocument();
      });

      expect(screen.queryByText(/Show AI Prompt & Response/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Admin users:/i)).not.toBeInTheDocument();
    });
  });
});
