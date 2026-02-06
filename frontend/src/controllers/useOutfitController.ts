/**
 * Outfit Controller Hook
 * Contains business logic for outfit suggestions
 * This is the "Controller" in the MVC pattern
 */

import { useState, useCallback } from 'react';
import { OutfitSuggestion, Filters } from '../models/OutfitModels';
import ApiService from '../services/ApiService';
import { compressImage } from '../utils/imageUtils';
import { getLocationString } from '../utils/geolocation';

interface UseOutfitControllerReturn {
  // State
  image: File | null;
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
  
  // Actions
  setImage: (file: File | null) => void;
  setFilters: (filters: Filters) => void;
  setPreferenceText: (text: string) => void;
  setCurrentSuggestion: (suggestion: OutfitSuggestion | null) => void;
  setGenerateModelImage: (generate: boolean) => void;
  setImageModel: (model: string) => void;
  setUseWardrobeOnly: (use: boolean) => void;
  getSuggestion: (skipDuplicateCheck?: boolean, sourceImage?: File | null) => Promise<void>;
  clearError: () => void;
  handleUseCachedSuggestion: () => void;
  handleGetNewSuggestion: () => Promise<void>;
  setShowDuplicateModal: (show: boolean) => void;
  onSuggestionSuccess?: () => void; // Callback for when suggestion is successful
}

export const useOutfitController = (options?: { onSuggestionSuccess?: () => void }): UseOutfitControllerReturn => {
  const [image, setImage] = useState<File | null>(null);
  const [filters, setFilters] = useState<Filters>({
    occasion: 'casual',
    season: 'all',
    style: 'modern'
  });
  const [preferenceText, setPreferenceText] = useState<string>('');
  const [currentSuggestion, setCurrentSuggestion] = useState<OutfitSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateModelImage, setGenerateModelImage] = useState<boolean>(false);
  const [imageModel, setImageModel] = useState<string>("dalle3");
  const [useWardrobeOnly, setUseWardrobeOnly] = useState<boolean>(false);
  const [existingSuggestion, setExistingSuggestion] = useState<OutfitSuggestion | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  /**
   * Get outfit suggestion from API
   * Handles duplicate checking, image compression, and location fetching
   * @param skipDuplicateCheck - Skip duplicate check and go straight to AI
   */
  const getSuggestion = useCallback(async (skipDuplicateCheck: boolean = false, sourceImage?: File | null) => {
    const effectiveImage = sourceImage ?? image;

    if (!effectiveImage) {
      setError('Please upload an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Compress image before sending to reduce size
      const compressedImage = await compressImage(effectiveImage);
      
      // Check for duplicate image (unless skipped)
      if (!skipDuplicateCheck) {
        try {
          const duplicateCheck = await ApiService.checkDuplicate(compressedImage);
          
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

      // Build prompt from filters or preference text
      const trimmed = preferenceText.trim();
      const prompt = trimmed.length > 0
        ? `User preferences (free-text): ${trimmed}`
        : `Occasion: ${filters.occasion}, Season: ${filters.season}, Style: ${filters.style}`;

      // Call API service with compressed image and model image generation option
      const data = await ApiService.getSuggestion(
        compressedImage, 
        prompt, 
        generateModelImage, 
        location || null,
        imageModel,
        useWardrobeOnly
      );

      // Debug: Log the response to see if model_image is present
      console.log('API Response:', {
        hasModelImage: !!data.model_image,
        modelImageLength: data.model_image?.length || 0,
        generateModelImage,
        location
      });

      // Create outfit suggestion object
      const suggestion: OutfitSuggestion = {
        ...data,
        id: Date.now().toString(),
        imageUrl: URL.createObjectURL(effectiveImage), // Use the effective image for display
        model_image: data.model_image || null,
        raw: data,
        meta: { usedPrompt: prompt }
      };

      console.log('Created suggestion:', {
        hasModelImage: !!suggestion.model_image,
        modelImageLength: suggestion.model_image?.length || 0
      });

      setCurrentSuggestion(suggestion);
      setLoading(false);
      
      // Call success callback if provided
      if (options?.onSuggestionSuccess) {
        options.onSuggestionSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error getting outfit suggestion:', err);
      setError(errorMessage);
      setLoading(false);
    }
  }, [image, filters, preferenceText, generateModelImage, imageModel, useWardrobeOnly, options]);

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
      if (options?.onSuggestionSuccess) {
        options.onSuggestionSuccess();
      }
    }
    setShowDuplicateModal(false);
    setExistingSuggestion(null);
  }, [existingSuggestion, image, options]);

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

  return {
    // State
    image,
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
    
    // Actions
    setImage,
    setFilters,
    setPreferenceText,
    setCurrentSuggestion,
    setGenerateModelImage,
    setImageModel,
    setUseWardrobeOnly,
    getSuggestion,
    clearError,
    handleUseCachedSuggestion,
    handleGetNewSuggestion,
    setShowDuplicateModal,
    onSuggestionSuccess: options?.onSuggestionSuccess
  };
};

