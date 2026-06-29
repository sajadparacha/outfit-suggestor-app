import { renderHook, act } from '@testing-library/react';
import { useOutfitController } from './useOutfitController';
import ApiService from '../services/ApiService';
import { OUTFIT_VARIATION_MODIFIERS } from '../utils/outfitPromptUtils';
import { GuestLimitReachedError } from '../models/GuestModels';
import { DEFAULT_FILTERS } from '../utils/outfitPreferences';
import type { OutfitHistoryEntry, OutfitSuggestion } from '../models/OutfitModels';

jest.mock('../utils/imageUtils', () => ({
  compressImageForOutfit: async (file: File) => file,
  compressImageForWardrobe: async (file: File) => file,
}));

const mockApiResponse = {
  shirt: 'Blue shirt',
  trouser: 'Gray trousers',
  blazer: 'Navy blazer',
  shoes: 'Black shoes',
  belt: 'Black belt',
  reasoning: 'Test reasoning',
};

describe('useOutfitController getSuggestion variations', () => {
  const uploadFile = new File(['photo-bytes'], 'shirt.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockResolvedValue(mockApiResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const seedSuggestionState = (hook: { result: { current: ReturnType<typeof useOutfitController> } }) => {
    const previous: OutfitSuggestion = {
      id: 'prev-1',
      ...mockApiResponse,
    };
    act(() => {
      hook.result.current.setImage(uploadFile);
      hook.result.current.setCurrentSuggestion(previous);
    });
  };

  it('sends previous outfit text when alternateFromPrevious is true', async () => {
    const hook = renderHook(() => useOutfitController());
    seedSuggestionState(hook);

    await act(async () => {
      await hook.result.current.getSuggestion(true, undefined, true);
    });

    const call = (ApiService.getSuggestion as jest.Mock).mock.calls[0];
    expect(call[7]).toMatch(/Blue shirt/);
    expect(call[7]).toMatch(/Test reasoning/);
  });

  it('appends promptModifier for formal variation', async () => {
    const hook = renderHook(() => useOutfitController());
    seedSuggestionState(hook);

    await act(async () => {
      await hook.result.current.getSuggestion(true, undefined, true, {
        promptModifier: OUTFIT_VARIATION_MODIFIERS.moreFormal,
      });
    });

    const prompt = (ApiService.getSuggestion as jest.Mock).mock.calls[0][1] as string;
    expect(prompt).toContain(OUTFIT_VARIATION_MODIFIERS.moreFormal);
  });

  it('enables wardrobe-only mode when forceWardrobeOnly is set', async () => {
    const hook = renderHook(() => useOutfitController());
    seedSuggestionState(hook);

    await act(async () => {
      await hook.result.current.getSuggestion(true, undefined, true, {
        promptModifier: OUTFIT_VARIATION_MODIFIERS.wardrobeOnly,
        forceWardrobeOnly: true,
      });
    });

    const call = (ApiService.getSuggestion as jest.Mock).mock.calls[0];
    expect(call[1]).toContain(OUTFIT_VARIATION_MODIFIERS.wardrobeOnly);
    expect(call[5]).toBe(true);
    expect(hook.result.current.useWardrobeOnly).toBe(true);
  });

  it('calls onGuestLimitReached when API returns guest limit error', async () => {
    const onGuestLimitReached = jest.fn();
    jest.spyOn(ApiService, 'getSuggestion').mockRejectedValue(
      new GuestLimitReachedError('Limit reached')
    );

    const hook = renderHook(() => useOutfitController({ onGuestLimitReached }));
    seedSuggestionState(hook);

    await act(async () => {
      await hook.result.current.getSuggestion(true);
    });

    expect(onGuestLimitReached).toHaveBeenCalledTimes(1);
    expect(hook.result.current.error).toBeNull();
  });
});

describe('useOutfitController prepareStyleFromWardrobeItem', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      blob: async () => new Blob(['image'], { type: 'image/jpeg' }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads image, sets source item, and clears previous result and preview state', async () => {
    const hook = renderHook(() => useOutfitController());
    const uploadFile = new File(['photo-bytes'], 'shirt.jpg', { type: 'image/jpeg' });

    act(() => {
      hook.result.current.setImage(uploadFile);
      hook.result.current.setCurrentSuggestion({
        id: 'prev-1',
        ...mockApiResponse,
      });
      hook.result.current.setFlowPreviewUrl('blob:preview');
      hook.result.current.setFlowPreviewCaption('Random from wardrobe');
    });

    await act(async () => {
      await hook.result.current.prepareStyleFromWardrobeItem({
        id: 7,
        category: 'shirt',
        color: 'Blue',
        image_data: 'base64-image-data',
        name: null,
        description: null,
        brand: null,
        size: null,
        tags: null,
        condition: null,
        wear_count: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      });
    });

    expect(hook.result.current.currentSuggestion).toBeNull();
    expect(hook.result.current.flowPreviewUrl).toBeNull();
    expect(hook.result.current.flowPreviewCaption).toBeNull();
    expect(hook.result.current.sourceWardrobeItem).toEqual({
      id: 7,
      category: 'shirt',
      color: 'Blue',
    });
    expect(hook.result.current.image).toBeInstanceOf(File);
    expect(hook.result.current.image?.name).toBe('wardrobe-item-7.jpg');
  });
});

