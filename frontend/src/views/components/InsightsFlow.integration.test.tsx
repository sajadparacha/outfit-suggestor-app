import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import { server } from '../../test/msw/server';
import { INSIGHTS_COPY } from '../../utils/insightsCopy';
import { INSIGHTS_LIFESTYLE_STORAGE_KEY } from '../../utils/insightsLifestyle';

const API_BASE = 'http://localhost:8001';

const analyzeResponse = {
  occasion: 'Work + Everyday',
  season: 'Year-round',
  style: 'Classic',
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
    blazer: {
      category: 'blazer',
      owned_colors: [],
      owned_styles: [],
      missing_colors: ['navy'],
      missing_styles: ['tailored'],
      recommended_purchases: ['Navy blazer'],
      item_count: 0,
    },
    shoes: {
      category: 'shoes',
      owned_colors: ['brown'],
      owned_styles: ['leather'],
      missing_colors: [],
      missing_styles: [],
      recommended_purchases: [],
      item_count: 2,
    },
    belt: {
      category: 'belt',
      owned_colors: ['brown'],
      owned_styles: ['leather'],
      missing_colors: ['black'],
      missing_styles: [],
      recommended_purchases: ['Black belt'],
      item_count: 1,
    },
  },
};

async function openInsights() {
  renderApp();

  await waitFor(() => {
    expect(screen.getByRole('link', { name: 'Insights' })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('link', { name: 'Insights' }));

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /Wardrobe Insights/i })).toBeInTheDocument();
    expect(screen.getByTestId('analysis-preferences-card')).toBeInTheDocument();
  });
}

