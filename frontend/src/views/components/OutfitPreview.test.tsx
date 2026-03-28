/**
 * Unit tests for OutfitPreview - suggestion display, action buttons, disabled states
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OutfitPreview from './OutfitPreview';
import type { OutfitSuggestion } from '../../models/OutfitModels';

describe('OutfitPreview', () => {
  const mockOnLike = jest.fn();
  const mockOnDislike = jest.fn();
  const mockOnNext = jest.fn();
  const mockOnAddToWardrobe = jest.fn();

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
      render(
        <OutfitPreview
          suggestion={null}
          loading={true}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
        />
      );
      expect(screen.getByText(/AI is creating your perfect outfit/i)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message and Try Again button', () => {
      render(
        <OutfitPreview
          suggestion={null}
          loading={false}
          error="Something went wrong"
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
        />
      );
      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText('Something went wrong', { exact: true })).toBeInTheDocument();
      const tryAgainBtn = screen.getByRole('button', { name: /Try Again/i });
      expect(tryAgainBtn).toBeInTheDocument();
      fireEvent.click(tryAgainBtn);
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state (no suggestion)', () => {
    it('shows ready message when no suggestion', () => {
      render(
        <OutfitPreview
          suggestion={null}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
        />
      );
      expect(screen.getByText(/Ready for Style Magic?/i)).toBeInTheDocument();
      expect(screen.getByText(/Start by uploading a photo on the left/i)).toBeInTheDocument();
    });
  });

  describe('suggestion display', () => {
    it('displays outfit details when suggestion is present', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
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
      expect(screen.getByText(/AI Prompt & Response/i)).toBeInTheDocument();
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
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
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
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
        />
      );
      const shirtImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
      expect(shirtImg).toBeDefined();
      expect(shirtImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_wardrobe_shirt');
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
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
          hasImage={true}
        />
      );
      const shirtImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
      const trouserImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Trousers');
      // Shirt card uses wardrobe match (not upload) because upload was trousers
      expect(shirtImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_shirt_match');
      // Trousers card uses upload because upload matched trousers
      expect(trouserImg?.getAttribute('src')).toBe(uploadedImageUrl);
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
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
          hasImage={true}
          isAdmin={true}
        />
      );
      expect(screen.getByText(/AI Suggestion Cost/i)).toBeInTheDocument();
    });
  });

  describe('action buttons - hasImage true', () => {
    it('calls onNext when Next button is clicked', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
          hasImage={true}
        />
      );
      const nextBtns = screen.getAllByRole('button', { name: /Get next suggestion/i });
      fireEvent.click(nextBtns[0]);
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it('calls onLike when Like button is clicked', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
          hasImage={true}
        />
      );
      const likeBtns = screen.getAllByRole('button', { name: /Like this outfit/i });
      fireEvent.click(likeBtns[0]);
      expect(mockOnLike).toHaveBeenCalledTimes(1);
    });

    it('calls onDislike when Dislike button is clicked', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
          hasImage={true}
        />
      );
      const dislikeBtns = screen.getAllByRole('button', { name: /Dislike this outfit/i });
      fireEvent.click(dislikeBtns[0]);
      expect(mockOnDislike).toHaveBeenCalledTimes(1);
    });

    it('shows Add to Wardrobe when authenticated and handler provided', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
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
    it('disables Next, Like, Dislike when hasImage is false', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
          hasImage={false}
        />
      );
      const nextBtns = screen.getAllByRole('button', { name: /Get next suggestion/i });
      const likeBtns = screen.getAllByRole('button', { name: /Like this outfit/i });
      const dislikeBtns = screen.getAllByRole('button', { name: /Dislike this outfit/i });
      const nextBtn = nextBtns[0];
      const likeBtn = likeBtns[0];
      const dislikeBtn = dislikeBtns[0];

      expect(nextBtn).toBeDisabled();
      expect(likeBtn).toBeDisabled();
      expect(dislikeBtn).toBeDisabled();

      fireEvent.click(nextBtn);
      fireEvent.click(likeBtn);
      fireEvent.click(dislikeBtn);

      expect(mockOnNext).not.toHaveBeenCalled();
      expect(mockOnLike).not.toHaveBeenCalled();
      expect(mockOnDislike).not.toHaveBeenCalled();
    });

    it('disables Add to Wardrobe when hasImage is false and authenticated', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
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
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
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
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
          isAuthenticated={true}
          hasImage={true}
        />
      );
      expect(screen.queryByRole('button', { name: /Add new item to your wardrobe/i })).not.toBeInTheDocument();
    });
  });
});
