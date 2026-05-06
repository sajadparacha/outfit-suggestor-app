import React, { useState, useRef } from 'react';
import { useWardrobeController } from '../../controllers/useWardrobeController';
import { WardrobeItem, WardrobeItemCreate, WardrobeItemUpdate } from '../../models/WardrobeModels';
import { OutfitHistoryEntry } from '../../models/OutfitModels';
import ApiService from '../../services/ApiService';
import { isValidImageSize, formatFileSize } from '../../utils/imageUtils';
import { WARDROBE_MAX_SIZE_MB } from '../../constants/imageLimits';
import ConfirmationModal from './ConfirmationModal';
import { historyEntryToSuggestion } from '../../utils/historyUtils';

interface WardrobeProps {
  initialCategory?: string | null;
  onSuggestionReady?: (suggestion: any) => void; // Callback when outfit suggestion is ready
  onNavigateToMain?: () => void; // Callback to navigate to main view
  onSourceImageLoaded?: () => void; // Callback after source wardrobe image is preloaded in main flow
  outfitController?: {
    setImage: (image: File | null) => void;
    setSourceWardrobeItemId?: (id: number | null) => void;
    getSuggestion: (
      skipDuplicateCheck?: boolean,
      sourceImage?: File | null,
      alternateFromPrevious?: boolean
    ) => Promise<void>;
    loading: boolean;
    error: string | null;
    showDuplicateModal: boolean;
    handleUseCachedSuggestion: () => void;
    useWardrobeOnly?: boolean; // Used in fallback getSuggestionFromWardrobeItem
  }; // Outfit controller to use same logic as main view
}

