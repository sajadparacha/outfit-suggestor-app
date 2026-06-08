import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Wardrobe from './Wardrobe';
import type { WardrobeItem } from '../../models/WardrobeModels';
import ApiService from '../../services/ApiService';

// Mock state: shared array so we can test both empty and with-items in one file
const mockWardrobeItems: WardrobeItem[] = [];

const mockLoadWardrobe = jest.fn();
const mockLoadSummary = jest.fn();
const mockAnalyzeImage = jest.fn();
const mockAddItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockDeleteItem = jest.fn();
const mockSetSelectedCategory = jest.fn();
const mockSetSearchQuery = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../controllers/useWardrobeController', () => ({
  useWardrobeController: () => ({
    wardrobeItems: mockWardrobeItems,
    summary: {
      total_items: mockWardrobeItems.length,
      by_category: { shirt: mockWardrobeItems.filter((i) => i.category === 'shirt').length },
      by_color: {},
      categories: ['shirt'],
    },
    loading: false,
    error: null,
    selectedCategory: null,
    totalCount: mockWardrobeItems.length,
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',
    loadWardrobe: mockLoadWardrobe,
    loadSummary: mockLoadSummary,
    analyzeImage: mockAnalyzeImage,
    addItem: mockAddItem,
    updateItem: mockUpdateItem,
    deleteItem: mockDeleteItem,
    setSelectedCategory: mockSetSelectedCategory,
    setSearchQuery: mockSetSearchQuery,
    clearError: mockClearError,
  }),
}));

