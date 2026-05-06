import React from 'react';
import { render, screen } from '@testing-library/react';
import WardrobeGapAnalysis from './WardrobeGapAnalysis';
import { WardrobeGapAnalysisResponse } from '../../models/WardrobeModels';

describe('WardrobeGapAnalysis', () => {
  it('renders empty hint when no result', () => {
    render(<WardrobeGapAnalysis result={null} loading={false} error={null} />);
    expect(screen.getByText(/Run analysis to get category-wise color and style coverage/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Wardrobe Gap Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Best next purchases are in blazer and shoes/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Shirt/i })).toBeInTheDocument();
    expect(screen.getByText(/Add a black shirt for better office coverage/i)).toBeInTheDocument();
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
  });
});