const Wardrobe: React.FC<WardrobeProps> = ({ 
  initialCategory = null,
  onSuggestionReady,
  onNavigateToMain,
  onSourceImageLoaded,
  outfitController
}) => {
  const {
    wardrobeItems,
    summary,
    loading,
    error,
    selectedCategory,
    totalCount,
    currentPage,
    itemsPerPage,
    searchQuery,
    loadWardrobe,
    loadSummary,
    analyzeImage,
    addItem,
    updateItem,
    deleteItem,
    setSelectedCategory,
    setSearchQuery,
    clearError,
  } = useWardrobeController();

  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<WardrobeItemCreate>({
    category: 'shirt',
    color: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<WardrobeItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit state
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [editFormData, setEditFormData] = useState<WardrobeItemCreate>({
    category: 'shirt',
    color: '',
    description: '',
  });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editAnalyzing, setEditAnalyzing] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  // Image viewer state
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // State for outfit suggestion from wardrobe item
  const [suggestionLoading, setSuggestionLoading] = useState<number | null>(null); // Store item ID being processed
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [historyLoadingForItem, setHistoryLoadingForItem] = useState<number | null>(null);
  const [showHistorySuggestionsModal, setShowHistorySuggestionsModal] = useState(false);
  const [historySuggestions, setHistorySuggestions] = useState<OutfitHistoryEntry[]>([]);
  const [historySuggestionsError, setHistorySuggestionsError] = useState<string | null>(null);
  const [historySourceItem, setHistorySourceItem] = useState<WardrobeItem | null>(null);
  const [historyImageIndex, setHistoryImageIndex] = useState<Set<string>>(new Set());
  const [historyItemIdIndex, setHistoryItemIdIndex] = useState<Set<number>>(new Set());

  const historyEntryReferencesItem = React.useCallback((entry: OutfitHistoryEntry, item: WardrobeItem): boolean => {
    if (entry.source_wardrobe_item_id === item.id) {
      return true;
    }

    const slotIds = [
      entry.shirt_id,
      entry.trouser_id,
      entry.blazer_id,
      entry.shoes_id,
      entry.belt_id,
    ];
    if (slotIds.some((id) => id === item.id)) {
      return true;
    }

    return !!item.image_data && !!entry.image_data && entry.image_data === item.image_data;
  }, []);

  // Essential categories only - matches outfit suggestion structure
  const categories = ['shirt', 'trouser', 'blazer', 'shoes', 'belt', 'other'];

  // Load wardrobe and summary on mount or when initialCategory changes
  React.useEffect(() => {
    // Summary is loaded by the wardrobe controller hook on mount.
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      loadWardrobe(initialCategory, undefined, 1);
    } else {
      loadWardrobe(undefined, undefined, 1);
    }
  }, [loadWardrobe, loadSummary, initialCategory, setSelectedCategory]);

  React.useEffect(() => {
    let active = true;

    const loadHistoryIndex = async () => {
      if (wardrobeItems.length === 0) {
        setHistoryImageIndex(new Set());
        setHistoryItemIdIndex(new Set());
        return;
      }

      try {
        const allHistory = await ApiService.getOutfitHistory(100);
        const index = new Set(
          allHistory
            .map((entry) => entry.image_data)
            .filter((imageData): imageData is string => !!imageData)
        );
        const itemIdIndex = new Set(
          allHistory.flatMap((entry) => {
            const ids = [
              entry.source_wardrobe_item_id,
              entry.shirt_id,
              entry.trouser_id,
              entry.blazer_id,
              entry.shoes_id,
              entry.belt_id,
            ];
            return ids.filter((itemId): itemId is number => typeof itemId === 'number');
          })
        );
        if (active) {
          setHistoryImageIndex(index);
          setHistoryItemIdIndex(itemIdIndex);
        }
      } catch (err) {
        if (active) {
          setHistoryImageIndex(new Set());
          setHistoryItemIdIndex(new Set());
        }
      }
    };

    void loadHistoryIndex();

    return () => {
      active = false;
    };
  }, [wardrobeItems]);

  // Handle category filter
  const handleCategoryFilter = (category: string | null) => {
    if (category === selectedCategory) {
      // If clicking the same category, deselect it to show all
      setSelectedCategory(null);
      loadWardrobe(undefined, searchQuery || undefined, 1);
    } else {
      setSelectedCategory(category);
      loadWardrobe(category || undefined, searchQuery || undefined, 1);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearchQuery);
    loadWardrobe(selectedCategory || undefined, localSearchQuery || undefined, 1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    loadWardrobe(selectedCategory || undefined, searchQuery || undefined, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / itemsPerPage) : 0;

  // Function to highlight search term in text
  const highlightSearchTerm = (text: string | null, searchTerm: string): React.ReactNode => {
    if (!text || !searchTerm) return text || '';
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-teal-500/40 text-teal-100 font-medium px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  // Get category count from summary (case-insensitive)
  const getCategoryCount = (category: string): number => {
    if (!summary || !summary.by_category) {
      return 0;
    }
    // Try exact match first
    if (summary.by_category[category]) {
      return summary.by_category[category];
    }
    // Try case-insensitive match
    const categoryLower = category.toLowerCase();
    for (const [key, value] of Object.entries(summary.by_category)) {
      if (key.toLowerCase() === categoryLower) {
        return value as number;
      }
    }
    return 0;
  };

  const handleImageUpload = async (file: File) => {
    if (!isValidImageSize(file, WARDROBE_MAX_SIZE_MB)) {
      setAnalysisError(`Image must be under ${WARDROBE_MAX_SIZE_MB}MB (current: ${formatFileSize(file.size)})`);
      return;
    }
    setImageFile(file);
    setAnalyzing(true);
    setAnalysisError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    try {
      // Check for duplicate FIRST before AI analysis
      console.log('🔍 Checking for duplicate...');
      const duplicateCheck = await ApiService.checkWardrobeDuplicate(file);
      
      if (duplicateCheck.is_duplicate && duplicateCheck.existing_item) {
        // Show duplicate notification immediately
        setDuplicateItem(duplicateCheck.existing_item);
        setShowDuplicateModal(true);
        setAnalyzing(false);
        return;
      }
      
      console.log('✅ No duplicate found, proceeding with AI analysis...');
      
      // No duplicate found, proceed with AI analysis
      const properties = await analyzeImage(file, 'blip');
      
      // Populate form with extracted properties for user to review/edit
      setFormData({
        category: properties.category || 'shirt',
        color: properties.color || '',
        description: properties.description || '',
      });
      
      // Show form for user to review/edit (don't auto-save)
      // The modal is already shown, just populate the form
    } catch (err) {
      // Show error but allow manual entry
      const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
      setAnalysisError(errorMessage);
      console.error('Failed to process image:', err);
      // Don't block user - they can still manually enter data
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      return;
    }

    try {
      // No need to check duplicate again - already checked before AI analysis
      // Proceed directly with adding
      await addItem(formData, imageFile);
      handleCloseModal();
    } catch (err) {
      // Error is handled by controller
      console.error('Error adding item:', err);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData({
      category: 'shirt',
      color: '',
      description: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setAnalysisError(null);
    setDuplicateItem(null);
    setShowDuplicateModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(itemId);
      } catch (err) {
        // Error is handled by controller
      }
    }
  };

  const handleEditItem = (item: WardrobeItem) => {
    setEditingItem(item);
    setEditFormData({
      category: item.category,
      color: item.color || '',
      description: item.description || '',
    });
    setEditImagePreview(item.image_data ? `data:image/jpeg;base64,${item.image_data}` : null);
    setEditImageFile(null);
  };

  const handleEditImageUpload = async (file: File) => {
    setEditImageFile(file);
    setEditAnalyzing(true);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    try {
      const properties = await analyzeImage(file, 'blip');
      setEditFormData({
        category: properties.category || editFormData.category,
        color: properties.color || editFormData.color,
        description: properties.description || editFormData.description,
      });
    } catch (err) {
      console.error('Failed to analyze image:', err);
      // Continue without AI analysis
    } finally {
      setEditAnalyzing(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const updateData: WardrobeItemUpdate = {
        category: editFormData.category,
        color: editFormData.color,
        description: editFormData.description,
      };
      await updateItem(
        editingItem.id,
        updateData,
        editImageFile || undefined
      );
      handleCloseEditModal();
    } catch (err) {
      console.error('Error updating item:', err);
      // Error is handled by controller
    }
  };

  const handleCloseEditModal = () => {
    setEditingItem(null);
    setEditFormData({
      category: 'shirt',
      color: '',
      description: '',
    });
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditAnalyzing(false);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleViewImage = (imageData: string) => {
    setViewingImage(`data:image/jpeg;base64,${imageData}`);
  };

  const handleGetAISuggestion = async (item: WardrobeItem) => {
    if (!item.image_data) {
      setSuggestionError("This item doesn't have an image. Please add an image first.");
      return;
    }

    // If outfit controller is provided, prepare the main view with this image
    // and let the user tune options (occasion, style, etc.) before requesting AI.
    if (outfitController) {
      setSuggestionError(null);
      setSuggestionLoading(item.id);

      try {
        const base64Image = item.image_data;
        const response = await fetch(`data:image/jpeg;base64,${base64Image}`);
        const blob = await response.blob();
        const file = new File([blob], `wardrobe-item-${item.id}.jpg`, { type: 'image/jpeg' });

        // Preload the image into the main suggestion flow
        if (outfitController.setSourceWardrobeItemId) {
          outfitController.setSourceWardrobeItemId(item.id);
        }
        outfitController.setImage(file);
        onSourceImageLoaded?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to prepare outfit suggestion';
        setSuggestionError(errorMessage);
        console.error('Error preparing outfit suggestion from wardrobe item:', err);
      } finally {
        setSuggestionLoading(null);
      }

      // Navigate to main view so the user can adjust filters and trigger AI
      if (onNavigateToMain) {
        onNavigateToMain();
      }
    } else {
      // Fallback to old behavior if controller not provided
      setSuggestionLoading(item.id);
      setSuggestionError(null);

      try {
        const data = await ApiService.getSuggestionFromWardrobeItem(
          item.id,
          '', // text_input - can be enhanced later
          false, // generate_model_image - default to false
          null,
          'dalle3',
          false // useWardrobeOnly: fallback path has no outfitController, default to free generation
        );

        const suggestion = {
          ...data,
          id: Date.now().toString(),
          imageUrl: item.image_data ? `data:image/jpeg;base64,${item.image_data}` : null,
          model_image: data.model_image || null,
          raw: data,
          meta: { source: 'wardrobe_item', wardrobeItemId: item.id, base64Image: item.image_data }
        };

        if (onSuggestionReady) {
          onSuggestionReady(suggestion);
        }

        if (onNavigateToMain) {
          onNavigateToMain();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get outfit suggestion';
        setSuggestionError(errorMessage);
        console.error('Error getting outfit suggestion:', err);
      } finally {
        setSuggestionLoading(null);
      }
    }
  };

  const handleOpenHistorySuggestions = async (item: WardrobeItem) => {
    if (!item.image_data) {
      setSuggestionError("This item doesn't have an image. Please add an image first.");
      return;
    }

    setHistoryLoadingForItem(item.id);
    setHistorySuggestionsError(null);
    setHistorySuggestions([]);
    setHistorySourceItem(item);

    try {
      const allHistory = await ApiService.getOutfitHistory(100);
      const matchingByItem = allHistory.filter((entry) => historyEntryReferencesItem(entry, item));

      setHistorySuggestions(matchingByItem);
      setShowHistorySuggestionsModal(true);
      if (matchingByItem.length === 0) {
        setHistorySuggestionsError('No history suggestions found for this wardrobe item yet.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history suggestions';
      setHistorySuggestionsError(errorMessage);
      setShowHistorySuggestionsModal(true);
    } finally {
      setHistoryLoadingForItem(null);
    }
  };

  const handleSelectHistorySuggestion = async (entry: OutfitHistoryEntry) => {
    if (!historySourceItem?.image_data) {
      setHistorySuggestionsError('Could not load source item image for this history suggestion.');
      return;
    }

    try {
      if (outfitController) {
        const response = await fetch(`data:image/jpeg;base64,${historySourceItem.image_data}`);
        const blob = await response.blob();
        const file = new File([blob], `wardrobe-item-${historySourceItem.id}.jpg`, { type: 'image/jpeg' });

        if (outfitController.setSourceWardrobeItemId) {
          outfitController.setSourceWardrobeItemId(historySourceItem.id);
        }
        outfitController.setImage(file);
        onSourceImageLoaded?.();
      }

      const suggestion = historyEntryToSuggestion(entry);
      onSuggestionReady?.(suggestion);
      setShowHistorySuggestionsModal(false);
      setHistorySuggestions([]);
      setHistorySuggestionsError(null);
      setHistorySourceItem(null);
      onNavigateToMain?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load selected history suggestion';
      setHistorySuggestionsError(errorMessage);
    }
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">👔 My Wardrobe</h1>
              <p className="text-slate-300">Add items to get personalized outfit suggestions</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-all shadow-md"
            >
              + Add Item
            </button>
          </div>

          {/* Category Filters */}
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-300 mr-2">Filter by:</span>
              <button
                onClick={() => handleCategoryFilter(null)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  selectedCategory === null
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10'
                }`}
              >
                All <span className="ml-1 font-semibold">({summary ? summary.total_items || 0 : 0})</span>
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryFilter(category)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${
                    selectedCategory === category
                      ? 'bg-teal-500 text-white shadow-md'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10'
                  }`}
                >
                  {category === 'trouser' ? 'Trousers' : category.charAt(0).toUpperCase() + category.slice(1)}
                  <span className="ml-1 font-semibold">
                    {summary ? `(${getCategoryCount(category)})` : '(0)'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search by description, color, or name..."
              className="flex-1 px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
            >
              🔍 Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearchQuery('');
                  setSearchQuery('');
                  loadWardrobe(selectedCategory || undefined, undefined, 1);
                }}
                className="px-4 py-3 bg-white/10 text-slate-200 rounded-xl font-medium hover:bg-white/20 border border-white/15 transition-colors"
              >
                Clear
              </button>
            )}
          </form>
          {searchQuery && (
            <p className="text-sm text-slate-300 mt-2">
              Searching for: <strong className="text-white">&quot;{searchQuery}&quot;</strong>
            </p>
          )}
        </div>

        {/* Error Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-red-200">{error}</span>
            <button onClick={clearError} className="text-red-300 hover:text-red-100">✕</button>
          </div>
        )}
        {outfitController?.error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-red-200">{outfitController.error}</span>
            <button onClick={clearError} className="text-red-300 hover:text-red-100">✕</button>
          </div>
        )}
        {suggestionError && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-red-200">{suggestionError}</span>
            <button onClick={() => setSuggestionError(null)} className="text-red-300 hover:text-red-100">✕</button>
          </div>
        )}

        {/* Wardrobe Items List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
            <p className="mt-4 text-slate-200">Loading wardrobe...</p>
          </div>
        ) : !wardrobeItems || (Array.isArray(wardrobeItems) && wardrobeItems.length === 0) ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-12 text-center">
            <div className="text-6xl mb-4">👔</div>
            <h3 className="text-2xl font-bold text-white mb-2">Your wardrobe is empty</h3>
            <p className="text-slate-300 mb-6">Add items to get personalized outfit suggestions!</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-all"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {wardrobeItems && Array.isArray(wardrobeItems) && wardrobeItems.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-4 flex items-center gap-4 hover:shadow-2xl transition-shadow">
                {item.image_data && (
                  <div 
                    className="w-32 h-32 bg-slate-800/80 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 ring-teal-500 transition-all border border-white/10"
                    onClick={() => handleViewImage(item.image_data!)}
                    title="Click to view full size"
                  >
                    <img
                      src={`data:image/jpeg;base64,${item.image_data}`}
                      alt={item.category}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {!item.image_data && (
                  <div className="w-32 h-32 bg-slate-800/80 rounded-xl flex-shrink-0 flex items-center justify-center border border-white/10">
                    <span className="text-slate-400 text-4xl">📷</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white capitalize text-lg">{item.category}</h3>
                      {item.color && (
                        <p className="text-sm text-slate-300 mt-1">
                          <span className="font-medium text-slate-200">Color:</span>{' '}
                          {searchQuery ? highlightSearchTerm(item.color, searchQuery) : item.color}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                          {searchQuery ? highlightSearchTerm(item.description, searchQuery) : item.description}
                        </p>
                      )}
                      {item.name && (
                        <p className="text-sm text-slate-300 mt-1">
                          <span className="font-medium text-slate-200">Name:</span>{' '}
                          {searchQuery ? highlightSearchTerm(item.name, searchQuery) : item.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      {item.image_data && (
                        <button
                          onClick={() => handleGetAISuggestion(item)}
                          disabled={suggestionLoading === item.id || (outfitController?.loading ?? false)}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                          title="Get AI outfit suggestion for this item"
                        >
                          {suggestionLoading === item.id || (outfitController?.loading ?? false) ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Getting...
                            </>
                          ) : (
                            <>
                              ✨ Get AI Suggestion
                            </>
                          )}
                        </button>
                      )}
                      {(historyItemIdIndex.has(item.id) || (!!item.image_data && historyImageIndex.has(item.image_data))) && (
                        <button
                          onClick={() => handleOpenHistorySuggestions(item)}
                          disabled={historyLoadingForItem === item.id}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                          title="Show history suggestions for this item"
                        >
                          {historyLoadingForItem === item.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Loading...
                            </>
                          ) : (
                            <>📚 History Suggestions</>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-teal-400 hover:text-teal-300 text-xl"
                        title="Edit item"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-400 hover:text-red-300 text-xl"
                        title="Delete item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    currentPage === 1 || loading
                      ? 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10'
                  }`}
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        className={`px-3 py-2 rounded-xl font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-teal-500 text-white'
                            : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    currentPage === totalPages || loading
                      ? 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10'
                  }`}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Modal - Simplified One-Step Flow */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-w-lg w-full backdrop-blur">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {imagePreview && !analyzing ? '✏️ Review & Add to Wardrobe' : '📸 Add Item to Wardrobe'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {analyzing ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mb-4"></div>
                    <p className="text-slate-200 font-medium">🤖 AI is analyzing your item...</p>
                    <p className="text-sm text-slate-400 mt-2">Please wait while we extract details from your image</p>
                  </div>
                ) : analysisError && !imagePreview ? (
                  <form onSubmit={handleAddItem} className="space-y-4">
                    {/* Manual entry fallback if analysis fails */}
                    <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-4 mb-4">
                      <p className="text-sm text-amber-200">
                        ⚠️ <strong>AI analysis failed:</strong> {analysisError}
                      </p>
                      <p className="text-xs text-amber-200/80 mt-1">
                        You can still add the item manually below.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Upload Image *
                      </label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-teal-500 bg-white/5 transition-colors"
                      >
                        <div className="text-4xl mb-2">📸</div>
                        <p className="text-slate-200 font-medium">Click to upload</p>
                        <p className="text-sm text-slate-400 mt-1">JPG, PNG, WebP up to {WARDROBE_MAX_SIZE_MB}MB</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        required
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Color *
                      </label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g., Navy blue, Black"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        rows={3}
                        placeholder="e.g., Classic fit, casual style"
                        required
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-6 py-3 bg-white/10 text-slate-200 rounded-full font-semibold hover:bg-white/20 border border-white/15 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Adding...' : '✅ Save Item'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {imagePreview ? (
                      <>
                        <div className="mb-4">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full max-h-64 mx-auto rounded-lg shadow-lg"
                          />
                        </div>
                        {analysisError && (
                          <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-4 mb-4">
                            <p className="text-sm text-amber-200 mb-2">
                              ⚠️ AI analysis had issues, but you can still save manually.
                            </p>
                            <button
                              onClick={() => {
                                setAnalysisError(null);
                                setAnalyzing(true);
                                handleImageUpload(imageFile!);
                              }}
                              className="text-sm text-teal-300 underline"
                            >
                              Try analyzing again
                            </button>
                          </div>
                        )}
                        {!analysisError && imagePreview && (
                          <div className="bg-teal-500/20 border border-teal-400/30 rounded-xl p-3 mb-4">
                            <p className="text-sm text-teal-100">
                              ✨ <strong>AI Analysis Complete!</strong> Review and edit the extracted details below before saving.
                            </p>
                          </div>
                        )}
                        <form onSubmit={handleAddItem} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">
                              Category *
                            </label>
                            <select
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              required
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">
                              Color *
                            </label>
                            <input
                              type="text"
                              value={formData.color}
                              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              placeholder="e.g., Navy blue, Black"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">
                              Description *
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              rows={3}
                              placeholder="e.g., Classic fit, casual style"
                              required
                            />
                          </div>

                          <div className="flex gap-4 pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setImageFile(null);
                                setImagePreview(null);
                                setAnalysisError(null);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              className="px-6 py-3 bg-white/10 text-slate-200 rounded-full font-semibold hover:bg-white/20 border border-white/15 transition-all"
                            >
                              Choose Different Photo
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-all disabled:opacity-50"
                            >
                              {loading ? 'Adding...' : '✅ Save Item'}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center cursor-pointer hover:border-teal-500 bg-white/5 transition-colors"
                        >
                          <div className="text-6xl mb-4">📸</div>
                          <p className="text-slate-200 font-medium">Click to upload or drag and drop</p>
                          <p className="text-sm text-slate-400 mt-2">JPG, PNG, WebP up to {WARDROBE_MAX_SIZE_MB}MB</p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file);
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="w-full px-6 py-3 bg-white/10 text-slate-200 rounded-full font-semibold hover:bg-white/20 border border-white/15 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto backdrop-blur">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {editImagePreview && !editAnalyzing ? '✏️ Edit Wardrobe Item' : '✏️ Edit Wardrobe Item'}
                  </h2>
                  <button
                    onClick={handleCloseEditModal}
                    className="text-slate-400 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {editAnalyzing ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mb-4"></div>
                    <p className="text-slate-200 font-medium">🤖 AI is analyzing your image...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editImagePreview ? (
                      <>
                        <div className="mb-4">
                          <img
                            src={editImagePreview}
                            alt="Preview"
                            className="w-full max-h-64 mx-auto rounded-lg shadow-lg cursor-pointer"
                            onClick={() => setViewingImage(editImagePreview)}
                            title="Click to view full size"
                          />
                        </div>
                        <form onSubmit={handleUpdateItem} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">
                              Category *
                            </label>
                            <select
                              value={editFormData.category}
                              onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              required
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">
                              Color *
                            </label>
                            <input
                              type="text"
                              value={editFormData.color}
                              onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              placeholder="e.g., Navy blue, Black"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">
                              Description *
                            </label>
                            <textarea
                              value={editFormData.description}
                              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              rows={3}
                              placeholder="e.g., Classic fit, casual style"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">
                              Change Image (Optional)
                            </label>
                            <div
                              onClick={() => editFileInputRef.current?.click()}
                              className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-teal-500 bg-white/5 transition-colors"
                            >
                              <div className="text-2xl mb-2">📸</div>
                              <p className="text-slate-300 text-sm">Click to upload new image</p>
                            </div>
                            <input
                              ref={editFileInputRef}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleEditImageUpload(file);
                                }
                              }}
                              className="hidden"
                            />
                          </div>

                          <div className="flex gap-4 pt-4">
                            <button
                              type="button"
                              onClick={handleCloseEditModal}
                              className="px-6 py-3 bg-white/10 text-slate-200 rounded-full font-semibold hover:bg-white/20 border border-white/15 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-all disabled:opacity-50"
                            >
                              {loading ? 'Updating...' : '✅ Update Item'}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <form onSubmit={handleUpdateItem} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-200 mb-2">
                            Category *
                          </label>
                          <select
                            value={editFormData.category}
                            onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                            className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            required
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-200 mb-2">
                            Color *
                          </label>
                          <input
                            type="text"
                            value={editFormData.color}
                            onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                            className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="e.g., Navy blue, Black"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-200 mb-2">
                            Description *
                          </label>
                          <textarea
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            rows={3}
                            placeholder="e.g., Classic fit, casual style"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-200 mb-2">
                            Add Image (Optional)
                          </label>
                          <div
                            onClick={() => editFileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-teal-500 bg-white/5 transition-colors"
                          >
                            <div className="text-2xl mb-2">📸</div>
                            <p className="text-slate-300 text-sm">Click to upload image</p>
                          </div>
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleEditImageUpload(file);
                              }
                            }}
                            className="hidden"
                          />
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button
                            type="button"
                            onClick={handleCloseEditModal}
                            className="px-6 py-3 bg-white/10 text-slate-200 rounded-full font-semibold hover:bg-white/20 border border-white/15 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-all disabled:opacity-50"
                          >
                            {loading ? 'Updating...' : '✅ Update Item'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer Modal */}
        {viewingImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingImage(null)}
          >
            <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
              <img
                src={viewingImage}
                alt="Full size view"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setViewingImage(null)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-3 text-2xl transition-all"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Duplicate Item Modal */}
        <ConfirmationModal
          isOpen={showDuplicateModal}
          title="Similar Item Found! ⚠️"
          message={
            duplicateItem ? (
              <div className="space-y-4">
                <p className="text-center text-slate-200">We found a similar item already in your wardrobe:</p>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  {duplicateItem.image_data && (
                    <img
                      src={`data:image/jpeg;base64,${duplicateItem.image_data}`}
                      alt="Existing item"
                      className="w-full max-h-32 object-contain mb-3 rounded"
                    />
                  )}
                  <p className="font-semibold text-white capitalize">{duplicateItem.category}</p>
                  {duplicateItem.color && (
                    <p className="text-sm text-slate-300">Color: {duplicateItem.color}</p>
                  )}
                  {duplicateItem.description && (
                    <p className="text-sm text-slate-300 mt-1">{duplicateItem.description}</p>
                  )}
                </div>
                <p className="text-sm text-slate-300 text-center">Do you still want to add this item anyway?</p>
              </div>
            ) : (
              "A similar item already exists in your wardrobe. Do you still want to add it?"
            )
          }
          confirmText="Yes, Add Anyway"
          cancelText="Cancel"
          onConfirm={async () => {
            setShowDuplicateModal(false);
            if (!imageFile) return;
            
            try {
              await addItem(formData, imageFile);
              handleCloseModal();
              setDuplicateItem(null);
            } catch (err) {
              console.error('Error adding item:', err);
            }
          }}
          onCancel={() => {
            setShowDuplicateModal(false);
            setDuplicateItem(null);
          }}
        />

        {/* History Suggestions Modal */}
        {showHistorySuggestionsModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto backdrop-blur">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">📚 History Suggestions</h2>
                  <button
                    onClick={() => {
                      setShowHistorySuggestionsModal(false);
                      setHistorySuggestions([]);
                      setHistorySuggestionsError(null);
                      setHistorySourceItem(null);
                    }}
                    className="text-slate-400 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {historySourceItem && (
                  <p className="text-slate-300 mb-4">
                    Showing history outfits for selected item: <span className="text-white font-medium capitalize">{historySourceItem.category}</span>
                  </p>
                )}

                {historySuggestionsError && (
                  <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-3 mb-4 text-amber-100">
                    {historySuggestionsError}
                  </div>
                )}

                {historySuggestions.length > 0 ? (
                  <div className="space-y-3">
                    {historySuggestions.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString()}</p>
                            <p className="mt-2 text-slate-100"><span className="font-medium">Shirt:</span> {entry.shirt}</p>
                            <p className="text-slate-100"><span className="font-medium">Trouser:</span> {entry.trouser}</p>
                            <p className="text-slate-100"><span className="font-medium">Blazer:</span> {entry.blazer}</p>
                            <p className="text-slate-100"><span className="font-medium">Shoes:</span> {entry.shoes}</p>
                            <p className="text-slate-100"><span className="font-medium">Belt:</span> {entry.belt}</p>
                            <p className="mt-2 text-sm text-slate-300 line-clamp-3">{entry.reasoning}</p>
                          </div>
                          <button
                            onClick={() => handleSelectHistorySuggestion(entry)}
                            className="px-4 py-2 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors whitespace-nowrap"
                          >
                            Use This
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !historySuggestionsError && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
                      No matching history suggestions found for this item.
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wardrobe;
