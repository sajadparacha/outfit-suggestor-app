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
      expect(screen.getByText(/Classic business casual combination/)).toBeInTheDocument();
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
