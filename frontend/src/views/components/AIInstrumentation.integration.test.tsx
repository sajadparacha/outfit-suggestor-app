/**
 * Integration-style tests for AI instrumentation placement:
 * admin cost/prompt panels belong on the input side only, not in the result panel.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import OutfitPreview from './OutfitPreview';

const mockActionProps = {
  onGenerateAnother: jest.fn(),
  onMakeMoreFormal: jest.fn(),
  onMakeMoreCasual: jest.fn(),
  onUseWardrobeOnly: jest.fn(),
  onChangeOccasion: jest.fn(),
};

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
  it('does not show AI Suggestion Cost in result panel even for admins', () => {
    const suggestionWithCost = {
      ...baseSuggestion,
      cost: { gpt4_cost: 0.0123, total_cost: 0.0123, model_image_cost: 0 },
      ai_prompt: 'hidden prompt',
      ai_raw_response: '{"shirt":"Shirt"}',
    };

    render(
      <OutfitPreview
        suggestion={suggestionWithCost as any}
        loading={false}
        error={null}
        {...mockActionProps}
        hasImage={true}
      />
    );

    expect(screen.queryByText(/AI Suggestion Cost/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced options/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI Prompt & Response/i)).not.toBeInTheDocument();
  });
});
