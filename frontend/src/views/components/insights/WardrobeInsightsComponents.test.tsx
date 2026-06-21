import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { WardrobeGapAnalysisResponse } from '../../../models/WardrobeModels';
import { buildShoppingListRows } from '../../../utils/insightsHelpers';
import { normalizeWardrobeInsight } from '../../../utils/normalizeWardrobeInsight';
import AdminDebugPanel from './AdminDebugPanel';
import CategoryDetailAccordion from './CategoryDetailAccordion';
import InsightSummaryCard from './InsightSummaryCard';
import MissingItemCard from './MissingItemCard';
import ShoppingListPanel from './ShoppingListPanel';
import WardrobeCoverageDashboard from './WardrobeCoverageDashboard';
import WardrobeInsightsPage from './WardrobeInsightsPage';
import { DEFAULT_FILTERS } from '../../../utils/outfitPreferences';

const sampleResponse: WardrobeGapAnalysisResponse = {
  occasion: 'business',
  season: 'winter',
  style: 'classic',
  overall_summary: 'Best next purchases are in blazer and shoes.',
  analysis_by_category: {
    shirt: {
      category: 'shirt',
      owned_colors: ['white', 'blue'],
      owned_styles: ['oxford', 'smart casual'],
      missing_colors: ['black'],
      missing_styles: ['linen'],
      recommended_purchases: ['Add a black shirt for better office coverage.'],
      item_count: 2,
    },
    trouser: {
      category: 'trouser',
      owned_colors: ['gray'],
      owned_styles: ['chino'],
      missing_colors: ['navy'],
      missing_styles: ['tailored'],
      recommended_purchases: ['Navy trousers'],
      item_count: 1,
    },
    blazer: {
      category: 'blazer',
      owned_colors: [],
      owned_styles: [],
      missing_colors: ['navy'],
      missing_styles: ['unstructured'],
      recommended_purchases: ['Navy blazer'],
      item_count: 0,
    },
    shoes: {
      category: 'shoes',
      owned_colors: ['brown'],
      owned_styles: ['loafers'],
      missing_colors: ['black'],
      missing_styles: ['derby shoes'],
      recommended_purchases: ['Black oxford shoes'],
      item_count: 1,
    },
    belt: {
      category: 'belt',
      owned_colors: ['brown'],
      owned_styles: ['leather'],
      missing_colors: [],
      missing_styles: [],
      recommended_purchases: [],
      item_count: 1,
    },
  },
};

const insight = normalizeWardrobeInsight(sampleResponse);

describe('InsightSummaryCard', () => {
  it('renders score, label, summary, and priorities without generate CTA', () => {
    render(<InsightSummaryCard score={insight.score} topPriorities={insight.topPriorities} />);

    expect(screen.getByTestId('score-value')).toHaveTextContent(String(insight.score.value));
    expect(screen.getByTestId('score-label')).toHaveTextContent(insight.score.label);
    expect(screen.getByTestId('score-summary')).toHaveTextContent(/Best next purchases/i);
    expect(screen.getByTestId('top-priorities-list')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Generate outfits using these gaps/i })).not.toBeInTheDocument();
  });
});

