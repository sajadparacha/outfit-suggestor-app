import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WardrobeGapAnalysisResponse } from '../../models/WardrobeModels';
import WardrobeInsightsPage from './insights/WardrobeInsightsPage';
import { DEFAULT_FILTERS } from '../../utils/outfitPreferences';

const noop = () => undefined;

const pageProps = {
  filters: DEFAULT_FILTERS,
  setFilters: noop,
  preferenceText: '',
  setPreferenceText: noop,
  onAnalyze: noop,
  onNavigateToGuide: noop,
  onNavigateToWardrobe: noop,
  loading: false,
  error: null,
};

describe('WardrobeGapAnalysis (deprecated wrapper)', () => {
  it('renders empty state with preferences when no result', () => {
    render(<WardrobeInsightsPage {...pageProps} result={null} />);
    expect(screen.getByTestId('analysis-preferences-card')).toBeInTheDocument();
  });

  it('renders summary and sections when result exists', () => {
    const result: WardrobeGapAnalysisResponse = {
      occasion: 'business',
      season: 'winter',
      style: 'classic',
      overall_summary: 'Best next purchases are in blazer and shoes.',
      analysis_by_category: {
        shirt: {
          category: 'shirt',
          owned_colors: ['white', 'blue'],
          owned_styles: ['formal', 'solid'],
          missing_colors: ['black'],
          missing_styles: ['slim fit'],
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
          missing_styles: ['tailored'],
          recommended_purchases: ['Navy blazer'],
          item_count: 0,
        },
        shoes: {
          category: 'shoes',
          owned_colors: ['brown'],
          owned_styles: ['leather'],
          missing_colors: ['black'],
          missing_styles: ['oxford'],
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

    render(<WardrobeInsightsPage {...pageProps} result={result} />);

    expect(screen.getByTestId('insight-summary-card')).toBeInTheDocument();
    expect(screen.getByText(/Best next purchases are in blazer and shoes/i)).toBeInTheDocument();
    expect(screen.getByTestId('top-missing-items-section')).toBeInTheDocument();
    expect(screen.getByTestId('view-shopping-list')).toBeInTheDocument();
    expect(screen.queryByTestId('shopping-list-table')).not.toBeInTheDocument();
    expect(screen.getByText('Wardrobe coverage')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create outfits/i })).not.toBeInTheDocument();
  });

  it('opens shopping search from category missing color chip', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const result: WardrobeGapAnalysisResponse = {
      occasion: 'casual',
      season: 'summer',
      style: 'modern',
      overall_summary: 'Add brighter tones.',
      analysis_by_category: {
        shirt: {
          category: 'shirt',
          owned_colors: ['white'],
          owned_styles: ['solid'],
          missing_colors: ['pastel pink', 'navy'],
          missing_styles: ['linen', 'slim fit'],
          recommended_purchases: ['Pastel pink linen shirt'],
          item_count: 1,
        },
      },
    };

    render(<WardrobeInsightsPage {...pageProps} result={result} />);

    const shirtRow = screen.getByTestId('category-row-shirt');
    fireEvent.click(shirtRow.querySelector('button') as HTMLButtonElement);

    const missingSection = screen.getByTestId('category-missing-colors-shirt');
    const missingButton = missingSection.querySelector('button[data-testid="insight-color-chip"]') as HTMLButtonElement;
    fireEvent.click(missingButton);

    expect(openSpy).toHaveBeenCalled();
    const url = String(openSpy.mock.calls[0][0]);
    expect(url).toContain('tbm=shop');

    openSpy.mockRestore();
  });
});
