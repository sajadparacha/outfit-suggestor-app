import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WardrobeGapAnalysis from './WardrobeGapAnalysis';
import { WardrobeGapAnalysisResponse } from '../../models/WardrobeModels';
import { INSIGHTS_COPY } from '../../utils/insightsCopy';

describe('WardrobeGapAnalysis', () => {
  it('renders empty hint when no result', () => {
    render(<WardrobeGapAnalysis result={null} loading={false} error={null} />);
    expect(screen.getByText(INSIGHTS_COPY.EMPTY_STATE)).toBeInTheDocument();
  });

  it('renders category analysis details', () => {
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
      },
    };

    render(<WardrobeGapAnalysis result={result} loading={false} error={null} />);
    expect(screen.getByText(INSIGHTS_COPY.WHATS_MISSING_TITLE)).toBeInTheDocument();
    expect(screen.getByText(/Best next purchases are in blazer and shoes/i)).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(INSIGHTS_COPY.COLORS_TO_ADD, 'i')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Add a black shirt for better office coverage/i)).toBeInTheDocument();
    expect(screen.getByText(INSIGHTS_COPY.CATEGORIES_CHECKED)).toBeInTheDocument();
    expect(screen.getAllByText(/^1$/).length).toBeGreaterThan(0);
    expect(screen.getByText(INSIGHTS_COPY.BEST_CATEGORY_TO_SHOP_NEXT)).toBeInTheDocument();
    expect(screen.getByText(INSIGHTS_COPY.WHAT_TO_BUY_NEXT)).toBeInTheDocument();
  });

  it('shows AI Stylist Review label and no fallback message for successful premium analysis', () => {
    const result: WardrobeGapAnalysisResponse = {
      occasion: 'casual',
      season: 'summer',
      style: 'casual',
      analysis_mode: 'premium',
      analysisDepth: 'Premium',
      overall_summary: 'Start with breathable shirts and tailored shorts for summer.',
      analysis_by_category: {
        shirt: {
          category: 'shirt',
          owned_colors: ['navy'],
          owned_styles: ['cotton'],
          missing_colors: ['white'],
          missing_styles: ['linen'],
          recommended_purchases: ['White linen shirt'],
          item_count: 1,
        },
      },
    };

    render(<WardrobeGapAnalysis result={result} loading={false} error={null} />);

    expect(screen.getByText(new RegExp(`${INSIGHTS_COPY.REVIEW_TYPE_PREFIX}`))).toBeInTheDocument();
    expect(screen.getByText(INSIGHTS_COPY.AI_STYLIST_REVIEW)).toBeInTheDocument();
    expect(screen.queryByText(/temporarily unavailable/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Start with breathable shirts and tailored shorts for summer/i)).toBeInTheDocument();
  });

  it('shows fallback messaging when premium analysis degraded to basic', () => {
    const fallbackSummary =
      'Premium analysis is temporarily unavailable. Showing free rules-based analysis.';
    const result: WardrobeGapAnalysisResponse = {
      occasion: 'casual',
      season: 'summer',
      style: 'casual',
      analysis_mode: 'free',
      analysisDepth: 'Basic',
      overall_summary: fallbackSummary,
      analysis_by_category: {
        shirt: {
          category: 'shirt',
          owned_colors: ['navy'],
          owned_styles: ['cotton'],
          missing_colors: ['white'],
          missing_styles: ['linen'],
          recommended_purchases: ['White linen shirt'],
          item_count: 1,
        },
      },
    };

    render(<WardrobeGapAnalysis result={result} loading={false} error={null} />);

    expect(screen.getByText(INSIGHTS_COPY.QUICK_WARDROBE_CHECK)).toBeInTheDocument();
    expect(screen.getByText(fallbackSummary)).toBeInTheDocument();
  });

  it('renders admin cost and prompt/response panels when available', () => {
    const result: WardrobeGapAnalysisResponse = {
      occasion: 'business',
      season: 'winter',
      style: 'classic',
      analysis_mode: 'premium',
      overall_summary: 'Premium summary',
      ai_prompt: 'full prompt text',
      ai_raw_response: '{"analysis":"full"}',
      cost: {
        gpt4_cost: 0.0123,
        total_cost: 0.0123,
        input_tokens: 120,
        output_tokens: 220,
      },
      analysis_by_category: {
        shirt: {
          category: 'shirt',
          owned_colors: [],
          owned_styles: [],
          missing_colors: [],
          missing_styles: [],
          recommended_purchases: [],
          item_count: 0,
        },
      },
    };

    render(
      <WardrobeGapAnalysis
        result={result}
        loading={false}
        error={null}
        isAdmin
      />
    );

    expect(screen.getByText(/Analysis Cost/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Prompt & Response \(Admin\)/i)).toBeInTheDocument();
    expect(screen.getByText(/full prompt text/i)).toBeInTheDocument();
    expect(screen.getByText(/\{"analysis":"full"\}/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin diagnostics/i)).toBeInTheDocument();
  });

  it('shows the full priority shopping list, not only top three items', () => {
    const categories = ['shirt', 'trouser', 'blazer', 'shoes', 'belt'] as const;
    const result: WardrobeGapAnalysisResponse = {
      occasion: 'business',
      season: 'summer',
      style: 'business casual',
      overall_summary: 'Expand across categories.',
      priorityShoppingList: categories.map((category, index) => ({
        rank: index + 1,
        itemName: `${category} item`,
        category,
        priority: 'High',
        recommendedColors: ['navy'],
        recommendedStyles: ['tailored'],
        reason: `Reason for ${category}`,
        outfitImpact: `Impact for ${category}`,
        actions: ['Show outfit examples'],
      })),
      analysis_by_category: {
        shirt: {
          category: 'shirt',
          owned_colors: [],
          owned_styles: [],
          missing_colors: ['navy'],
          missing_styles: ['tailored'],
          recommended_purchases: [],
          item_count: 0,
        },
      },
    };

    render(<WardrobeGapAnalysis result={result} loading={false} error={null} />);

    expect(screen.getByText(/shirt item/i)).toBeInTheDocument();
    expect(screen.getByText(/belt item/i)).toBeInTheDocument();
    expect(screen.getAllByText(/High Priority/i)).toHaveLength(5);
  });

  it('toggles category details and opens Google Shopping search on chip click', () => {
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

    render(<WardrobeGapAnalysis result={result} loading={false} error={null} />);

    expect(screen.queryByText(/Owned Colors/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Find similar items$/i }));
    expect(screen.getByText(/Owned Colors/i)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Find similar items for Linen/i })[0]);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const colorUrl = String(openSpy.mock.calls[0][0]);
    expect(colorUrl).toContain('tbm=shop');
    expect(colorUrl).toContain(encodeURIComponent('Show me men shirts in Linen style and Pastel Pink color'));
    fireEvent.click(screen.getAllByRole('button', { name: /Show outfit examples/i })[0]);

    expect(openSpy).toHaveBeenCalledTimes(2);
    const styleUrl = String(openSpy.mock.calls[1][0]);
    expect(styleUrl).toContain('tbm=shop');
    expect(styleUrl).toContain(
      encodeURIComponent('Show me men shirts in Linen and Slim Fit style and Pastel Pink and Navy color')
    );

    openSpy.mockRestore();
  });
});
