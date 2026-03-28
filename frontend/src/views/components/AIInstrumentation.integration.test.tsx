/**
 * Integration-style tests for recent AI instrumentation changes:
 * - Admin gating for AI prompt/response panel and AI suggestion cost panel
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import OutfitPreview from './OutfitPreview';

const mockOnLike = jest.fn();
const mockOnDislike = jest.fn();
const mockOnNext = jest.fn();

const baseSuggestion = {
  id: '1',
  shirt: 'Shirt',
  trouser: 'Trousers',
  blazer: 'Blazer',
  shoes: 'Shoes',
  belt: 'Belt',
  reasoning: 'Reasoning',
  matching_wardrobe_items: {
    shirt: [],
    trouser: [],
    blazer: [],
    shoes: [],
    belt: [],
  },
};

describe('AI instrumentation integration', () => {
  it('shows AI Suggestion Cost only for admins', () => {
    const suggestionWithCost = {
      ...baseSuggestion,
      cost: { gpt4_cost: 0.0123, total_cost: 0.0123, model_image_cost: 0 },
    };

    const { rerender } = render(
      <OutfitPreview
        suggestion={suggestionWithCost as any}
        loading={false}
        error={null}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onNext={mockOnNext}
        hasImage={true}
        isAdmin={false}
      />
    );

    expect(screen.queryByText(/AI Suggestion Cost/i)).not.toBeInTheDocument();

    rerender(
      <OutfitPreview
        suggestion={suggestionWithCost as any}
        loading={false}
        error={null}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onNext={mockOnNext}
        hasImage={true}
        isAdmin={true}
      />
    );

    expect(screen.getByText(/AI Suggestion Cost/i)).toBeInTheDocument();
  });

  it('hides AI Prompt & Response panel when showAiPromptResponse is false', () => {
    const suggestionWithCost = {
      ...baseSuggestion,
      cost: { gpt4_cost: 0.0123, total_cost: 0.0123, model_image_cost: 0 },
    };

    render(
      <OutfitPreview
        suggestion={suggestionWithCost as any}
        loading={false}
        error={null}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        onNext={mockOnNext}
        hasImage={true}
        isAdmin={true}
        showAiPromptResponse={false}
      />
    );

    expect(
      screen.queryByText(/AI Prompt & Response \(only available to Admin\)/i)
    ).not.toBeInTheDocument();
  });
});