describe('Insights flow integration', () => {
  let lastAnalyzeBody: Record<string, unknown> | null = null;

  beforeEach(() => {
    lastAnalyzeBody = null;
    localStorage.setItem('auth_token', 'test-token');
    localStorage.removeItem(INSIGHTS_LIFESTYLE_STORAGE_KEY);

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
      rest.post(`${API_BASE}/api/wardrobe/analyze-gaps`, async (req, res, ctx) => {
        lastAnalyzeBody = await req.json();
        return res(ctx.status(200), ctx.json(analyzeResponse));
      })
    );
  });

  afterEach(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem(INSIGHTS_LIFESTYLE_STORAGE_KEY);
  });

  it('shows lifestyle mix chips and hides Boho as an Insights primary', async () => {
    await openInsights();

    const mix = screen.getByTestId('insights.lifestyleMix');
    expect(within(mix).getByRole('button', { name: /Work/i })).toBeInTheDocument();
    expect(within(mix).getByRole('button', { name: /^Everyday$/i })).toBeInTheDocument();
    expect(within(mix).getByRole('button', { name: /Social \/ Dinner/i })).toBeInTheDocument();
    expect(within(mix).getByRole('button', { name: /^Formal$/i })).toBeInTheDocument();
    expect(within(mix).getByRole('button', { name: /Sport \/ Outdoor/i })).toBeInTheDocument();

    const stylePrimary = screen.getByTestId('insights.stylePrimary');
    expect(within(stylePrimary).queryByText('Boho')).not.toBeInTheDocument();
    expect(screen.queryByText('Shared with Suggest')).not.toBeInTheDocument();
  });

  it('defaults to Work and Everyday and cannot select a fourth mix chip', async () => {
    await openInsights();

    const mix = screen.getByTestId('insights.lifestyleMix');
    expect(within(mix).getByRole('button', { name: /Work/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(mix).getByRole('button', { name: /^Everyday$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(mix).getByRole('button', { name: /Social \/ Dinner/i })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(within(mix).getByRole('button', { name: /Social \/ Dinner/i }));
    expect(within(mix).getByRole('button', { name: /Social \/ Dinner/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(mix).getByRole('button', { name: /^Formal$/i }));
    fireEvent.click(within(mix).getByRole('button', { name: /Sport \/ Outdoor/i }));

    expect(within(mix).getByRole('button', { name: /^Formal$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(within(mix).getByRole('button', { name: /Sport \/ Outdoor/i })).toHaveAttribute('aria-pressed', 'false');
    expect(within(mix).getByRole('button', { name: /Work/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(mix).getByRole('button', { name: /^Everyday$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(mix).getByRole('button', { name: /Social \/ Dinner/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens insights, runs free analysis, and renders redesigned results', async () => {
    await openInsights();

    expect(screen.getByText(/AI-powered analysis of your wardrobe/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Analyze My Wardrobe/i }));

    await waitFor(() => {
      expect(screen.getByText(INSIGHTS_COPY.MODE_PICKER_TITLE)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(INSIGHTS_COPY.QUICK_WARDROBE_CHECK, 'i') }));

    await waitFor(() => {
      expect(lastAnalyzeBody).not.toBeNull();
    });

    expect(lastAnalyzeBody?.lifestyle_mix).toEqual(['work', 'everyday']);
    expect(lastAnalyzeBody?.primary_lifestyle).toBe('work');
    expect(lastAnalyzeBody?.dress_code).toEqual(['smart-casual']);
    expect(lastAnalyzeBody?.style_primary).toEqual(['classic']);

    await waitFor(() => {
      expect(screen.getByText(/You should add brighter shirts/i)).toBeInTheDocument();
      expect(screen.getByTestId('analysis-context-bar')).toBeInTheDocument();
      expect(screen.getByTestId('insight-summary-card')).toBeInTheDocument();
      expect(screen.getByText('Top items to add')).toBeInTheDocument();
      expect(screen.getByText('Wardrobe coverage')).toBeInTheDocument();
      expect(screen.getByText('Detailed category analysis')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Generate outfits using these gaps/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Create outfits/i })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Shop similar/i }).length).toBeGreaterThan(0);
    });

    expect(screen.queryByTestId('admin-diagnostics')).not.toBeInTheDocument();
  });

  it('expands preferences from context bar', async () => {
    await openInsights();
    fireEvent.click(screen.getByRole('button', { name: /Analyze My Wardrobe/i }));

    await waitFor(() => {
      expect(screen.getByText(INSIGHTS_COPY.MODE_PICKER_TITLE)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(INSIGHTS_COPY.QUICK_WARDROBE_CHECK, 'i') }));

    await waitFor(() => {
      expect(screen.getByTestId('analysis-context-bar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Change preferences/i }));

    expect(screen.getByTestId('analysis-preferences-card')).toBeInTheDocument();
  });

  it('multi-selects dress code, climate, style, and accent, then POSTs arrays', async () => {
    await openInsights();

    const dress = screen.getByTestId('insights.dressCode');
    const smartCasual = within(dress).getByRole('button', { name: /Smart casual/i });
    expect(smartCasual).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(smartCasual);
    expect(smartCasual).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(dress).getByRole('button', { name: /^Casual$/i }));
    expect(within(dress).getByRole('button', { name: /^Casual$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(smartCasual).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(dress).getByRole('button', { name: /^Casual$/i }));
    expect(within(dress).getByRole('button', { name: /^Casual$/i })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(smartCasual);
    expect(smartCasual).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(dress).getByRole('button', { name: /^Casual$/i }));
    expect(within(dress).getByRole('button', { name: /^Casual$/i })).toHaveAttribute('aria-pressed', 'true');

    const season = screen.getByTestId('insights.seasonCore');
    const yearRound = within(season).getByRole('button', { name: /Year-round/i });
    expect(yearRound).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(yearRound);
    expect(yearRound).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(season).getByRole('button', { name: /^Hot$/i }));
    fireEvent.click(within(season).getByRole('button', { name: /^Cold$/i }));
    expect(yearRound).toHaveAttribute('aria-pressed', 'true');
    expect(within(season).getByRole('button', { name: /^Hot$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(season).getByRole('button', { name: /^Cold$/i })).toHaveAttribute('aria-pressed', 'true');

    const stylePrimary = screen.getByTestId('insights.stylePrimary');
    expect(within(stylePrimary).getByRole('button', { name: /Classic, Primary/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(within(stylePrimary).getByRole('button', { name: /^Preppy$/i }));
    expect(within(stylePrimary).getByRole('button', { name: /^Preppy$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(stylePrimary).getByRole('button', { name: /Classic, Primary/i })).toBeInTheDocument();

    fireEvent.click(within(stylePrimary).getByRole('button', { name: /^Preppy$/i }));
    expect(within(stylePrimary).getByRole('button', { name: /Preppy, Primary/i })).toBeInTheDocument();
    expect(within(stylePrimary).getByRole('button', { name: /^Classic$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const accent = screen.getByTestId('insights.styleAccent');
    expect(within(accent).getByRole('button', { name: /^None$/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(accent).getByRole('button', { name: /^Vintage$/i }));
    expect(within(accent).getByRole('button', { name: /^Vintage$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(accent).getByRole('button', { name: /^None$/i })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(within(accent).getByRole('button', { name: /^None$/i }));
    expect(within(accent).getByRole('button', { name: /^None$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(accent).getByRole('button', { name: /^Vintage$/i })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(within(accent).getByRole('button', { name: /^Vintage$/i }));
    expect(within(accent).getByRole('button', { name: /^None$/i })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: /Analyze My Wardrobe/i }));

    await waitFor(() => {
      expect(screen.getByText(INSIGHTS_COPY.MODE_PICKER_TITLE)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(INSIGHTS_COPY.QUICK_WARDROBE_CHECK, 'i') }));

    await waitFor(() => {
      expect(lastAnalyzeBody).not.toBeNull();
    });

    expect(lastAnalyzeBody?.dress_code).toEqual(['smart-casual', 'casual']);
    expect(lastAnalyzeBody?.climate).toEqual(['hot', 'cold']);
    expect(lastAnalyzeBody?.style_primary).toEqual(['preppy', 'classic']);
    expect(lastAnalyzeBody?.style_accent).toEqual(['vintage']);
  });
});
