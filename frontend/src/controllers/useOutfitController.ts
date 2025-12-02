/**
 * Outfit Controller Hook
 * Contains business logic for outfit suggestions
 * This is the "Controller" in the MVC pattern
 */

import { useState, useCallback } from 'react';
import { OutfitSuggestion, Filters } from '../models/OutfitModels';
import ApiService from '../services/ApiService';

interface UseOutfitControllerReturn {
  // State
  image: File | null;
  filters: Filters;
  preferenceText: string;
  currentSuggestion: OutfitSuggestion | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setImage: (file: File | null) => void;
  setFilters: (filters: Filters) => void;
  setPreferenceText: (text: string) => void;
  setCurrentSuggestion: (suggestion: OutfitSuggestion | null) => void;
  getSuggestion: () => Promise<void>;
  clearError: () => void;
}

export const useOutfitController = (): UseOutfitControllerReturn => {
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

  /**
   * Get outfit suggestion from API
   */
  const getSuggestion = useCallback(async () => {
    if (!image) {
      setError('Please upload an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build prompt from filters or preference text
      const trimmed = preferenceText.trim();
      const prompt = trimmed.length > 0
        ? `User preferences (free-text): ${trimmed}`
        : `Occasion: ${filters.occasion}, Season: ${filters.season}, Style: ${filters.style}`;

      // Call API service
      const data = await ApiService.getSuggestion(image, prompt);

      // Create outfit suggestion object
      const suggestion: OutfitSuggestion = {
        ...data,
        id: Date.now().toString(),
        imageUrl: URL.createObjectURL(image),
        raw: data,
        meta: { usedPrompt: prompt }
      };

      setCurrentSuggestion(suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [image, filters, preferenceText]);

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
    
    // Actions
    setImage,
    setFilters,
    setPreferenceText,
    setCurrentSuggestion,
    getSuggestion,
    clearError
  };
};

