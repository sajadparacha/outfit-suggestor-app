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

describe('Wardrobe page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWardrobeItems.length = 0;
  });

  it('loads the wardrobe page and shows the page header', () => {
    render(<Wardrobe />);
    expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Add items to get personalized outfit suggestions/i).length).toBeGreaterThanOrEqual(1);
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

  it('Add modal displays image size limit and accept attribute', () => {
    render(<Wardrobe />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Your First Item' }));
    expect(screen.getByText(/JPG, PNG, WebP up to 10MB/i)).toBeInTheDocument();
    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBeGreaterThan(0);
    const firstInput = inputs[0] as HTMLInputElement;
    expect(firstInput.accept).toBe('image/jpeg,image/jpg,image/png,image/webp');
  });

  it('loads history suggestions for an item and allows selecting one', async () => {
    const itemWithImage: WardrobeItem = {
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    };
    mockWardrobeItems.push(itemWithImage);

    const onSuggestionReady = jest.fn();
    const onNavigateToMain = jest.fn();
    const onSourceImageLoaded = jest.fn();
    const setImage = jest.fn();
    const setSourceWardrobeItemId = jest.fn();

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
          setSourceWardrobeItemId,
          getSuggestion: jest.fn(),
          loading: false,
          error: null,
          showDuplicateModal: false,
          handleUseCachedSuggestion: jest.fn(),
        }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /Past Suggestions/i }));
    expect(await screen.findByRole('heading', { name: /History Suggestions/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Use This/i }));

    await waitFor(() => {
      expect(setSourceWardrobeItemId).toHaveBeenCalledWith(1);
      expect(setImage).toHaveBeenCalledTimes(1);
      expect(onSourceImageLoaded).toHaveBeenCalledTimes(1);
      expect(onSuggestionReady).toHaveBeenCalledTimes(1);
      expect(onNavigateToMain).toHaveBeenCalledTimes(1);
    });

    fetchSpy.mockRestore();
  });

  it('does not show history suggestions button when item has no history', async () => {
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

    await waitFor(() => {
      expect(ApiService.getOutfitHistory).toHaveBeenCalled();
    });
    expect(screen.queryByRole('button', { name: /Past Suggestions/i })).not.toBeInTheDocument();
  });

  it('shows history suggestions button when history links by source_wardrobe_item_id', async () => {
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

    expect(await screen.findByRole('button', { name: /Past Suggestions/i })).toBeInTheDocument();
  });

  it('shows history suggestions button when history links by shirt_id', async () => {
    const shirtItem: WardrobeItem = {
      ...mockWardrobeItem,
      id: 501,
      category: 'shirt',
      image_data: null,
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

    expect(await screen.findByRole('button', { name: /Past Suggestions/i })).toBeInTheDocument();
  });
});