describe('useOutfitController resetMainFlowState', () => {
  const uploadFile = new File(['photo-bytes'], 'shirt.jpg', { type: 'image/jpeg' });

  it('clears image, suggestion, source item, error, duplicate modal, and preferences', () => {
    const hook = renderHook(() => useOutfitController());

    act(() => {
      hook.result.current.setImage(uploadFile);
      hook.result.current.setCurrentSuggestion({
        id: 'seed-1',
        shirt: 'Blue shirt',
        trouser: 'Gray trousers',
        blazer: 'Navy blazer',
        shoes: 'Black shoes',
        belt: 'Black belt',
        reasoning: 'Test reasoning',
      });
      hook.result.current.setSourceWardrobeItem({ id: 42, category: 'shirt', color: 'Blue' });
      hook.result.current.setShowDuplicateModal(true);
      hook.result.current.setUseWardrobeOnly(true);
      hook.result.current.setFilters({ occasion: 'formal', season: 'winter', style: 'classic' });
      hook.result.current.setPreferenceText('No stripes');
    });

    act(() => {
      hook.result.current.resetMainFlowState();
    });

    expect(hook.result.current.image).toBeNull();
    expect(hook.result.current.currentSuggestion).toBeNull();
    expect(hook.result.current.sourceWardrobeItem).toBeNull();
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.showDuplicateModal).toBe(false);
    expect(hook.result.current.useWardrobeOnly).toBe(false);
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.filters).toEqual(DEFAULT_FILTERS);
    expect(hook.result.current.preferenceText).toBe('');
  });

  it('clears error from a failed suggestion request', async () => {
    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockRejectedValue(new Error('Network error'));

    const hook = renderHook(() => useOutfitController());

    act(() => {
      hook.result.current.setImage(uploadFile);
    });

    await act(async () => {
      await hook.result.current.getSuggestion(true);
    });

    expect(hook.result.current.error).toBe('Network error');

    act(() => {
      hook.result.current.resetMainFlowState();
    });

    expect(hook.result.current.error).toBeNull();
  });

  it('cancels in-flight getSuggestion', () => {
    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockImplementation(() => new Promise(() => {}));

    const hook = renderHook(() => useOutfitController());

    act(() => {
      hook.result.current.setImage(uploadFile);
    });

    act(() => {
      void hook.result.current.getSuggestion(true);
    });

    expect(hook.result.current.loading).toBe(true);

    act(() => {
      hook.result.current.resetMainFlowState();
    });

    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.image).toBeNull();
    expect(hook.result.current.activeOperation).toBeNull();
  });
});

describe('useOutfitController loadRandomFromHistory', () => {
  const historyEntry: OutfitHistoryEntry = {
    id: 42,
    created_at: '2024-01-01T00:00:00Z',
    text_input: '',
    image_data: null,
    model_image: null,
    shirt: 'White shirt',
    trouser: 'Blue jeans',
    blazer: 'No blazer',
    shoes: 'Sneakers',
    belt: 'Brown belt',
    reasoning: 'Test look',
  };

  it('sets loading and random-history operation while fetching', async () => {
    let resolveFetch: (entries: OutfitHistoryEntry[]) => void = () => {};
    const fetchHistory = jest.fn(
      () =>
        new Promise<OutfitHistoryEntry[]>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const hook = renderHook(() => useOutfitController());

    let loadPromise: Promise<unknown>;
    act(() => {
      loadPromise = hook.result.current.loadRandomFromHistory(fetchHistory);
    });

    expect(hook.result.current.loading).toBe(true);
    expect(hook.result.current.activeOperation).toBe('random-history');
    expect(hook.result.current.loadingMessage).toBe('Picking a random look from your history...');

    await act(async () => {
      resolveFetch([historyEntry]);
      await loadPromise!;
    });

    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.activeOperation).toBeNull();
    expect(hook.result.current.currentSuggestion?.shirt).toBe('White shirt');
  });

  it('clears loading state when history is empty', async () => {
    const hook = renderHook(() => useOutfitController());

    await act(async () => {
      const result = await hook.result.current.loadRandomFromHistory(async () => []);
    });

    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.activeOperation).toBeNull();
  });

  it('cancels in-flight random history load', async () => {
    const fetchHistory = jest.fn(() => new Promise<OutfitHistoryEntry[]>(() => {}));
    const hook = renderHook(() => useOutfitController());

    act(() => {
      void hook.result.current.loadRandomFromHistory(fetchHistory);
    });

    expect(hook.result.current.loading).toBe(true);
    expect(hook.result.current.activeOperation).toBe('random-history');

    act(() => {
      hook.result.current.cancelOperation();
    });

    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.activeOperation).toBeNull();
  });
});

describe('useOutfitController getRandomSuggestion', () => {
  beforeEach(() => {
    jest.spyOn(ApiService, 'getWardrobeOnlySuggestion').mockResolvedValue(mockApiResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets loading and wardrobe-outfit operation before API call', async () => {
    let resolveApi: (value: typeof mockApiResponse) => void = () => {};
    jest.spyOn(ApiService, 'getWardrobeOnlySuggestion').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        })
    );

    const hook = renderHook(() => useOutfitController());

    let loadPromise: Promise<void>;
    act(() => {
      loadPromise = hook.result.current.getRandomSuggestion();
    });

    expect(hook.result.current.loading).toBe(true);
    expect(hook.result.current.activeOperation).toBe('wardrobe-outfit');
    expect(hook.result.current.loadingMessage).toBe('Scanning your wardrobe...');

    await act(async () => {
      resolveApi(mockApiResponse);
      await loadPromise!;
    });

    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.activeOperation).toBeNull();
  });
});
