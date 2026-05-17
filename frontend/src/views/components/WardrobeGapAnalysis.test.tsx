import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByText(/Categories analyzed/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^1$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Top buy-next category/i)).toBeInTheDocument();
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

  it('toggles category details and opens men-focused image search on click', () => {
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
          missing_colors: ['pastel pink'],
          missing_styles: ['linen'],
          recommended_purchases: ['Pastel pink linen shirt'],
          item_count: 1,
        },
      },
    };

    render(<WardrobeGapAnalysis result={result} loading={false} error={null} />);

    // Details are initially hidden.
    expect(screen.queryByText(/Owned Colors/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));
    expect(screen.getByText(/Owned Colors/i)).toBeInTheDocument();

    const missingColorChip = screen.getAllByRole('button', {
      name: /click to search images for Pastel Pink Shirt color/i,
    })[0];
    fireEvent.click(missingColorChip);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const colorUrl = String(openSpy.mock.calls[0][0]);
    expect(colorUrl).toContain('tbm=isch');
    expect(colorUrl).toContain(encodeURIComponent('men pastel pink Shirt outfit menswear'));

    const missingStyleChip = screen.getAllByRole('button', {
      name: /click to search images for Linen Shirt style/i,
    })[0];
    fireEvent.click(missingStyleChip);

    expect(openSpy).toHaveBeenCalledTimes(2);
    const styleUrl = String(openSpy.mock.calls[1][0]);
    expect(styleUrl).toContain('tbm=isch');
    expect(styleUrl).toContain(encodeURIComponent('men linen Shirt outfit menswear'));

    openSpy.mockRestore();
  });
});
