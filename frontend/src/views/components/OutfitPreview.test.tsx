/**
 * Unit tests for OutfitPreview - suggestion display, action buttons, disabled states
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OutfitPreview from './OutfitPreview';
import type { OutfitSuggestion } from '../../models/OutfitModels';

const defaultActionProps = {
  onGenerateAnother: jest.fn(),
  onMakeMoreFormal: jest.fn(),
  onMakeMoreCasual: jest.fn(),
  onUseWardrobeOnly: jest.fn(),
  onChangeOccasion: jest.fn(),
};

describe('OutfitPreview', () => {
  const mockOnGenerateAnother = jest.fn();
  const mockOnMakeMoreFormal = jest.fn();
  const mockOnMakeMoreCasual = jest.fn();
  const mockOnUseWardrobeOnly = jest.fn();
  const mockOnChangeOccasion = jest.fn();
  const mockOnAddToWardrobe = jest.fn();
  const mockOnLike = jest.fn();

  const actionProps = {
    onGenerateAnother: mockOnGenerateAnother,
    onMakeMoreFormal: mockOnMakeMoreFormal,
    onMakeMoreCasual: mockOnMakeMoreCasual,
    onUseWardrobeOnly: mockOnUseWardrobeOnly,
    onChangeOccasion: mockOnChangeOccasion,
  };

  const baseSuggestion: OutfitSuggestion = {
    id: '1',
    shirt: 'White linen shirt',
    trouser: 'Navy chinos',
    blazer: 'Gray blazer',
    shoes: 'Brown loafers',
    belt: 'Brown leather belt',
    reasoning: 'Classic business casual combination.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading skeleton when loading', () => {
      const { container } = render(
        <OutfitPreview
          suggestion={null}
          loading={true}
          error={null}
          {...defaultActionProps}
        />
      );
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message and Try Again button', () => {
      render(
        <OutfitPreview
          suggestion={null}
          loading={false}
          error="Something went wrong"
          hasImage={true}
          {...actionProps}
        />
      );
      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText('Something went wrong', { exact: true })).toBeInTheDocument();
      const tryAgainBtn = screen.getByRole('button', { name: /Try Again/i });
      expect(tryAgainBtn).toBeInTheDocument();
      fireEvent.click(tryAgainBtn);
      expect(mockOnGenerateAnother).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state (no suggestion)', () => {
    it('shows headline and subline when no suggestion', () => {
      render(
        <OutfitPreview
          suggestion={null}
          loading={false}
          error={null}
          {...defaultActionProps}
        />
      );
      expect(screen.getByText('Your outfit appears here')).toBeInTheDocument();
      expect(
        screen.getByText('Upload a photo on the left, then tap Generate Outfit')
      ).toBeInTheDocument();
    });
  });

  describe('suggestion display', () => {
    it('displays outfit details when suggestion is present', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      expect(screen.getByText(/Your Perfect Outfit/i)).toBeInTheDocument();
      expect(screen.getByText('White linen shirt')).toBeInTheDocument();
      expect(screen.getByText('Navy chinos')).toBeInTheDocument();
      expect(screen.getByText('Gray blazer')).toBeInTheDocument();
      expect(screen.getByText('Brown loafers')).toBeInTheDocument();
      expect(screen.getByText('Brown leather belt')).toBeInTheDocument();
      expect(screen.getByText(/Why This Works/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Classic business casual combination/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Advanced options/i)).not.toBeInTheDocument();
    });

    it('uses uploaded image as shirt thumbnail when upload matched shirt (upload_matched_category)', () => {
      const uploadedImageUrl = 'blob:http://localhost/fake-uploaded-shirt';
      const suggestionWithWardrobe = {
        ...baseSuggestion,
        imageUrl: uploadedImageUrl,
        upload_matched_category: 'shirt',
        matching_wardrobe_items: {
          shirt: [
            { id: 1, category: 'shirt', color: 'navy', description: 'Other navy shirt', image_data: 'base64_wardrobe_A' },
          ],
          trouser: [],
          blazer: [],
          shoes: [],
          belt: [],
        },
      };
      render(
        <OutfitPreview
          suggestion={suggestionWithWardrobe}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      const imgs = screen.getAllByRole('img', { hidden: true });
      const shirtImg = imgs.find((img) => img.getAttribute('alt') === 'Shirt');
      expect(shirtImg).toBeDefined();
      expect(shirtImg?.getAttribute('src')).toBe(uploadedImageUrl);
    });

    it('uses wardrobe match thumbnail for shirt when no imageUrl', () => {
      const suggestionWithWardrobe = {
        ...baseSuggestion,
        imageUrl: undefined,
        shirt_id: 1,
        matching_wardrobe_items: {
          shirt: [
            { id: 1, category: 'shirt', color: 'navy', description: 'Navy shirt', image_data: 'base64_wardrobe_shirt' },
          ],
          trouser: [],
          blazer: [],
          shoes: [],
          belt: [],
        },
      };
      render(
        <OutfitPreview
          suggestion={suggestionWithWardrobe}
          loading={false}
          error={null}
          {...actionProps}
        />
      );
      const shirtImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
      expect(shirtImg).toBeDefined();
      expect(shirtImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_wardrobe_shirt');
    });

    it('shows AI slot text for wardrobe-matched item when DB description differs', () => {
      const suggestionWithMismatch = {
        ...baseSuggestion,
        shirt: 'Cream linen button-down (AI wording)',
        shirt_id: 1,
        matching_wardrobe_items: {
          shirt: [
            {
              id: 1,
              category: 'shirt',
              color: 'cream',
              description: 'Different wardrobe DB description',
              image_data: 'base64_shirt_match',
            },
          ],
          trouser: [],
          blazer: [],
          shoes: [],
          belt: [],
        },
      };
      render(
        <OutfitPreview
          suggestion={suggestionWithMismatch}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      expect(screen.getByText('Cream linen button-down (AI wording)')).toBeInTheDocument();
      expect(screen.queryByText('Different wardrobe DB description')).not.toBeInTheDocument();
    });

    it('shows shirt match (not upload) when upload was trousers (upload_matched_category trouser)', () => {
      const uploadedImageUrl = 'blob:http://localhost/fake-uploaded-trousers';
      const suggestionWithWardrobe = {
        ...baseSuggestion,
        imageUrl: uploadedImageUrl,
        upload_matched_category: 'trouser',
        shirt_id: 1,
        trouser_id: 2,
        matching_wardrobe_items: {
          shirt: [
            { id: 1, category: 'shirt', color: 'sky blue', description: 'Dress shirt', image_data: 'base64_shirt_match' },
          ],
          trouser: [
            { id: 2, category: 'trouser', color: 'charcoal', description: 'Slim trousers', image_data: 'base64_trouser_match' },
          ],
          blazer: [],
          shoes: [],
          belt: [],
        },
      };
      render(
        <OutfitPreview
          suggestion={suggestionWithWardrobe}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      const shirtImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
      const trouserImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Trousers');
      expect(shirtImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_shirt_match');
      expect(trouserImg?.getAttribute('src')).toBe(uploadedImageUrl);
    });

    it('prefers explicit uploaded-image wording over mismatched upload_matched_category', () => {
      const uploadedImageUrl = 'blob:http://localhost/fake-uploaded-shirt';
      const suggestionWithMismatch = {
        ...baseSuggestion,
        imageUrl: uploadedImageUrl,
        upload_matched_category: 'blazer',
        shirt: 'White shirt with red and black stripes from the uploaded image',
        blazer: "Slim fit blazer in Charcoal gray (from user's wardrobe)",
        blazer_id: 2,
        matching_wardrobe_items: {
          shirt: [],
          trouser: [],
          blazer: [
            { id: 2, category: 'blazer', color: 'charcoal', description: 'Wardrobe blazer', image_data: 'base64_blazer' },
          ],
          shoes: [],
          belt: [],
        },
      };

      render(
        <OutfitPreview
          suggestion={suggestionWithMismatch}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );

      const shirtImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
      const blazerImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Blazer');
      expect(shirtImg?.getAttribute('src')).toBe(uploadedImageUrl);
      expect(blazerImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_blazer');
    });

    it('uses source_slot as primary upload-slot signal when provided', () => {
      const uploadedImageUrl = 'blob:http://localhost/fake-uploaded-item';
      const suggestionWithSourceSlot = {
        ...baseSuggestion,
        imageUrl: uploadedImageUrl,
        upload_matched_category: 'blazer',
        source_slot: 'shirt',
        blazer_id: 9,
        matching_wardrobe_items: {
          shirt: [],
          trouser: [],
          blazer: [
            { id: 9, category: 'blazer', color: 'gray', description: 'Wardrobe blazer', image_data: 'base64_blazer_9' },
          ],
          shoes: [],
          belt: [],
        },
      };

      render(
        <OutfitPreview
          suggestion={suggestionWithSourceSlot}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );

      const shirtImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
      const blazerImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Blazer');
      expect(shirtImg?.getAttribute('src')).toBe(uploadedImageUrl);
      expect(blazerImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_blazer_9');
    });

    it('displays cost when present', () => {
      const suggestionWithCost = {
        ...baseSuggestion,
        cost: {
          gpt4_cost: 0.0123,
          total_cost: 0.0123,
          model_image_cost: 0,
        },
      };
      render(
        <OutfitPreview
          suggestion={suggestionWithCost}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
          isAdmin={true}
        />
      );
      fireEvent.click(screen.getByText('Advanced options'));
      expect(screen.getByText(/AI Suggestion Cost/i)).toBeInTheDocument();
    });
  });

  describe('action buttons - hasImage true', () => {
    it('calls onGenerateAnother when primary button is clicked', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      const generateBtns = screen.getAllByRole('button', { name: /Generate another look/i });
      fireEvent.click(generateBtns[0]);
      expect(mockOnGenerateAnother).toHaveBeenCalledTimes(1);
    });

    it('calls secondary action handlers', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
          isAuthenticated={true}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Make it more formal/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make it more casual/i }));
      fireEvent.click(screen.getByRole('button', { name: /Use wardrobe items only/i }));
      fireEvent.click(screen.getByRole('button', { name: /Change occasion/i }));

      expect(mockOnMakeMoreFormal).toHaveBeenCalledTimes(1);
      expect(mockOnMakeMoreCasual).toHaveBeenCalledTimes(1);
      expect(mockOnUseWardrobeOnly).toHaveBeenCalledTimes(1);
      expect(mockOnChangeOccasion).toHaveBeenCalledTimes(1);
    });

    it('hides wardrobe-only action when showWardrobeOnlyAction is false', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
          showWardrobeOnlyAction={false}
        />
      );
      expect(screen.queryByRole('button', { name: /Use wardrobe items only/i })).not.toBeInTheDocument();
    });

    it('calls onLike when Like button is clicked', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
          onLike={mockOnLike}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Like this outfit/i }));
      expect(mockOnLike).toHaveBeenCalledTimes(1);
    });

    it('shows Add to Wardrobe when authenticated and handler provided', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          isAuthenticated={true}
          onAddToWardrobe={mockOnAddToWardrobe}
          hasImage={true}
        />
      );
      const addBtn = screen.getByRole('button', { name: /Add new item to your wardrobe/i });
      expect(addBtn).toBeInTheDocument();
      fireEvent.click(addBtn);
      expect(mockOnAddToWardrobe).toHaveBeenCalledTimes(1);
    });
  });

  describe('action buttons - hasImage false (wardrobe-only suggestion)', () => {
    it('disables image-based actions when hasImage is false', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={false}
          isAuthenticated={true}
        />
      );
      const generateBtns = screen.getAllByRole('button', { name: /Generate another look/i });
      const formalBtn = screen.getByRole('button', { name: /Make it more formal/i });
      const casualBtn = screen.getByRole('button', { name: /Make it more casual/i });
      const wardrobeBtn = screen.getByRole('button', { name: /Use wardrobe items only/i });
      const occasionBtn = screen.getByRole('button', { name: /Change occasion/i });

      expect(generateBtns[0]).toBeDisabled();
      expect(formalBtn).toBeDisabled();
      expect(casualBtn).toBeDisabled();
      expect(wardrobeBtn).toBeDisabled();
      expect(occasionBtn).not.toBeDisabled();

      fireEvent.click(generateBtns[0]);
      fireEvent.click(formalBtn);
      fireEvent.click(casualBtn);
      fireEvent.click(wardrobeBtn);
      fireEvent.click(occasionBtn);

      expect(mockOnGenerateAnother).not.toHaveBeenCalled();
      expect(mockOnMakeMoreFormal).not.toHaveBeenCalled();
      expect(mockOnMakeMoreCasual).not.toHaveBeenCalled();
      expect(mockOnUseWardrobeOnly).not.toHaveBeenCalled();
      expect(mockOnChangeOccasion).toHaveBeenCalledTimes(1);
    });

    it('disables Add to Wardrobe when hasImage is false and authenticated', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          isAuthenticated={true}
          onAddToWardrobe={mockOnAddToWardrobe}
          hasImage={false}
        />
      );
      const addBtn = screen.getByRole('button', { name: /Add new item to your wardrobe/i });
      expect(addBtn).toBeDisabled();
      fireEvent.click(addBtn);
      expect(mockOnAddToWardrobe).not.toHaveBeenCalled();
    });
  });

  describe('Add to Wardrobe visibility', () => {
    it('does not show Add to Wardrobe when not authenticated', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          isAuthenticated={false}
          onAddToWardrobe={mockOnAddToWardrobe}
          hasImage={true}
        />
      );
      expect(screen.queryByRole('button', { name: /Add new item to your wardrobe/i })).not.toBeInTheDocument();
    });

    it('does not show Add to Wardrobe when onAddToWardrobe not provided', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          isAuthenticated={true}
          hasImage={true}
        />
      );
      expect(screen.queryByRole('button', { name: /Add new item to your wardrobe/i })).not.toBeInTheDocument();
    });
  });
});
