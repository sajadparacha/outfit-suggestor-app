/**
 * Outfit Controller Hook
 * Contains business logic for outfit suggestions
 * This is the "Controller" in the MVC pattern
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { AiOperationType } from '../utils/aiProgressSteps';
import {
  InputPanelSource,
  OutfitHistoryEntry,
  OutfitSuggestion,
  Filters,
  SourceWardrobeItem,
} from '../models/OutfitModels';
import { WardrobeItem } from '../models/WardrobeModels';
import { GuestLimitReachedError } from '../models/GuestModels';
import ApiService from '../services/ApiService';
import { compressImageForOutfit, compressImageForWardrobe, dataUrlToFile } from '../utils/imageUtils';
import { getLocationString } from '../utils/geolocation';
import { formatPreviousOutfitForPrompt } from '../utils/outfitPromptUtils';
import {
  DEFAULT_FILTERS,
  buildSuggestionPrompt,
  loadStoredFilters,
  loadStoredPreferenceText,
  persistOutfitPreferences,
  resolveFilters,
} from '../utils/outfitPreferences';
import { firstWardrobePreviewUrl } from '../utils/outfitItemThumbnail';
import {
  historyEntrySummaryFilters,
  historyEntryToSuggestion,
  resolveSourceWardrobeItemFromSuggestion,
} from '../utils/historyUtils';
import { MAIN_FLOW_UX_COPY } from '../utils/mainFlowUxCopy';

interface UseOutfitControllerReturn {
  // State
  image: File | null;
  loadingMessage: string | null;
  activeOperation: AiOperationType | null;
  filters: Filters;
  preferenceText: string;
  currentSuggestion: OutfitSuggestion | null;
  loading: boolean;
  error: string | null;
  generateModelImage: boolean;
  imageModel: string;
  useWardrobeOnly: boolean;
  existingSuggestion: OutfitSuggestion | null;
  showDuplicateModal: boolean;
  sourceWardrobeItem: SourceWardrobeItem | null;
  flowPreviewUrl: string | null;
  flowPreviewCaption: string | null;
  inputPanelSource: InputPanelSource;
  summaryFilters: Filters | null;
  summaryPreferenceText: string | null;

  // Actions
  setImage: (file: File | null) => void;
  setFilters: (filters: Filters) => void;
  setPreferenceText: (text: string) => void;
  setCurrentSuggestion: (suggestion: OutfitSuggestion | null) => void;
  setGenerateModelImage: (generate: boolean) => void;
  setImageModel: (model: string) => void;
  setUseWardrobeOnly: (use: boolean) => void;
  getSuggestion: (
    skipDuplicateCheck?: boolean,
    sourceImage?: File | null,
    alternateFromPrevious?: boolean,
    variationOptions?: { promptModifier?: string; forceWardrobeOnly?: boolean }
  ) => Promise<void>;
  getRandomSuggestion: () => Promise<void>;
  loadRandomFromHistory: (
    fetchHistory: () => Promise<OutfitHistoryEntry[]>
  ) => Promise<'empty' | 'ok'>;
  clearError: () => void;
  handleUseCachedSuggestion: () => void;
  handleGetNewSuggestion: () => Promise<void>;
  setShowDuplicateModal: (show: boolean) => void;
  setSourceWardrobeItem: (item: SourceWardrobeItem | null) => void;
  setFlowPreviewUrl: (url: string | null) => void;
  setFlowPreviewCaption: (caption: string | null) => void;
  clearPreferences: () => void;
  cancelOperation: () => void;
  resetMainFlowState: () => void;
  startFreshUpload: (file: File) => void;
  generateAnotherFromResult: (
    variationOptions?: { promptModifier?: string; forceWardrobeOnly?: boolean }
  ) => Promise<void>;
  prepareStyleFromWardrobeItem: (item: WardrobeItem) => Promise<void>;
  onSuggestionSuccess?: () => void | Promise<void>; // Callback for when suggestion is successful
}

export const useOutfitController = (options?: {
  onSuggestionSuccess?: () => void | Promise<void>;
  onGuestLimitReached?: () => void;
}): UseOutfitControllerReturn => {
  const [image, setImage] = useState<File | null>(null);
  const [filters, setFilters] = useState<Filters>(() => loadStoredFilters());
  const [preferenceText, setPreferenceText] = useState<string>(() => loadStoredPreferenceText());

  useEffect(() => {
    persistOutfitPreferences(filters, preferenceText);
  }, [filters, preferenceText]);

  const clearPreferences = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    setPreferenceText('');
  }, []);
  const [currentSuggestion, setCurrentSuggestion] = useState<OutfitSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateModelImage, setGenerateModelImage] = useState<boolean>(false);
  const [imageModel, setImageModel] = useState<string>("dalle3");
  const [useWardrobeOnly, setUseWardrobeOnly] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<AiOperationType | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [existingSuggestion, setExistingSuggestion] = useState<OutfitSuggestion | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [sourceWardrobeItem, setSourceWardrobeItem] = useState<SourceWardrobeItem | null>(null);
  const [flowPreviewUrl, setFlowPreviewUrl] = useState<string | null>(null);
  const [flowPreviewCaption, setFlowPreviewCaption] = useState<string | null>(null);
  const [inputPanelSource, setInputPanelSource] = useState<InputPanelSource>(null);
  const [summaryFilters, setSummaryFilters] = useState<Filters | null>(null);
  const [summaryPreferenceText, setSummaryPreferenceText] = useState<string | null>(null);
  const sourceWardrobeItemId = sourceWardrobeItem?.id ?? null;

  const clearInputPanelSummary = useCallback(() => {
    setInputPanelSource(null);
    setSummaryFilters(null);
    setSummaryPreferenceText(null);
  }, []);

  /**
   * Get outfit suggestion from API
   * Handles duplicate checking, image compression, and location fetching
   * @param skipDuplicateCheck - Skip duplicate check and go straight to AI
   */
  const getSuggestion = useCallback(
    async (
      skipDuplicateCheck: boolean = false,
      sourceImage?: File | null,
      alternateFromPrevious: boolean = false,
      variationOptions?: { promptModifier?: string; forceWardrobeOnly?: boolean }
    ) => {
    const effectiveImage = sourceImage ?? image;

    if (!effectiveImage) {
      setError('Please upload an image first');
      return;
    }

    const skipDup = skipDuplicateCheck || alternateFromPrevious;

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const { signal } = abortController;

    setLoading(true);
    setError(null);
    setActiveOperation(generateModelImage ? 'outfit-with-preview' : 'outfit-suggestion');

    try {
      // Compress image before sending. When use_wardrobe_only, use same params as wardrobe
      // so perceptual hash can match the uploaded item to the correct wardrobe item.
      setLoadingMessage('Compressing image...');
      const effectiveUseWardrobeOnly = variationOptions?.forceWardrobeOnly ?? useWardrobeOnly;
      const compressedImage = effectiveUseWardrobeOnly
        ? await compressImageForWardrobe(effectiveImage)
        : await compressImageForOutfit(effectiveImage);
      setLoadingMessage(
        alternateFromPrevious ? 'Asking AI for a different outfit...' : 'Generating AI suggestion...'
      );

      let previousOutfitText: string | null = null;
      if (alternateFromPrevious && currentSuggestion) {
        previousOutfitText = formatPreviousOutfitForPrompt(currentSuggestion);
      }
      
      // Check for duplicate image (unless skipped)
      if (!skipDup) {
        try {
          const duplicateCheck = await ApiService.checkDuplicate(compressedImage, signal);
          
          if (duplicateCheck.is_duplicate && duplicateCheck.existing_suggestion) {
            // Found duplicate - show confirmation modal
            const suggestion: OutfitSuggestion = {
              ...duplicateCheck.existing_suggestion,
              id: Date.now().toString(),
              imageUrl: URL.createObjectURL(effectiveImage),
            };
            setExistingSuggestion(suggestion);
          setShowDuplicateModal(true);
          setLoading(false);
          setLoadingMessage(null);
          setActiveOperation(null);
          abortControllerRef.current = null;
          return;
          }
        } catch (duplicateErr) {
          // If duplicate check fails, proceed with AI call anyway
          console.error('Duplicate check failed:', duplicateErr);
        }
      }
      
      // Get user location if model image generation is enabled
      let location: string | null = null;
      if (generateModelImage) {
        try {
          console.log('Requesting user location...');
          location = await getLocationString();
          console.log('Location received:', location);
        } catch (err) {
          console.warn('Failed to get location:', err);
        }
      }

      const resolvedFilters = resolveFilters(filters);
      let prompt = buildSuggestionPrompt(filters, preferenceText);
      if (variationOptions?.promptModifier) {
        prompt = `${prompt}\n\n${variationOptions.promptModifier}`;
      }
      if (variationOptions?.forceWardrobeOnly) {
        setUseWardrobeOnly(true);
      }

      // Call API service with compressed image and model image generation option
      const data = await ApiService.getSuggestion(
        compressedImage, 
        prompt, 
        generateModelImage, 
        location || null,
        imageModel,
        effectiveUseWardrobeOnly,
        sourceWardrobeItemId,
        previousOutfitText,
        resolvedFilters.occasion,
        resolvedFilters.season,
        resolvedFilters.style,
        signal
      );

      // Debug: Log the response to see if model_image is present
      console.log('API Response:', {
        hasModelImage: !!data.model_image,
        modelImageLength: data.model_image?.length || 0,
        generateModelImage,
        location
      });

      // Create outfit suggestion object
      const categoryAliases: Record<string, 'shirt' | 'trouser' | 'blazer' | 'shoes' | 'belt'> = {
        shirt: 'shirt',
        shirts: 'shirt',
        trouser: 'trouser',
        trousers: 'trouser',
        pant: 'trouser',
        pants: 'trouser',
        blazer: 'blazer',
        blazers: 'blazer',
        jacket: 'blazer',
        jackets: 'blazer',
        shoe: 'shoes',
        shoes: 'shoes',
        belt: 'belt',
        belts: 'belt',
      };
      const rawUploadCategory = data.source_slot || data.upload_matched_category;
      const normalizedUploadCategory = rawUploadCategory
        ? categoryAliases[String(rawUploadCategory).toLowerCase()] ?? null
        : null;

      const suggestion: OutfitSuggestion = {
        ...data,
        id: Date.now().toString(),
        imageUrl: URL.createObjectURL(effectiveImage), // Use the effective image for display
        model_image: data.model_image || null,
        raw: data,
        meta: { usedPrompt: data.ai_prompt || prompt },
        source_wardrobe_item_id: data.source_wardrobe_item_id ?? sourceWardrobeItemId,
        upload_matched_category: normalizedUploadCategory,
      };

      console.log('Created suggestion:', {
        hasModelImage: !!suggestion.model_image,
        modelImageLength: suggestion.model_image?.length || 0
      });

      setCurrentSuggestion(suggestion);
      setFlowPreviewUrl(null);
      setFlowPreviewCaption(null);
      setInputPanelSource('upload');
      setSummaryFilters(null);
      setSummaryPreferenceText(null);
      setLoading(false);
      setLoadingMessage(null);
      setActiveOperation(null);
      abortControllerRef.current = null;
      
      // Call success callback if provided
      if (options?.onSuggestionSuccess) {
        await options.onSuggestionSuccess();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setLoading(false);
        setLoadingMessage(null);
        setActiveOperation(null);
        abortControllerRef.current = null;
        return;
      }
      if (err instanceof GuestLimitReachedError) {
        setLoading(false);
        setLoadingMessage(null);
        setActiveOperation(null);
        abortControllerRef.current = null;
        options?.onGuestLimitReached?.();
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error getting outfit suggestion:', err);
      setError(errorMessage);
      setLoading(false);
      setLoadingMessage(null);
      setActiveOperation(null);
      abortControllerRef.current = null;
    }
  }, [
    image,
    filters,
    preferenceText,
    generateModelImage,
    imageModel,
    useWardrobeOnly,
    sourceWardrobeItemId,
    currentSuggestion,
    options,
  ]);

  /**
   * Handle using cached/duplicate suggestion
   */
  const handleUseCachedSuggestion = useCallback(() => {
    if (existingSuggestion) {
      // Set the existing suggestion with proper image URL
      const suggestion: OutfitSuggestion = {
        ...existingSuggestion,
        imageUrl: image ? URL.createObjectURL(image) : existingSuggestion.imageUrl,
      };
      setCurrentSuggestion(suggestion);
      
      // Call success callback if provided
      void options?.onSuggestionSuccess?.();
    }
    setShowDuplicateModal(false);
    setExistingSuggestion(null);
  }, [existingSuggestion, image, options]);

  /**
   * Get wardrobe-only outfit suggestion (no image needed)
   * Uses occasion, season, style filters and optional free-text preferences
   */
  const getRandomSuggestion = useCallback(async () => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const { signal } = abortController;

    setLoading(true);
    setError(null);
    setActiveOperation('wardrobe-outfit');
    setLoadingMessage('Scanning your wardrobe...');
    setImage(null);
    setSourceWardrobeItem(null);
    clearInputPanelSummary();
    try {
      const resolved = resolveFilters(filters);
      const trimmed = preferenceText.trim();
      const data = await ApiService.getWardrobeOnlySuggestion(
        resolved.occasion,
        resolved.season,
        resolved.style,
        trimmed,
        signal
      );
      const suggestion: OutfitSuggestion = {
        ...data,
        id: Date.now().toString(),
        model_image: null,
        raw: data,
        matching_wardrobe_items: data.matching_wardrobe_items,
        meta: {
          usedPrompt: data.ai_prompt || `Wardrobe-only: Occasion=${resolved.occasion}, Season=${resolved.season}, Style=${resolved.style}${
            trimmed ? `, Notes=${trimmed}` : ''
          }`
        }
      };
      const previewUrl = firstWardrobePreviewUrl(suggestion);
      setFlowPreviewUrl(previewUrl);
      setFlowPreviewCaption(previewUrl ? 'Random from wardrobe' : null);
      setInputPanelSource('wardrobe');
      setSummaryFilters(null);
      setSummaryPreferenceText(null);
      setCurrentSuggestion(suggestion);
      if (options?.onSuggestionSuccess) {
        await options.onSuggestionSuccess();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMessage(null);
      setActiveOperation(null);
      abortControllerRef.current = null;
    }
  }, [filters.occasion, filters.season, filters.style, preferenceText, options, clearInputPanelSummary]);

  const loadRandomFromHistory = useCallback(
    async (fetchHistory: () => Promise<OutfitHistoryEntry[]>): Promise<'empty' | 'ok'> => {
      const fullHistory = await fetchHistory();
      if (fullHistory.length === 0) {
        return 'empty';
      }

      const randomEntry = fullHistory[Math.floor(Math.random() * fullHistory.length)];

      setImage(null);
      setSourceWardrobeItem(null);
      setFlowPreviewUrl(null);
      setFlowPreviewCaption(null);

      const suggestion = historyEntryToSuggestion(randomEntry);
      const previewUrl = suggestion.imageUrl ?? firstWardrobePreviewUrl(suggestion);

      setFlowPreviewUrl(previewUrl);
      setFlowPreviewCaption(previewUrl ? MAIN_FLOW_UX_COPY.fromHistory : null);
      setInputPanelSource('history');
      setSummaryFilters(historyEntrySummaryFilters(randomEntry, filters));
      setSummaryPreferenceText(randomEntry.text_input?.trim() || null);
      setSourceWardrobeItem(resolveSourceWardrobeItemFromSuggestion(suggestion));
      setCurrentSuggestion(suggestion);

      if (options?.onSuggestionSuccess) {
        await options.onSuggestionSuccess();
      }

      return 'ok';
    },
    [filters, options]
  );

  /**
   * Handle getting new AI suggestion (user chose to ignore duplicate)
   */
  const handleGetNewSuggestion = useCallback(async () => {
    setShowDuplicateModal(false);
    setExistingSuggestion(null);
    await getSuggestion(true); // Skip duplicate check
  }, [getSuggestion]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancelOperation = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
    setLoadingMessage(null);
    setActiveOperation(null);
    abortControllerRef.current = null;
  }, []);

  const prepareStyleFromWardrobeItem = useCallback(async (item: WardrobeItem) => {
    if (!item.image_data) {
      throw new Error("This item doesn't have an image. Please add an image first.");
    }

    const response = await fetch(`data:image/jpeg;base64,${item.image_data}`);
    const blob = await response.blob();
    const file = new File([blob], `wardrobe-item-${item.id}.jpg`, { type: 'image/jpeg' });

    setCurrentSuggestion(null);
    setFlowPreviewUrl(null);
    setFlowPreviewCaption(null);
    clearInputPanelSummary();
    setSourceWardrobeItem({
      id: item.id,
      category: item.category,
      color: item.color,
    });
    setImage(file);
  }, [clearInputPanelSummary]);

  const resetMainFlowState = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setImage(null);
    setCurrentSuggestion(null);
    setSourceWardrobeItem(null);
    setFlowPreviewUrl(null);
    setFlowPreviewCaption(null);
    setInputPanelSource(null);
    setSummaryFilters(null);
    setSummaryPreferenceText(null);
    setError(null);
    setShowDuplicateModal(false);
    setExistingSuggestion(null);
    setLoading(false);
    setLoadingMessage(null);
    setActiveOperation(null);
    setUseWardrobeOnly(false);
    clearPreferences();
  }, [clearPreferences]);

  const startFreshUpload = useCallback(
    (file: File) => {
      setCurrentSuggestion(null);
      setSourceWardrobeItem(null);
      setFlowPreviewUrl(null);
      setFlowPreviewCaption(null);
      clearInputPanelSummary();
      setImage(file);
    },
    [clearInputPanelSummary]
  );

  const generateAnotherFromResult = useCallback(
    async (variationOptions?: { promptModifier?: string; forceWardrobeOnly?: boolean }) => {
      if (!currentSuggestion) return;

      if (inputPanelSource === 'wardrobe' && !image) {
        await getRandomSuggestion();
        return;
      }

      const previewDataUrl = flowPreviewUrl ?? currentSuggestion.imageUrl ?? null;
      if (inputPanelSource === 'history' && !image && previewDataUrl) {
        const file = await dataUrlToFile(previewDataUrl, 'history-image.jpg');
        setImage(file);
        await getSuggestion(true, file, true, variationOptions);
        return;
      }

      if (image) {
        await getSuggestion(true, undefined, true, variationOptions);
      }
    },
    [currentSuggestion, inputPanelSource, image, flowPreviewUrl, getRandomSuggestion, getSuggestion]
  );

  return {
    // State
    image,
    loadingMessage,
    activeOperation,
    filters,
    preferenceText,
    currentSuggestion,
    loading,
    error,
    generateModelImage,
    imageModel,
    useWardrobeOnly,
    existingSuggestion,
    showDuplicateModal,
    sourceWardrobeItem,
    flowPreviewUrl,
    flowPreviewCaption,
    inputPanelSource,
    summaryFilters,
    summaryPreferenceText,

    // Actions
    setImage,
    setFilters,
    setPreferenceText,
    setCurrentSuggestion,
    setGenerateModelImage,
    setImageModel,
    setUseWardrobeOnly,
    getSuggestion,
    getRandomSuggestion,
    loadRandomFromHistory,
    clearError,
    handleUseCachedSuggestion,
    handleGetNewSuggestion,
    setShowDuplicateModal,
    setSourceWardrobeItem,
    setFlowPreviewUrl,
    setFlowPreviewCaption,
    clearPreferences,
    cancelOperation,
    resetMainFlowState,
    startFreshUpload,
    generateAnotherFromResult,
    prepareStyleFromWardrobeItem,
    onSuggestionSuccess: options?.onSuggestionSuccess
  };
};

