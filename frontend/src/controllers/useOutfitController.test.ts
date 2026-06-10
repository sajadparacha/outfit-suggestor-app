import { renderHook, act } from '@testing-library/react';
import { useOutfitController } from './useOutfitController';
import ApiService from '../services/ApiService';
import { OUTFIT_VARIATION_MODIFIERS } from '../utils/outfitPromptUtils';
import { GuestLimitReachedError } from '../models/GuestModels';
import { DEFAULT_FILTERS } from '../utils/outfitPreferences';
import type { OutfitSuggestion } from '../models/OutfitModels';

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
