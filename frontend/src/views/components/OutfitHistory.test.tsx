/**
 * Unit tests for OutfitHistory - load, display, search, delete
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OutfitHistory from './OutfitHistory';
import type { OutfitHistoryEntry } from '../../models/OutfitModels';

describe('OutfitHistory', () => {
  const mockOnRefresh = jest.fn();
  const mockOnEnsureFullHistory = jest.fn().mockResolvedValue(undefined);
  const mockOnDelete = jest.fn().mockResolvedValue(undefined);

  const baseEntry: OutfitHistoryEntry = {
    id: 1,
    created_at: '2024-06-15T10:30:00Z',
    text_input: 'business casual',
    image_data: null,
    model_image: null,
    shirt: 'White linen shirt',
    trouser: 'Navy chinos',
    blazer: 'Gray blazer',
    shoes: 'Brown loafers',
    belt: 'Brown leather belt',
    reasoning: 'Classic combination for a professional look.',
  };

  const originalConfirm = window.confirm;

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  describe('loading state', () => {
    it('shows loading spinner when loading', () => {
      render(
        <OutfitHistory
          history={[]}
          loading={true}
          error={null}
          isFullView={false}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText(/Loading history/i)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message and Try Again button', () => {
      render(
        <OutfitHistory
          history={[]}
          loading={false}
          error="Failed to load history"
          isFullView={false}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText(/Error Loading History/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load history/)).toBeInTheDocument();
      const tryAgainBtn = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(tryAgainBtn);
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    it('shows no history message when history is empty', () => {
      render(
        <OutfitHistory
          history={[]}
          loading={false}
          error={null}
          isFullView={false}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText(/Outfit History/i)).toBeInTheDocument();
      expect(screen.getByText(/No History Yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Your outfit suggestions will appear here/i)).toBeInTheDocument();
    });
  });

  describe('history display', () => {
    it('displays history entries with outfit details', () => {
      render(
        <OutfitHistory
          history={[baseEntry]}
          loading={false}
          error={null}
          isFullView={true}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText(/Outfit History/i)).toBeInTheDocument();
      expect(screen.getByText(/Showing all 1 entry/i)).toBeInTheDocument();
      expect(screen.getByText('White linen shirt')).toBeInTheDocument();
      expect(screen.getByText('Navy chinos')).toBeInTheDocument();
      expect(screen.getByText('Gray blazer')).toBeInTheDocument();
      expect(screen.getByText('Brown loafers')).toBeInTheDocument();
      expect(screen.getByText('Brown leather belt')).toBeInTheDocument();
      expect(screen.getByText(/Classic combination for a professional look/)).toBeInTheDocument();
    });

    it('displays Load All when not full view and has entries', () => {
      render(
        <OutfitHistory
          history={[baseEntry]}
          loading={false}
          error={null}
          isFullView={false}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      const loadAllBtn = screen.getByRole('button', { name: /Load All/i });
      expect(loadAllBtn).toBeInTheDocument();
      fireEvent.click(loadAllBtn);
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('search and filter', () => {
    it('renders search input and Search button', () => {
      render(
        <OutfitHistory
          history={[baseEntry]}
          loading={false}
          error={null}
          isFullView={true}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      const searchInput = screen.getByPlaceholderText(/Search by clothing items/i);
      expect(searchInput).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    });

    it('filters results when search is used', () => {
      render(
        <OutfitHistory
          history={[baseEntry]}
          loading={false}
          error={null}
          isFullView={true}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      const searchInput = screen.getByPlaceholderText(/Search by clothing items/i);
      fireEvent.change(searchInput, { target: { value: 'linen' } });
      fireEvent.click(screen.getByRole('button', { name: /Search/i }));
      expect(screen.getByText(/Found 1 result for/i)).toBeInTheDocument();
    });

    it('shows Clear button when search query is active', () => {
      render(
        <OutfitHistory
          history={[baseEntry]}
          loading={false}
          error={null}
          isFullView={true}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      const searchInput = screen.getByPlaceholderText(/Search by clothing items/i);
      fireEvent.change(searchInput, { target: { value: 'linen' } });
      fireEvent.click(screen.getByRole('button', { name: /Search/i }));
      const clearBtn = screen.getByRole('button', { name: /Clear/i });
      expect(clearBtn).toBeInTheDocument();
    });
  });

  describe('delete entry', () => {
    it('calls onDelete when delete button is clicked and user confirms', async () => {
      (window.confirm as jest.Mock).mockReturnValue(true);
      render(
        <OutfitHistory
          history={[baseEntry]}
          loading={false}
          error={null}
          isFullView={true}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      const deleteBtn = screen.getByTitle(/Delete this entry/i);
      fireEvent.click(deleteBtn);
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this outfit history entry?');
      await new Promise((r) => setTimeout(r, 0));
      expect(mockOnDelete).toHaveBeenCalledWith(1);
    });

    it('does not call onDelete when user cancels confirm', async () => {
      (window.confirm as jest.Mock).mockReturnValue(false);
      render(
        <OutfitHistory
          history={[baseEntry]}
          loading={false}
          error={null}
          isFullView={true}
          onRefresh={mockOnRefresh}
          onEnsureFullHistory={mockOnEnsureFullHistory}
          onDelete={mockOnDelete}
        />
      );
      const deleteBtn = screen.getByTitle(/Delete this entry/i);
      fireEvent.click(deleteBtn);
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });
});
