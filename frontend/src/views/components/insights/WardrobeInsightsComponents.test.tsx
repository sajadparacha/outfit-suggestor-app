import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WardrobeGapAnalysisResponse } from '../../../models/WardrobeModels';
import { normalizeWardrobeInsight } from '../../../utils/normalizeWardrobeInsight';
import AdminDebugPanel from './AdminDebugPanel';
import CategoryDetailAccordion from './CategoryDetailAccordion';
import InsightSummaryCard from './InsightSummaryCard';
import MissingItemCard from './MissingItemCard';
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

  it('renders view shopping list toggle when callback provided', () => {
    const onViewShoppingList = jest.fn();
    const { rerender } = render(
      <InsightSummaryCard
        score={insight.score}
        topPriorities={insight.topPriorities}
        showShoppingList={false}
        onViewShoppingList={onViewShoppingList}
      />
    );

    const button = screen.getByTestId('view-shopping-list');
    expect(button).toHaveTextContent('View shopping list');

    fireEvent.click(button);
    expect(onViewShoppingList).toHaveBeenCalledTimes(1);

    rerender(
      <InsightSummaryCard
        score={insight.score}
        topPriorities={insight.topPriorities}
        showShoppingList
        onViewShoppingList={onViewShoppingList}
      />
    );
    expect(screen.getByTestId('view-shopping-list')).toHaveTextContent('Hide shopping list');
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
    expect(screen.queryByTestId('analysis-preferences-card')).not.toBeInTheDocument();
  });

  it('shows top missing items by default and reveals shopping list on CTA', () => {
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

    expect(screen.getByTestId('top-missing-items-section')).toBeInTheDocument();
    expect(screen.getByTestId('view-shopping-list')).toBeInTheDocument();
    expect(screen.queryByTestId('shopping-list-table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('view-shopping-list'));

    expect(screen.getByTestId('shopping-list-table')).toBeInTheDocument();
    expect(screen.getByTestId('shopping-list-row-shirt')).toBeInTheDocument();
    expect(screen.queryByTestId('shopping-list-row-belt')).not.toBeInTheDocument();
    expect(screen.getByTestId('view-shopping-list')).toHaveTextContent('Hide shopping list');
  });
});