describe('MissingItemCard', () => {
  const missingItem = insight.missingItems[0];

  it('renders Shop similar without Create outfits CTA', () => {
    render(<MissingItemCard item={missingItem} styleContext="classic" />);

    expect(screen.getByRole('button', { name: /Shop similar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create outfits/i })).not.toBeInTheDocument();
  });

  it('renders best color chips with rounded-lg styling', () => {
    render(<MissingItemCard item={missingItem} styleContext="classic" />);

    const colorChips = screen.getAllByTestId('insight-color-chip');
    expect(colorChips.length).toBe(missingItem.bestColors.length);
    colorChips.forEach((chip) => {
      expect(chip.className).toMatch(/rounded-lg/);
      expect(chip.className).not.toMatch(/rounded-full/);
    });
  });

  it('renders Styles To Try as individual style chips', () => {
    render(<MissingItemCard item={missingItem} styleContext="classic" />);

    expect(screen.getByText('Styles To Try')).toBeInTheDocument();
    expect(screen.queryByText('Works with')).not.toBeInTheDocument();

    const styleChips = screen.getAllByTestId('insight-style-chip');
    expect(styleChips.length).toBe(missingItem.worksWith.length);
    missingItem.worksWith.forEach((style) => {
      expect(screen.getByText(style)).toBeInTheDocument();
    });
    expect(screen.getByTestId('styles-to-try').textContent).not.toMatch(/, /);
  });

  it('opens Google Shopping when a best color is clicked', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(<MissingItemCard item={missingItem} styleContext="classic" />);

    const colorButtons = screen.getAllByTestId('insight-color-chip');
    fireEvent.click(colorButtons[0]);

    expect(openSpy).toHaveBeenCalled();
    const url = String(openSpy.mock.calls[0][0]);
    expect(url).toContain('tbm=shop');
    const decoded = decodeURIComponent(url);
    expect(decoded).toMatch(new RegExp(missingItem.bestColors[0], 'i'));
    missingItem.worksWith.forEach((style) => {
      expect(decoded).toMatch(new RegExp(style, 'i'));
    });
    expect(decoded).not.toMatch(/classic style/i);

    openSpy.mockRestore();
  });
});

describe('WardrobeCoverageDashboard', () => {
  it('renders all category status cards', () => {
    render(<WardrobeCoverageDashboard categories={insight.categoryHealth} />);

    expect(screen.getByTestId('wardrobe-coverage-dashboard')).toBeInTheDocument();
    insight.categoryHealth.forEach((item) => {
      expect(screen.getByText(item.category)).toBeInTheDocument();
      expect(screen.getAllByText(item.status).length).toBeGreaterThan(0);
    });
  });
});

