/**
 * Integration-style tests for suggested-by-AI label:
 * - When AI returns *_id = null for a category, show "(suggested by AI)"
 *   and do not render a wardrobe thumbnail for that slot.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import OutfitPreview from './OutfitPreview';

describe('Suggested by AI integration', () => {
  it('shows "(suggested by AI)" when shoes_id is null', () => {
    const suggestion: any = {
      id: '1',
      shirt: 'AI shirt',
      trouser: 'AI trouser',
      blazer: 'AI blazer',
      shoes: 'AI shoes',
      belt: 'AI belt',
      reasoning: 'Reasoning',
      // Only shoes has null id; other categories have IDs and matching items.
      shirt_id: 10,
      trouser_id: 11,
      blazer_id: 12,
      shoes_id: null,
      belt_id: 14,
      matching_wardrobe_items: {
        shirt: [{ id: 10, category: 'shirt', color: 'blue', description: 'Shirt match', image_data: 'base64_shirt' }],
        trouser: [{ id: 11, category: 'trouser', color: 'gray', description: 'Trouser match', image_data: 'base64_trouser' }],
        blazer: [{ id: 12, category: 'blazer', color: 'navy', description: 'Blazer match', image_data: 'base64_blazer' }],
        shoes: [{ id: 13, category: 'shoes', color: 'brown', description: 'Shoes match', image_data: 'base64_shoes' }],
        belt: [{ id: 14, category: 'belt', color: 'brown', description: 'Belt match', image_data: 'base64_belt' }],
      },
      imageUrl: undefined,
      upload_matched_category: undefined,
      cost: undefined,
    };

    render(
      <OutfitPreview
        suggestion={suggestion}
        loading={false}
        error={null}
        onLike={jest.fn()}
        onDislike={jest.fn()}
        onNext={jest.fn()}
        hasImage={false}
        isAdmin={false}
        showAiPromptResponse={false}
      />
    );

    // Label should appear for shoes slot
    expect(screen.getByText(/\(suggested by AI\)/i)).toBeInTheDocument();

    // No thumbnail image should be rendered for shoes
    expect(screen.queryByAltText('Shoes')).not.toBeInTheDocument();

    // But AI text should still be displayed
    expect(screen.getByText('AI shoes')).toBeInTheDocument();
  });
});