const mockWardrobeItem: WardrobeItem = {
  id: 1,
  category: 'shirt',
  name: null,
  description: 'Test shirt',
  color: 'Blue',
  brand: null,
  size: null,
  image_data: null,
  tags: null,
  condition: null,
  wear_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const openItemMenu = (itemId = 1) => {
  fireEvent.click(screen.getByTestId(`wardrobe-item-menu-${itemId}`));
};

describe('Wardrobe page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWardrobeItems.length = 0;
    localStorage.removeItem('wardrobe_flow_tip_dismissed');
  });

  it('loads the wardrobe page and shows the page header', () => {
    render(<Wardrobe />);
    expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Pick a saved piece/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty list state when there are no wardrobe items', () => {
    render(<Wardrobe />);
    expect(screen.getByText(/Your wardrobe is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Your First Item/i })).toBeInTheDocument();
  });

  it('shows wardrobe item list when items exist', () => {
    mockWardrobeItems.push(mockWardrobeItem);
    render(<Wardrobe />);
    expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    expect(screen.getByText('Test shirt')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText(/Color:/)).toBeInTheDocument();
  });

  it('shows hero button Style this item when item has an image', () => {
    localStorage.setItem('wardrobe_flow_tip_dismissed', 'true');
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });
    render(<Wardrobe />);
    expect(screen.getByRole('button', { name: /Style this item with AI/i })).toBeInTheDocument();
  });

  it('opens overflow menu with View image, Edit, History, and Delete', () => {
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });
    render(<Wardrobe />);

    openItemMenu();

    expect(screen.getByRole('menuitem', { name: /View image/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Edit$/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^History$/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Delete$/i })).toBeInTheDocument();
  });

  it('does not show standalone Past Suggestions or inline Edit/Delete icon buttons', () => {
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });
    render(<Wardrobe />);

    expect(screen.queryByRole('button', { name: /Past Suggestions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete item/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit item/i })).not.toBeInTheDocument();
  });

  it('shows flow tip step 2 with Style this item copy', () => {
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });
    render(<Wardrobe />);
    const steps = screen.getAllByRole('listitem');
    expect(steps[1]).toHaveTextContent('Style this item');
    expect(screen.queryByText(/Build outfit from this item/i)).not.toBeInTheDocument();
  });

  it('Style this item prepares suggest flow via outfitController', async () => {
    const itemWithImage: WardrobeItem = {
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    };
    mockWardrobeItems.push(itemWithImage);

    const onNavigateToMain = jest.fn();
    const onSourceImageLoaded = jest.fn();
    const setImage = jest.fn();
    const setSourceWardrobeItem = jest.fn();

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      blob: async () => new Blob(['image'], { type: 'image/jpeg' }),
    } as Response);

    render(
      <Wardrobe
        onNavigateToMain={onNavigateToMain}
        onSourceImageLoaded={onSourceImageLoaded}
        outfitController={{
          setImage,
          setSourceWardrobeItem,
          getSuggestion: jest.fn(),
          loading: false,
          error: null,
          showDuplicateModal: false,
          handleUseCachedSuggestion: jest.fn(),
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Style this item with AI/i }));

    await waitFor(() => {
      expect(setSourceWardrobeItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, category: 'shirt' })
      );
      expect(setImage).toHaveBeenCalledTimes(1);
      expect(onSourceImageLoaded).toHaveBeenCalledTimes(1);
      expect(onNavigateToMain).toHaveBeenCalledTimes(1);
    });

    fetchSpy.mockRestore();
  });

  it('shows undo toast on delete via menu and restores item when undo is tapped', async () => {
    jest.useFakeTimers();
    mockWardrobeItems.push(mockWardrobeItem);
    render(<Wardrobe />);

    openItemMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Blue')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('wardrobe-delete-undo-toast')).toBeInTheDocument();
    expect(screen.getByText('Item deleted.')).toBeInTheDocument();
    expect(mockDeleteItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Undo delete/i }));

    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.queryByTestId('wardrobe-delete-undo-toast')).not.toBeInTheDocument();
    expect(mockDeleteItem).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();
    expect(mockDeleteItem).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('opens edit modal from overflow menu', () => {
    mockWardrobeItems.push(mockWardrobeItem);
    render(<Wardrobe />);

    openItemMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Edit$/i }));

    expect(screen.getByRole('heading', { name: /Edit Wardrobe Item/i })).toBeInTheDocument();
  });

  it('Add modal displays image size limit and accept attribute', () => {
    render(<Wardrobe />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Your First Item' }));
    expect(screen.getByText(/JPG, PNG, WebP up to 10MB/i)).toBeInTheDocument();
    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBeGreaterThan(0);
    const firstInput = inputs[0] as HTMLInputElement;
    expect(firstInput.accept).toBe('image/jpeg,image/jpg,image/png,image/webp');
  });

  it('loads history suggestions via menu and allows selecting one', async () => {
    const itemWithImage: WardrobeItem = {
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    };
    mockWardrobeItems.push(itemWithImage);

    const onSuggestionReady = jest.fn();
    const onNavigateToMain = jest.fn();
    const onSourceImageLoaded = jest.fn();
    const setImage = jest.fn();
    const setSourceWardrobeItem = jest.fn();

    jest.spyOn(ApiService, 'getOutfitHistory').mockResolvedValue([
      {
        id: 101,
        created_at: '2026-05-04T09:00:00.000Z',
        text_input: 'Office casual',
        image_data: 'base64-image-a',
        model_image: null,
        shirt: 'White oxford shirt',
        trouser: 'Navy chinos',
        blazer: 'Grey blazer',
        shoes: 'Brown loafers',
        belt: 'Brown leather belt',
        reasoning: 'Balanced smart-casual look for work.',
      },
    ]);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      blob: async () => new Blob(['image'], { type: 'image/jpeg' }),
    } as Response);

    render(
      <Wardrobe
        onSuggestionReady={onSuggestionReady}
        onNavigateToMain={onNavigateToMain}
        onSourceImageLoaded={onSourceImageLoaded}
        outfitController={{
          setImage,
          setSourceWardrobeItem,
          getSuggestion: jest.fn(),
          loading: false,
          error: null,
          showDuplicateModal: false,
          handleUseCachedSuggestion: jest.fn(),
        }}
      />
    );

    openItemMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^History$/i }));
    expect(await screen.findByRole('heading', { name: /History Suggestions/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Use This/i }));

    await waitFor(() => {
      expect(setSourceWardrobeItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, category: 'shirt' })
      );
      expect(setImage).toHaveBeenCalledTimes(1);
      expect(onSourceImageLoaded).toHaveBeenCalledTimes(1);
      expect(onSuggestionReady).toHaveBeenCalledTimes(1);
      expect(onNavigateToMain).toHaveBeenCalledTimes(1);
    });

    fetchSpy.mockRestore();
  });

  it('always shows History in overflow menu even when item has no linked history', async () => {
    const itemWithImage: WardrobeItem = {
      ...mockWardrobeItem,
      image_data: 'base64-image-no-history',
    };
    mockWardrobeItems.push(itemWithImage);

    jest.spyOn(ApiService, 'getOutfitHistory').mockResolvedValue([
      {
        id: 202,
        created_at: '2026-05-04T10:00:00.000Z',
        text_input: 'Different item',
        image_data: 'other-image-data',
        model_image: null,
        shirt: 'Black polo',
        trouser: 'Beige chinos',
        blazer: 'None',
        shoes: 'White sneakers',
        belt: 'Brown belt',
        reasoning: 'Different source image from current wardrobe item.',
      },
    ]);

    render(<Wardrobe />);

    openItemMenu();
    expect(screen.getByRole('menuitem', { name: /^History$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Past Suggestions/i })).not.toBeInTheDocument();
  });

  it('opens history modal with empty state when no linked history', async () => {
    const itemWithImage: WardrobeItem = {
      ...mockWardrobeItem,
      image_data: 'base64-image-no-history',
    };
    mockWardrobeItems.push(itemWithImage);

    jest.spyOn(ApiService, 'getOutfitHistory').mockResolvedValue([
      {
        id: 202,
        created_at: '2026-05-04T10:00:00.000Z',
        text_input: 'Different item',
        image_data: 'other-image-data',
        model_image: null,
        shirt: 'Black polo',
        trouser: 'Beige chinos',
        blazer: 'None',
        shoes: 'White sneakers',
        belt: 'Brown belt',
        reasoning: 'Different source image from current wardrobe item.',
      },
    ]);

    render(<Wardrobe />);

    openItemMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^History$/i }));

    expect(await screen.findByRole('heading', { name: /History Suggestions/i })).toBeInTheDocument();
    expect(
      screen.getByText(/No history suggestions found for this wardrobe item yet/i)
    ).toBeInTheDocument();
  });

  it('opens history from menu when history links by source_wardrobe_item_id', async () => {
    const itemWithImage: WardrobeItem = {
      ...mockWardrobeItem,
      id: 99,
      image_data: 'current-item-image',
    };
    mockWardrobeItems.push(itemWithImage);

    jest.spyOn(ApiService, 'getOutfitHistory').mockResolvedValue([
      {
        id: 303,
        created_at: '2026-05-04T12:00:00.000Z',
        text_input: 'Linked by source item id',
        image_data: 'different-image-data',
        model_image: null,
        shirt: 'Blue shirt',
        trouser: 'Gray trousers',
        blazer: 'Navy blazer',
        shoes: 'Black shoes',
        belt: 'Black belt',
        reasoning: 'Linked entry',
        source_wardrobe_item_id: 99,
      },
    ]);

    render(<Wardrobe />);

    openItemMenu(99);
    fireEvent.click(screen.getByRole('menuitem', { name: /^History$/i }));
    expect(await screen.findByRole('heading', { name: /History Suggestions/i })).toBeInTheDocument();
  });

  it('opens history from menu when history links by shirt_id', async () => {
    const shirtItem: WardrobeItem = {
      ...mockWardrobeItem,
      id: 501,
      category: 'shirt',
      image_data: 'shirt-image',
    };
    mockWardrobeItems.push(shirtItem);

    jest.spyOn(ApiService, 'getOutfitHistory').mockResolvedValue([
      {
        id: 404,
        created_at: '2026-05-06T09:00:00.000Z',
        text_input: 'linked by shirt id',
        image_data: null,
        model_image: null,
        shirt: 'Blue oxford shirt',
        trouser: 'Gray chinos',
        blazer: 'Navy blazer',
        shoes: 'Black shoes',
        belt: 'Black belt',
        reasoning: 'Linked via shirt_id.',
        shirt_id: 501,
      },
    ]);

    render(<Wardrobe />);

    openItemMenu(501);
    fireEvent.click(screen.getByRole('menuitem', { name: /^History$/i }));
    expect(await screen.findByRole('heading', { name: /History Suggestions/i })).toBeInTheDocument();
  });

  it('opens full-screen image viewer from View image menu item', () => {
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });
    render(<Wardrobe />);

    openItemMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /View image/i }));

    expect(screen.getByAltText('Full size view')).toBeInTheDocument();
  });
});
