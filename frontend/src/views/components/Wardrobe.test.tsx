import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Wardrobe from './Wardrobe';
import type { WardrobeItem } from '../../models/WardrobeModels';
import ApiService from '../../services/ApiService';

// Mock state: shared array so we can test both empty and with-items in one file
const mockWardrobeItems: WardrobeItem[] = [];

const mockSummary = {
  total_items: 0,
  by_category: {} as Record<string, number>,
  by_color: {},
  categories: [] as string[],
};

const mockLoadWardrobe = jest.fn();
const mockLoadSummary = jest.fn();
const mockAnalyzeImage = jest.fn();
const mockAddItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockDeleteItem = jest.fn();
const mockSetSelectedCategory = jest.fn((category: string | null) => {
  mockSelectedCategory = category;
});
let mockSelectedCategory: string | null = null;
const mockSetSearchQuery = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../controllers/useWardrobeController', () => ({
  useWardrobeController: () => ({
    wardrobeItems: mockWardrobeItems,
    summary: mockSummary,
    loading: false,
    error: null,
    selectedCategory: mockSelectedCategory,
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

const defaultOutfitControllerPrefs = {
  filters: { occasion: 'everyday', season: 'all-season', style: 'classic' },
  setFilters: jest.fn(),
  preferenceText: '',
  setPreferenceText: jest.fn(),
  useWardrobeOnly: false,
  setUseWardrobeOnly: jest.fn(),
};

const outfitControllerWithPrefs = (overrides: Record<string, unknown> = {}) => ({
  setImage: jest.fn(),
  setSourceWardrobeItem: jest.fn(),
  getSuggestion: jest.fn(),
  loading: false,
  error: null,
  showDuplicateModal: false,
  handleUseCachedSuggestion: jest.fn(),
  ...defaultOutfitControllerPrefs,
  ...overrides,
});

const openItemMenu = (itemId = 1) => {
  fireEvent.click(screen.getByTestId(`wardrobe-item-menu-${itemId}`));
};

const clickPastSuggestionsFromMenu = (itemId = 1) => {
  openItemMenu(itemId);
  fireEvent.click(screen.getByTestId(`wardrobe-menu-past-suggestions-${itemId}`));
};

describe('Wardrobe page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWardrobeItems.length = 0;
    mockSummary.total_items = 0;
    mockSummary.by_category = {};
    mockSummary.categories = [];
    mockSelectedCategory = null;
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
    mockSummary.total_items = 1;
    mockSummary.by_category = { shirt: 1 };
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

  it('renders one outfit-completion action per card and keeps Style this item distinct', () => {
    localStorage.setItem('wardrobe_flow_tip_dismissed', 'true');
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });

    render(<Wardrobe />);

    const card = screen.getByTestId('wardrobe-item-card-1');
    const outfitCompletionButtons = within(card)
      .getAllByRole('button')
      .filter((button) => /outfit completion/i.test(button.getAttribute('aria-label') ?? ''));

    expect(outfitCompletionButtons).toHaveLength(1);
    expect(within(card).getByRole('button', { name: /Add shirt to outfit completion/i }))
      .toHaveTextContent('Add to outfit completion');

    const styleButton = within(card).getByRole('button', { name: /Style this item with AI/i });
    expect(styleButton).toHaveTextContent('Style this item');
    expect(styleButton).toHaveTextContent('Single-item Suggest flow');
    expect(styleButton).not.toHaveTextContent(/Add to outfit completion|Remove from outfit completion/i);
  });

  it('opens overflow menu with View image, Edit, Past Suggestions, and Delete in order', () => {
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });
    render(<Wardrobe />);

    openItemMenu();

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.map((item) => item.textContent?.trim())).toEqual([
      'View image',
      'Edit',
      'Past Suggestions',
      'Delete',
    ]);
    expect(screen.queryByRole('menuitem', { name: /^History$/i })).not.toBeInTheDocument();
  });

  it('uses overflow-visible on card wrapper and opens menu downward below trigger', () => {
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });
    render(<Wardrobe />);

    const cardWrapper = screen.getByTestId('wardrobe-item-card-1');
    expect(cardWrapper).toHaveClass('overflow-visible');
    expect(cardWrapper).not.toHaveClass('overflow-hidden');

    const thumbnail = cardWrapper.querySelector('img')?.parentElement;
    expect(thumbnail).toHaveClass('overflow-hidden');

    openItemMenu();

    const menu = screen.getByRole('menu');
    expect(menu).toHaveClass('top-full');
    expect(menu).toHaveClass('mt-1');
    expect(menu).toHaveClass('z-50');
    expect(menu).not.toHaveClass('bottom-full');
  });

  it('elevates card z-index when overflow menu is open', () => {
    mockWardrobeItems.push(
      { ...mockWardrobeItem, id: 1, image_data: 'base64-image-a' },
      {
        ...mockWardrobeItem,
        id: 2,
        description: 'Second shirt',
        color: 'Red',
        image_data: 'base64-image-b',
      }
    );
    render(<Wardrobe />);

    const firstCard = screen.getByTestId('wardrobe-item-card-1');
    const secondCard = screen.getByTestId('wardrobe-item-card-2');

    expect(firstCard).not.toHaveClass('relative');
    expect(firstCard).not.toHaveClass('z-50');

    openItemMenu(1);

    expect(firstCard).toHaveClass('relative');
    expect(firstCard).toHaveClass('z-50');
    expect(secondCard).not.toHaveClass('z-50');

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(4);
    expect(menuItems.map((item) => item.textContent?.trim())).toEqual([
      'View image',
      'Edit',
      'Past Suggestions',
      'Delete',
    ]);
  });

  it('shows Past Suggestions in overflow menu and no standalone button on card', () => {
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });
    render(<Wardrobe />);

    expect(screen.queryByTestId('wardrobe-past-suggestions-1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete item/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit item/i })).not.toBeInTheDocument();

    openItemMenu();
    expect(screen.getByTestId('wardrobe-menu-past-suggestions-1')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Past Suggestions$/i })).toBeInTheDocument();
  });

  it('keeps Past Suggestions enabled when item has no image but Style this item is disabled', () => {
    mockWardrobeItems.push(mockWardrobeItem);
    render(<Wardrobe />);

    expect(screen.getByRole('button', { name: /Style this item with AI/i })).toBeDisabled();

    openItemMenu();
    expect(screen.getByRole('menuitem', { name: /^Past Suggestions$/i })).not.toBeDisabled();
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

  it('Style this item prepares suggest flow via prepareStyleFromWardrobeItem', async () => {
    const itemWithImage: WardrobeItem = {
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    };
    mockWardrobeItems.push(itemWithImage);

    const onNavigateToMain = jest.fn();
    const onSourceImageLoaded = jest.fn();
    const prepareStyleFromWardrobeItem = jest.fn().mockResolvedValue(undefined);

    render(
      <Wardrobe
        onNavigateToMain={onNavigateToMain}
        onSourceImageLoaded={onSourceImageLoaded}
        outfitController={{
          setImage: jest.fn(),
          setSourceWardrobeItem: jest.fn(),
          prepareStyleFromWardrobeItem,
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
      expect(prepareStyleFromWardrobeItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, category: 'shirt', image_data: 'base64-image-a' })
      );
      expect(onSourceImageLoaded).toHaveBeenCalledTimes(1);
      expect(onNavigateToMain).toHaveBeenCalledTimes(1);
    });
  });

  it('enables Complete outfit with AI when one eligible item is selected', async () => {
    mockWardrobeItems.push(
      { ...mockWardrobeItem, id: 1, category: 'shirt', description: 'Blue shirt' },
      { ...mockWardrobeItem, id: 2, category: 'trouser', description: 'Navy trousers', color: 'Navy' }
    );

    const completeOutfitFromWardrobeSelection = jest.fn().mockResolvedValue(undefined);
    const onNavigateToMain = jest.fn();

    render(
      <Wardrobe
        onNavigateToMain={onNavigateToMain}
        outfitController={{
          setImage: jest.fn(),
          setSourceWardrobeItem: jest.fn(),
          getSuggestion: jest.fn(),
          completeOutfitFromWardrobeSelection,
          loading: false,
          error: null,
          showDuplicateModal: false,
          handleUseCachedSuggestion: jest.fn(),
        }}
      />
    );

    const action = screen.getByRole('button', { name: /Select at least 1 item/i });
    expect(action).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Add shirt to outfit completion/i }));
    const readyAction = screen.getByRole('button', { name: /Complete outfit with AI/i });
    expect(readyAction).not.toBeDisabled();

    fireEvent.click(readyAction);

    await waitFor(() => {
      expect(completeOutfitFromWardrobeSelection).toHaveBeenCalledWith([1]);
      expect(onNavigateToMain).toHaveBeenCalledTimes(1);
    });
  });

  it('treats shirt and trouser aliases as eligible outfit-completion slots', () => {
    mockWardrobeItems.push(
      { ...mockWardrobeItem, id: 1, category: 'polo', description: 'Navy polo' },
      { ...mockWardrobeItem, id: 2, category: 't-shirt', description: 'White T-shirt', color: 'White' },
      { ...mockWardrobeItem, id: 3, category: 't_shirt', description: 'Training T-shirt', color: 'Gray' },
      { ...mockWardrobeItem, id: 4, category: 'pants', description: 'Khaki pants', color: 'Khaki' },
      { ...mockWardrobeItem, id: 5, category: 'jeans', description: 'Blue jeans', color: 'Blue' },
      { ...mockWardrobeItem, id: 6, category: 'shorts', description: 'Tan shorts', color: 'Tan' }
    );

    render(<Wardrobe />);

    const aliasSlots = [
      { category: 'polo', summary: '1 selected: shirt' },
      { category: 't-shirt', summary: '1 selected: shirt' },
      { category: 't_shirt', summary: '1 selected: shirt' },
      { category: 'pants', summary: '1 selected: trousers' },
      { category: 'jeans', summary: '1 selected: trousers' },
      { category: 'shorts', summary: '1 selected: trousers' },
    ];

    aliasSlots.forEach(({ category }) => {
      const button = screen.getByRole('button', { name: new RegExp(`Add ${category} to outfit completion`, 'i') });
      expect(button).toBeEnabled();
      expect(button).toHaveTextContent('Add to outfit completion');
    });
    expect(screen.queryByText('Outfit completion unavailable')).not.toBeInTheDocument();

    aliasSlots.forEach(({ category, summary }) => {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Add ${category} to outfit completion`, 'i') }));

      const selectedButton = screen.getByRole('button', { name: new RegExp(`Remove ${category} from outfit completion`, 'i') });
      expect(selectedButton).toHaveTextContent('Remove from outfit completion');
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('wardrobe-selection-status')).toHaveTextContent(summary);

      fireEvent.click(selectedButton);
    });

    fireEvent.click(screen.getByRole('button', { name: /Add polo to outfit completion/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add pants to outfit completion/i }));
    expect(screen.getByTestId('wardrobe-selection-status')).toHaveTextContent('2 selected: shirt, trousers');
    expect(screen.getByRole('button', { name: /Complete outfit with AI/i })).not.toBeDisabled();
  });

  it('prevents duplicate outfit-slot selections with clear copy', () => {
    mockWardrobeItems.push(
      { ...mockWardrobeItem, id: 1, category: 'shirt', description: 'Blue shirt' },
      { ...mockWardrobeItem, id: 2, category: 'polo', description: 'White polo', color: 'White' }
    );

    render(<Wardrobe />);

    fireEvent.click(screen.getByRole('button', { name: /Add shirt to outfit completion/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add polo to outfit completion/i }));

    expect(screen.getByText('Choose one item per outfit slot')).toBeInTheDocument();
    expect(screen.getAllByText('Remove from outfit completion')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Complete outfit with AI/i })).not.toBeDisabled();
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

  it('shows progress panel while loading past suggestions', async () => {
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      image_data: 'base64-image-a',
    });

    let resolveHistory!: (value: unknown[]) => void;
    const historyPromise = new Promise<unknown[]>((resolve) => {
      resolveHistory = resolve;
    });
    jest.spyOn(ApiService, 'getOutfitHistory').mockReturnValue(historyPromise as ReturnType<typeof ApiService.getOutfitHistory>);

    render(<Wardrobe />);
    clickPastSuggestionsFromMenu();

    expect(screen.getByText('Loading past suggestions')).toBeInTheDocument();
    expect(screen.getByText('Loading your saved looks')).toBeInTheDocument();
    expect(screen.getByText(/Loading your saved looks…/i)).toBeInTheDocument();

    resolveHistory([]);
    await waitFor(() => {
      expect(screen.queryByText('Loading past suggestions')).not.toBeInTheDocument();
    });
  });

  it('loads history suggestions via Past Suggestions menu item and allows selecting one', async () => {
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

    clickPastSuggestionsFromMenu();
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

    clickPastSuggestionsFromMenu();

    expect(await screen.findByRole('heading', { name: /History Suggestions/i })).toBeInTheDocument();
    expect(
      screen.getByText(/No history suggestions found for this wardrobe item yet/i)
    ).toBeInTheDocument();
  });

  it('opens history from Past Suggestions when history links by source_wardrobe_item_id', async () => {
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

    clickPastSuggestionsFromMenu(99);
    expect(await screen.findByRole('heading', { name: /History Suggestions/i })).toBeInTheDocument();
  });

  it('opens history from Past Suggestions when history links by shirt_id', async () => {
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

    clickPastSuggestionsFromMenu(501);
    expect(await screen.findByRole('heading', { name: /History Suggestions/i })).toBeInTheDocument();
  });

  it('opens history modal from Past Suggestions when item has no image', async () => {
    const itemNoImage: WardrobeItem = {
      ...mockWardrobeItem,
      id: 77,
    };
    mockWardrobeItems.push(itemNoImage);

    jest.spyOn(ApiService, 'getOutfitHistory').mockResolvedValue([
      {
        id: 505,
        created_at: '2026-05-06T10:00:00.000Z',
        text_input: 'linked by source id without image',
        image_data: null,
        model_image: null,
        shirt: 'White shirt',
        trouser: 'Black trousers',
        blazer: 'None',
        shoes: 'Sneakers',
        belt: 'Brown belt',
        reasoning: 'Linked via source_wardrobe_item_id.',
        source_wardrobe_item_id: 77,
      },
    ]);

    render(<Wardrobe />);

    clickPastSuggestionsFromMenu(77);
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

  it('renders Preferences section with Occasion, Season, Style, and Notes when outfit controller provides prefs', () => {
    mockWardrobeItems.push(
      { ...mockWardrobeItem, id: 1, category: 'shirt', description: 'Blue shirt' },
      { ...mockWardrobeItem, id: 2, category: 'trouser', description: 'Navy trousers', color: 'Navy' }
    );

    render(<Wardrobe isAuthenticated outfitController={outfitControllerWithPrefs()} />);

    expect(screen.getByTestId('wardrobe-completion-preferences')).toBeInTheDocument();
    expect(screen.getByText('Shared with Suggest — occasion, season, style, and notes stay in sync across outfit suggestions and wardrobe insights.')).toBeInTheDocument();
    expect(screen.getByLabelText('Select occasion')).toBeInTheDocument();
    expect(screen.getByLabelText('Select season')).toBeInTheDocument();
    expect(screen.getByLabelText('Select style preference')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('shows selection summary with slot names when multiple items are selected', () => {
    mockWardrobeItems.push(
      { ...mockWardrobeItem, id: 1, category: 'shirt', description: 'Blue shirt' },
      { ...mockWardrobeItem, id: 2, category: 'trouser', description: 'Navy trousers', color: 'Navy' }
    );

    render(<Wardrobe outfitController={outfitControllerWithPrefs()} />);

    fireEvent.click(screen.getByRole('button', { name: /Add shirt to outfit completion/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add trouser to outfit completion/i }));

    expect(screen.getByTestId('wardrobe-selection-status')).toHaveTextContent('2 selected: shirt, trousers');
  });

  describe('completion selection thumbnails', () => {
    it('renders thumbnails in selection order when items with images are selected', () => {
      mockWardrobeItems.push(
        { ...mockWardrobeItem, id: 1, category: 'shirt', description: 'Blue shirt', image_data: 'shirt-thumb' },
        { ...mockWardrobeItem, id: 2, category: 'trouser', description: 'Navy trousers', color: 'Navy', image_data: 'trouser-thumb' }
      );

      render(<Wardrobe />);

      expect(screen.queryByTestId('wardrobe-selection-thumbnails')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Add shirt to outfit completion/i }));
      expect(screen.getByTestId('wardrobe-selection-thumbnails')).toBeInTheDocument();
      expect(screen.getByTestId('wardrobe-selection-thumb-1')).toBeInTheDocument();
      expect(screen.queryByTestId('wardrobe-selection-thumb-2')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Add trouser to outfit completion/i }));

      const row = screen.getByTestId('wardrobe-selection-thumbnails');
      expect(screen.getByTestId('wardrobe-selection-thumb-1')).toBeInTheDocument();
      expect(screen.getByTestId('wardrobe-selection-thumb-2')).toBeInTheDocument();
      expect(screen.getByTestId('wardrobe-selection-remove-1')).toBeInTheDocument();
      expect(screen.getByTestId('wardrobe-selection-remove-2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View shirt/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View trousers/i })).toBeInTheDocument();
    });

    it('opens the full-size image viewer when a selection thumbnail is clicked', () => {
      mockWardrobeItems.push(
        { ...mockWardrobeItem, id: 1, category: 'shirt', description: 'Blue shirt', image_data: 'shirt-thumb' }
      );

      render(<Wardrobe />);

      fireEvent.click(screen.getByRole('button', { name: /Add shirt to outfit completion/i }));
      fireEvent.click(screen.getByTestId('wardrobe-selection-thumb-1'));

      expect(screen.getByAltText('Full size view')).toHaveAttribute(
        'src',
        'data:image/jpeg;base64,shirt-thumb'
      );
    });

    it('omits items without image_data from the thumbnail row', () => {
      mockWardrobeItems.push(
        { ...mockWardrobeItem, id: 1, category: 'shirt', description: 'Blue shirt', image_data: 'shirt-thumb' },
        { ...mockWardrobeItem, id: 2, category: 'trouser', description: 'Navy trousers', color: 'Navy', image_data: null }
      );

      render(<Wardrobe />);

      fireEvent.click(screen.getByRole('button', { name: /Add shirt to outfit completion/i }));
      fireEvent.click(screen.getByRole('button', { name: /Add trouser to outfit completion/i }));

      expect(screen.getByTestId('wardrobe-selection-status')).toHaveTextContent('2 selected: shirt, trousers');
      expect(screen.getByTestId('wardrobe-selection-thumbnails')).toBeInTheDocument();
      expect(screen.getByTestId('wardrobe-selection-thumb-1')).toBeInTheDocument();
      expect(screen.queryByTestId('wardrobe-selection-thumb-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('wardrobe-selection-remove-1')).toBeInTheDocument();
      expect(screen.queryByTestId('wardrobe-selection-remove-2')).not.toBeInTheDocument();
    });

    it('removes one selected item via thumbnail remove control and keeps preview working', () => {
      mockWardrobeItems.push(
        { ...mockWardrobeItem, id: 1, category: 'shirt', description: 'Blue shirt', image_data: 'shirt-thumb' },
        { ...mockWardrobeItem, id: 2, category: 'trouser', description: 'Navy trousers', color: 'Navy', image_data: 'trouser-thumb' }
      );

      render(<Wardrobe />);

      fireEvent.click(screen.getByRole('button', { name: /Add shirt to outfit completion/i }));
      fireEvent.click(screen.getByRole('button', { name: /Add trouser to outfit completion/i }));
      expect(screen.getByTestId('wardrobe-selection-status')).toHaveTextContent('2 selected: shirt, trousers');

      expect(screen.getByRole('button', { name: 'Remove shirt' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove trousers' })).toBeInTheDocument();
      // Card toggle keeps a distinct accessible name from the thumbnail ✕.
      expect(screen.getByRole('button', { name: /Remove shirt from outfit completion/i })).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('wardrobe-selection-remove-1'));

      expect(screen.getByTestId('wardrobe-selection-status')).toHaveTextContent('1 selected: trousers');
      expect(screen.queryByTestId('wardrobe-selection-thumb-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('wardrobe-selection-thumb-2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add shirt to outfit completion/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Complete outfit with AI/i })).not.toBeDisabled();

      fireEvent.click(screen.getByTestId('wardrobe-selection-thumb-2'));
      expect(screen.getByAltText('Full size view')).toHaveAttribute(
        'src',
        'data:image/jpeg;base64,trouser-thumb'
      );
    });
  });

  it('shows Use my wardrobe only checkbox when authenticated and prefs are wired', () => {
    mockWardrobeItems.push({ ...mockWardrobeItem, id: 1, category: 'shirt' });

    render(<Wardrobe isAuthenticated outfitController={outfitControllerWithPrefs()} />);

    expect(screen.getByLabelText('Use my wardrobe only')).toBeInTheDocument();
    expect(screen.getByText('Only recommend items from your saved wardrobe.')).toBeInTheDocument();
  });

  it('hides Use my wardrobe only checkbox when not authenticated', () => {
    mockWardrobeItems.push({ ...mockWardrobeItem, id: 1, category: 'shirt' });

    render(<Wardrobe isAuthenticated={false} outfitController={outfitControllerWithPrefs()} />);

    expect(screen.queryByLabelText('Use my wardrobe only')).not.toBeInTheDocument();
  });

  it('always renders core filter chips', () => {
    mockSummary.total_items = 2;
    mockSummary.by_category = { shirt: 1, trouser: 1 };
    mockWardrobeItems.push(
      { ...mockWardrobeItem, id: 1, category: 'shirt' },
      { ...mockWardrobeItem, id: 2, category: 'trouser', description: 'Navy trousers', color: 'Navy' }
    );

    render(<Wardrobe />);

    expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Shirt\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trousers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Blazer\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Shoes\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Belt\b/i })).toBeInTheDocument();
  });

  it('renders extended filter chips when summary has matching counts', () => {
    mockSummary.total_items = 4;
    mockSummary.by_category = { polo: 1, t_shirt: 1, jeans: 1, watch: 1 };
    mockWardrobeItems.push(
      { ...mockWardrobeItem, id: 1, category: 'polo', description: 'Navy polo' },
      { ...mockWardrobeItem, id: 2, category: 't_shirt', description: 'White tee', color: 'White' },
      { ...mockWardrobeItem, id: 3, category: 'jeans', description: 'Blue jeans', color: 'Blue' },
      { ...mockWardrobeItem, id: 4, category: 'watch', description: 'Sport watch', color: 'Black' }
    );

    render(<Wardrobe />);

    expect(screen.getByRole('button', { name: /^Polo\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /T-shirt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Jeans\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Other\b/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Shorts\b/i })).not.toBeInTheDocument();
  });

  it('shows human-readable category badge on item cards', () => {
    mockSummary.total_items = 1;
    mockSummary.by_category = { t_shirt: 1 };
    mockWardrobeItems.push({
      ...mockWardrobeItem,
      category: 't_shirt',
      description: 'Training tee',
    });

    render(<Wardrobe />);

    const card = screen.getByTestId('wardrobe-item-card-1');
    expect(within(card).getByText('T-shirt')).toBeInTheDocument();
    expect(within(card).queryByText('t_shirt')).not.toBeInTheDocument();
  });

  it('keeps shirt filter selected and shows filtered items after chip click', () => {
    mockSummary.total_items = 2;
    mockSummary.by_category = { shirt: 1, trouser: 1 };
    mockWardrobeItems.push(
      { ...mockWardrobeItem, id: 1, category: 'shirt', description: 'Blue shirt' },
      { ...mockWardrobeItem, id: 2, category: 'trouser', description: 'Navy trousers', color: 'Navy' }
    );

    const { rerender } = render(<Wardrobe />);

    fireEvent.click(screen.getByRole('button', { name: /^Shirt\b/i }));

    expect(mockSetSelectedCategory).toHaveBeenCalledWith('shirt');
    expect(mockLoadWardrobe).toHaveBeenCalledWith(undefined, undefined, 1, 100);

    mockSelectedCategory = 'shirt';
    rerender(<Wardrobe />);

    expect(screen.getByText('Blue shirt')).toBeInTheDocument();
    expect(screen.queryByText('Navy trousers')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Shirt\b/i })).toHaveClass('btn-brand');
  });
});