describe('CategoryDetailAccordion', () => {
  it('keeps categories collapsed by default and expands on click', () => {
    render(
      <CategoryDetailAccordion categories={insight.categoryHealth} styleContext="classic" />
    );

    const firstId = insight.categoryHealth[0].id;
    expect(screen.queryByTestId(`category-details-${firstId}`)).not.toBeInTheDocument();

    const row = screen.getByTestId(`category-row-${firstId}`);
    fireEvent.click(row.querySelector('button') as HTMLButtonElement);

    expect(screen.getByTestId(`category-details-${firstId}`)).toBeInTheDocument();
  });

  it('shows owned and missing stats for shirt category when expanded', () => {
    render(
      <CategoryDetailAccordion categories={insight.categoryHealth} styleContext="classic" />
    );

    const shirtRow = screen.getByTestId('category-row-shirt');
    fireEvent.click(shirtRow.querySelector('button') as HTMLButtonElement);

    const stats = screen.getByTestId('category-owned-missing-shirt');
    expect(stats).toHaveTextContent(/Owned:/i);
    expect(stats).toHaveTextContent(/Missing:/i);
    expect(stats).toHaveTextContent(/2 colors, 2 styles/);
    expect(stats).toHaveTextContent(/1 colors, 1 styles/);
  });

  it('shows owned and missing color and style chips when shirt row is expanded', () => {
    render(
      <CategoryDetailAccordion categories={insight.categoryHealth} styleContext="classic" />
    );

    const shirt = insight.categoryHealth.find((c) => c.id === 'shirt');
    expect(shirt).toBeDefined();

    fireEvent.click(screen.getByTestId('category-row-shirt').querySelector('button') as HTMLButtonElement);

    expect(screen.getByTestId('category-owned-colors-shirt')).toBeInTheDocument();
    expect(screen.getByTestId('category-missing-colors-shirt')).toBeInTheDocument();
    expect(screen.getByTestId('category-owned-styles-shirt')).toBeInTheDocument();
    expect(screen.getByTestId('category-missing-styles-shirt')).toBeInTheDocument();

    const ownedColorsSection = screen.getByTestId('category-owned-colors-shirt');
    const missingColorsSection = screen.getByTestId('category-missing-colors-shirt');
    const ownedStylesSection = screen.getByTestId('category-owned-styles-shirt');
    const missingStylesSection = screen.getByTestId('category-missing-styles-shirt');

    shirt!.ownedColors.forEach((color) => {
      expect(ownedColorsSection).toHaveTextContent(new RegExp(color, 'i'));
    });
    shirt!.missingColors.forEach((color) => {
      expect(missingColorsSection).toHaveTextContent(new RegExp(color, 'i'));
    });
    shirt!.ownedStyles.forEach((style) => {
      expect(ownedStylesSection).toHaveTextContent(new RegExp(style, 'i'));
    });
    shirt!.missingStyles.forEach((style) => {
      expect(missingStylesSection).toHaveTextContent(new RegExp(style, 'i'));
    });

    const ownedColorChips = screen
      .getByTestId('category-owned-colors-shirt')
      .querySelectorAll('[data-testid="insight-color-chip"]');
    ownedColorChips.forEach((chip) => {
      expect(chip.tagName).toBe('SPAN');
    });

    const missingColorChips = screen
      .getByTestId('category-missing-colors-shirt')
      .querySelectorAll('[data-testid="insight-color-chip"]');
    expect(missingColorChips.length).toBe(shirt!.missingColors.length);
    missingColorChips.forEach((chip) => {
      expect(chip.tagName).toBe('BUTTON');
    });
  });

  it('opens Google Shopping with category, color, and missing styles when a missing color chip is clicked', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const shirt = insight.categoryHealth.find((c) => c.id === 'shirt');
    expect(shirt).toBeDefined();

    render(
      <CategoryDetailAccordion categories={insight.categoryHealth} styleContext="classic" />
    );

    fireEvent.click(screen.getByTestId('category-row-shirt').querySelector('button') as HTMLButtonElement);

    const missingSection = screen.getByTestId('category-missing-colors-shirt');
    const missingButton = missingSection.querySelector('button[data-testid="insight-color-chip"]') as HTMLButtonElement;
    fireEvent.click(missingButton);

    expect(openSpy).toHaveBeenCalled();
    const url = decodeURIComponent(String(openSpy.mock.calls[0][0]));
    expect(url).toContain('tbm=shop');
    expect(url).toMatch(/shirts/i);
    expect(url).toMatch(new RegExp(shirt!.missingColors[0], 'i'));
    shirt!.missingStyles.forEach((style) => {
      expect(url).toMatch(new RegExp(style, 'i'));
    });
    expect(url).not.toMatch(/classic style/i);

    openSpy.mockRestore();
  });
});

