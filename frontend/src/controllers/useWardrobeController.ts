/**
 * Wardrobe Controller Hook
 * Contains business logic for wardrobe management
 */

import { useState, useCallback, useEffect } from 'react';
import { WardrobeItem, WardrobeItemCreate, WardrobeItemUpdate, WardrobeSummary } from '../models/WardrobeModels';
import ApiService from '../services/ApiService';

interface UseWardrobeControllerReturn {
  // State
  wardrobeItems: WardrobeItem[];
  summary: WardrobeSummary | null;
  loading: boolean;
  error: string | null;
  selectedCategory: string | null;
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  searchQuery: string;
  
  // Actions
  loadWardrobe: (category?: string, search?: string, page?: number) => Promise<void>;
  loadSummary: () => Promise<void>;
  analyzeImage: (image: File, modelType?: string) => Promise<Record<string, any>>;
  addItem: (itemData: WardrobeItemCreate, image?: File) => Promise<void>;
  updateItem: (itemId: number, itemData: WardrobeItemUpdate, image?: File) => Promise<void>;
  deleteItem: (itemId: number) => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useWardrobeController = (): UseWardrobeControllerReturn => {
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [summary, setSummary] = useState<WardrobeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>('');

  /**
   * Load wardrobe items with pagination and search
   */
  const loadWardrobe = useCallback(async (category?: string, search?: string, page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await ApiService.getWardrobe(category, search, itemsPerPage, offset);
      // Handle both old array format and new paginated format
      if (Array.isArray(response)) {
        // Old format - array of items (backward compatibility)
        setWardrobeItems(response);
        setTotalCount(response.length);
      } else if (response && typeof response === 'object') {
        // New format - paginated response
        setWardrobeItems(Array.isArray(response.items) ? response.items : []);
        setTotalCount(typeof response.total === 'number' ? response.total : 0);
      } else {
        // Fallback - empty array
        setWardrobeItems([]);
        setTotalCount(0);
      }
      setCurrentPage(page);
      setSelectedCategory(category || null);
      if (search !== undefined) {
        setSearchQuery(search);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wardrobe';
      setError(errorMessage);
      console.error('Error loading wardrobe:', err);
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  /**
   * Load wardrobe summary/statistics
   */
  const loadSummary = useCallback(async () => {
    try {
      const wardrobeSummary = await ApiService.getWardrobeSummary();
      setSummary(wardrobeSummary);
    } catch (err) {
      console.error('Error loading wardrobe summary:', err);
      // Don't set error for summary, it's not critical
    }
  }, []);

  /**
   * Analyze an image and extract properties using AI
   */
  const analyzeImage = useCallback(async (image: File, modelType: string = 'blip') => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Starting AI analysis for wardrobe item with model:', modelType);
      const properties = await ApiService.analyzeWardrobeImage(image, modelType);
      console.log('✅ AI analysis complete:', properties);
      return properties;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze image';
      console.error('❌ AI analysis failed:', err);
      setError(errorMessage);
      throw err; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add a new wardrobe item
   */
  const addItem = useCallback(async (itemData: WardrobeItemCreate, image?: File) => {
    setLoading(true);
    setError(null);
    
    try {
      await ApiService.addWardrobeItem(itemData, image);
      // Reload wardrobe after adding (reset to page 1)
      await loadWardrobe(selectedCategory || undefined, searchQuery || undefined, 1);
      await loadSummary();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add wardrobe item';
      setError(errorMessage);
      throw err; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, [loadWardrobe, loadSummary, selectedCategory]);

  /**
   * Update a wardrobe item
   */
  const updateItem = useCallback(async (
    itemId: number,
    itemData: WardrobeItemUpdate,
    image?: File
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      await ApiService.updateWardrobeItem(itemId, itemData, image);
      // Reload wardrobe after updating
      await loadWardrobe(selectedCategory || undefined, searchQuery || undefined, currentPage);
      await loadSummary();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update wardrobe item';
      setError(errorMessage);
      throw err; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, [loadWardrobe, loadSummary, selectedCategory]);

  /**
   * Delete a wardrobe item
   */
  const deleteItem = useCallback(async (itemId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      await ApiService.deleteWardrobeItem(itemId);
      // Reload wardrobe after deleting (may need to go back a page if current page is empty)
      const newPage = wardrobeItems.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      await loadWardrobe(selectedCategory || undefined, searchQuery || undefined, newPage);
      await loadSummary();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete wardrobe item';
      setError(errorMessage);
      throw err; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, [loadWardrobe, loadSummary, selectedCategory]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load summary on mount
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return {
    // State
    wardrobeItems,
    summary,
    loading,
    error,
    selectedCategory,
    totalCount,
    currentPage,
    itemsPerPage,
    searchQuery,
    
    // Actions
    loadWardrobe,
    loadSummary,
    analyzeImage,
    addItem,
    updateItem,
    deleteItem,
    setSelectedCategory,
    setSearchQuery,
    clearError,
  };
};