describe('AdminDebugPanel', () => {
  it('renders cost and prompt/response for admin', () => {
    render(
      <AdminDebugPanel
        admin={{
          aiPrompt: 'admin-prompt',
          aiRawResponse: '{"analysis":"admin"}',
          cost: { gpt4_cost: 0.0123, total_cost: 0.0123, input_tokens: 10, output_tokens: 20 },
        }}
      />
    );

    expect(screen.getByTestId('admin-diagnostics')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-cost')).toHaveTextContent(/\$0\.012/);
    expect(screen.getByTestId('input-prompt')).toHaveTextContent('admin-prompt');
    expect(screen.getByTestId('ai-response')).toHaveTextContent('admin');
  });
});

describe('WardrobeInsightsPage admin gating', () => {
  const pageProps = {
    filters: DEFAULT_FILTERS,
    setFilters: jest.fn(),
    preferenceText: '',
    setPreferenceText: jest.fn(),
    onAnalyze: jest.fn(),
    onNavigateToGuide: jest.fn(),
    onNavigateToWardrobe: jest.fn(),
    loading: false,
    error: null,
  };

  it('hides admin debug for non-admin users', () => {
    render(
      <WardrobeInsightsPage
        {...pageProps}
        result={{
          ...sampleResponse,
          ai_prompt: 'hidden',
          ai_raw_response: 'hidden',
          cost: { gpt4_cost: 0.01, total_cost: 0.01 },
        }}
        isAdmin={false}
      />
    );

    expect(screen.queryByTestId('admin-diagnostics')).not.toBeInTheDocument();
  });

  it('shows admin debug only when admin flag is true', () => {
    render(
      <WardrobeInsightsPage
        {...pageProps}
        result={{
          ...sampleResponse,
          ai_prompt: 'visible-prompt',
          ai_raw_response: '{"visible":true}',
          cost: { gpt4_cost: 0.01, total_cost: 0.01 },
        }}
        isAdmin={true}
      />
    );

    expect(screen.getByTestId('admin-diagnostics')).toBeInTheDocument();
    expect(screen.getByTestId('input-prompt')).toHaveTextContent('visible-prompt');
  });
});

describe('WardrobeInsightsPage layout states', () => {
  it('shows full preferences before analysis', () => {
    render(
      <WardrobeInsightsPage
        filters={DEFAULT_FILTERS}
        setFilters={jest.fn()}
        preferenceText=""
        setPreferenceText={jest.fn()}
        onAnalyze={jest.fn()}
        onNavigateToGuide={jest.fn()}
        onNavigateToWardrobe={jest.fn()}
        result={null}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('analysis-preferences-card')).toBeInTheDocument();
    expect(screen.queryByTestId('analysis-context-bar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Shopping list/i })).not.toBeInTheDocument();
  });

  it('collapses preferences into context bar after analysis', () => {
    render(
      <WardrobeInsightsPage
        filters={DEFAULT_FILTERS}
        setFilters={jest.fn()}
        preferenceText=""
        setPreferenceText={jest.fn()}
        onAnalyze={jest.fn()}
        onNavigateToGuide={jest.fn()}
        onNavigateToWardrobe={jest.fn()}
        result={sampleResponse}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('analysis-context-bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change preferences/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shopping list/i })).toBeInTheDocument();
    expect(screen.queryByTestId('analysis-preferences-card')).not.toBeInTheDocument();
  });

  it('shows the shopping-list table expanded by default with Buy, Look for, and Search online columns', () => {
    render(
      <WardrobeInsightsPage
        filters={DEFAULT_FILTERS}
        setFilters={jest.fn()}
        preferenceText=""
        setPreferenceText={jest.fn()}
        onAnalyze={jest.fn()}
        onNavigateToGuide={jest.fn()}
        onNavigateToWardrobe={jest.fn()}
        result={sampleResponse}
        loading={false}
        error={null}
      />
    );

    const panel = within(screen.getByTestId('insights-shopping-list'));
    const expectedRows = buildShoppingListRows(insight.missingItems);
    expect(panel.getByRole('columnheader', { name: 'Buy' })).toBeInTheDocument();
    expect(panel.getByRole('columnheader', { name: 'Look for' })).toBeInTheDocument();
    expect(panel.getByRole('columnheader', { name: 'Search online' })).toBeInTheDocument();
    expect(panel.getByText(expectedRows[0].cleanLabel)).toBeInTheDocument();
    expect(panel.getByTestId(`shopping-list-look-for-${expectedRows[0].id}`)).toHaveTextContent(
      expectedRows[0].lookForText
    );
    expect(panel.getByTestId(`shopping-list-priority-${expectedRows[0].id}`)).toHaveTextContent(
      expectedRows[0].priority
    );
    expect(panel.getByTestId('shopping-list-progress')).toHaveTextContent(
      `Progress: 0 / ${expectedRows.length} bought`
    );
  });

  it('shows full tuple detail behind See all options for long shopping-list rows', () => {
    const longTupleItem = {
      id: 'long-tuple-shirt',
      name: 'shirt',
      category: 'shirt',
      priority: 'High' as const,
      reason: 'Needs many style and color options.',
      bestColors: Array.from({ length: 14 }, (_, index) => `color ${index + 1}`),
      worksWith: Array.from({ length: 18 }, (_, index) => `style ${index + 1}`),
    };
    const expectedRow = buildShoppingListRows([longTupleItem])[0];

    render(
      <ShoppingListPanel
        items={[longTupleItem]}
        context={{ occasion: 'business', season: 'winter', style: 'classic' }}
      />
    );

    expect(screen.getByTestId(`shopping-list-look-for-${longTupleItem.id}`)).toHaveTextContent(
      expectedRow.lookForText
    );
    fireEvent.click(screen.getByTestId(`shopping-list-toggle-options-${longTupleItem.id}`));
    const tupleDisplay = screen.getByTestId(`shopping-list-tuple-${longTupleItem.id}`);
    expect(tupleDisplay).toHaveTextContent('(Style 1, Color 1)');
    expect(tupleDisplay.textContent).toContain('(Style 18, Color 14)');
  });

  it('opens Google Shopping for a combo chip and search-all action', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <WardrobeInsightsPage
        filters={DEFAULT_FILTERS}
        setFilters={jest.fn()}
        preferenceText=""
        setPreferenceText={jest.fn()}
        onAnalyze={jest.fn()}
        onNavigateToGuide={jest.fn()}
        onNavigateToWardrobe={jest.fn()}
        result={sampleResponse}
        loading={false}
        error={null}
      />
    );

    const rows = buildShoppingListRows(insight.missingItems);
    const firstRow = rows[0];
    fireEvent.click(screen.getByTestId(`shopping-list-search-all-${firstRow.id}`));

    expect(openSpy).toHaveBeenCalledWith(firstRow.searchAllUrl, '_blank', 'noopener,noreferrer');
    expect(decodeURIComponent(String(openSpy.mock.calls[0][0]))).toContain('tbm=shop');

    openSpy.mockRestore();
  });

  it('exports the shopping list to WhatsApp with numbered text and no raw tuples', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <WardrobeInsightsPage
        filters={DEFAULT_FILTERS}
        setFilters={jest.fn()}
        preferenceText=""
        setPreferenceText={jest.fn()}
        onAnalyze={jest.fn()}
        onNavigateToGuide={jest.fn()}
        onNavigateToWardrobe={jest.fn()}
        result={sampleResponse}
        loading={false}
        error={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Export to WhatsApp/i }));

    expect(openSpy).toHaveBeenCalled();
    const url = String(openSpy.mock.calls[0][0]);
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('ClosIQ Shopping List');
    expect(decoded).toContain('1.');
    expect(decoded).not.toContain('(Oxford, Olive)');

    openSpy.mockRestore();
  });

  it('copies the shopping list to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <ShoppingListPanel items={insight.missingItems} context={insight.context} />
    );

    fireEvent.click(screen.getByTestId('shopping-list-copy-button'));

    await screen.findByTestId('shopping-list-copy-feedback');
    expect(writeText).toHaveBeenCalled();
    expect(String(writeText.mock.calls[0][0])).toContain('ClosIQ Shopping List');
    expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
  });

  it('updates progress when checklist items are marked bought', () => {
    render(
      <ShoppingListPanel items={insight.missingItems.slice(0, 2)} context={insight.context} />
    );

    const rows = buildShoppingListRows(insight.missingItems.slice(0, 2));
    fireEvent.click(screen.getByTestId(`shopping-list-check-${rows[0].id}`));

    expect(screen.getByTestId('shopping-list-progress')).toHaveTextContent('Progress: 1 / 2 bought');
  });

  it('uses the browser print path for PDF export', () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => undefined);
    render(
      <WardrobeInsightsPage
        filters={DEFAULT_FILTERS}
        setFilters={jest.fn()}
        preferenceText=""
        setPreferenceText={jest.fn()}
        onAnalyze={jest.fn()}
        onNavigateToGuide={jest.fn()}
        onNavigateToWardrobe={jest.fn()}
        result={sampleResponse}
        loading={false}
        error={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Export as PDF/i }));

    expect(printSpy).toHaveBeenCalled();
    expect(screen.getByTestId('shopping-list-print')).toBeInTheDocument();

    printSpy.mockRestore();
  });
});
