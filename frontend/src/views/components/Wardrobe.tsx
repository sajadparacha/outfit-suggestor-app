import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useWardrobeController } from '../../controllers/useWardrobeController';
import { WardrobeItem, WardrobeItemCreate, WardrobeItemUpdate } from '../../models/WardrobeModels';
import { Filters, OutfitHistoryEntry, SourceWardrobeItem } from '../../models/OutfitModels';
import ApiService from '../../services/ApiService';
import { isValidImageSize, formatFileSize } from '../../utils/imageUtils';
import { WARDROBE_MAX_SIZE_MB } from '../../constants/imageLimits';
import { UI_CONFIG } from '../../utils/constants';
import ConfirmationModal from './ConfirmationModal';
import AnalysisPreferences from './AnalysisPreferences';
import LoadingOverlay from './LoadingOverlay';
import { historyEntryToSuggestion } from '../../utils/historyUtils';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';
import {
  WARDROBE_FORM_CATEGORIES,
  apiCategoryParamForFilter,
  CompleteOutfitSlot,
  COMPLETE_OUTFIT_MAX_ITEMS,
  formatCompleteOutfitSlotLabel,
  getFilterChipCount,
  getVisibleFilterChips,
  hasCompleteOutfitUpperBodyConflict,
  isUpperBodyExclusiveCompleteOutfitSlot,
  matchesWardrobeCategoryFilter,
  normalizeCompleteOutfitSlot,
  usesClientSideCategoryFilter,
  wardrobeCategoryLabel,
} from '../../utils/wardrobeCategory';

const CLIENT_SIDE_FILTER_LOAD_LIMIT = 100;

interface WardrobeProps {
  initialCategory?: string | null;
  isAuthenticated?: boolean;
  onSuggestionReady?: (suggestion: any) => void; // Callback when outfit suggestion is ready
  onNavigateToMain?: () => void; // Callback to navigate to main view
  onSourceImageLoaded?: () => void; // Callback after source wardrobe image is preloaded in main flow
  onAnalyzeWardrobe?: () => void;
  analyzingWardrobe?: boolean;
  outfitController?: {
    setImage: (image: File | null) => void;
    setSourceWardrobeItem?: (item: SourceWardrobeItem | null) => void;
    prepareStyleFromWardrobeItem?: (item: WardrobeItem) => Promise<void>;
    completeOutfitFromWardrobeSelection?: (selectedWardrobeItemIds: number[]) => Promise<void>;
    getSuggestion: (
      skipDuplicateCheck?: boolean,
      sourceImage?: File | null,
      alternateFromPrevious?: boolean
    ) => Promise<void>;
    filters?: Filters;
    setFilters?: (filters: Filters) => void;
    preferenceText?: string;
    setPreferenceText?: (text: string) => void;
    loading: boolean;
    error: string | null;
    showDuplicateModal: boolean;
    handleUseCachedSuggestion: () => void;
    useWardrobeOnly?: boolean;
    setUseWardrobeOnly?: (value: boolean) => void;
  }; // Outfit controller to use same logic as main view
}

const Wardrobe: React.FC<WardrobeProps> = ({ 
  initialCategory = null,
  isAuthenticated = false,
  onSuggestionReady,
  onNavigateToMain,
  onSourceImageLoaded,
  outfitController,
  onAnalyzeWardrobe,
  analyzingWardrobe = false,
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
  const [historyLoadingMessage, setHistoryLoadingMessage] = useState<string | null>(null);
  const [showHistorySuggestionsModal, setShowHistorySuggestionsModal] = useState(false);
  const [historySuggestions, setHistorySuggestions] = useState<OutfitHistoryEntry[]>([]);
  const [historySuggestionsError, setHistorySuggestionsError] = useState<string | null>(null);
  const [historySourceItem, setHistorySourceItem] = useState<WardrobeItem | null>(null);
  const [flowTipDismissed, setFlowTipDismissed] = useState(
    () => localStorage.getItem('wardrobe_flow_tip_dismissed') === 'true'
  );
  const [selectedCompleteOutfitItems, setSelectedCompleteOutfitItems] = useState<WardrobeItem[]>([]);
  const [completionLoading, setCompletionLoading] = useState(false);

  const [hiddenItemIds, setHiddenItemIds] = useState<Set<number>>(new Set());
  const [openMenuItemId, setOpenMenuItemId] = useState<number | null>(null);
  const [showDeleteUndoToast, setShowDeleteUndoToast] = useState(false);
  const pendingDeleteRef = useRef<{
    itemId: number;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  const visibleWardrobeItems = useMemo(() => {
    let items = wardrobeItems.filter((item) => !hiddenItemIds.has(item.id));
    if (selectedCategory) {
      items = items.filter((item) => matchesWardrobeCategoryFilter(item.category, selectedCategory));
    }
    return items;
  }, [wardrobeItems, hiddenItemIds, selectedCategory]);

  const visibleFilterChips = useMemo(() => getVisibleFilterChips(summary), [summary]);
  const selectedCompleteOutfitIds = useMemo(
    () => new Set(selectedCompleteOutfitItems.map((item) => item.id)),
    [selectedCompleteOutfitItems]
  );
  const selectedCompleteOutfitSlots = useMemo(
    () => {
      const slots = new Set<CompleteOutfitSlot>();
      selectedCompleteOutfitItems.forEach((item) => {
        const slot = normalizeCompleteOutfitSlot(item.category);
        if (slot) slots.add(slot);
      });
      return slots;
    },
    [selectedCompleteOutfitItems]
  );

  const clearPendingDeleteUi = useCallback(() => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timeoutId);
      pendingDeleteRef.current = null;
    }
    setShowDeleteUndoToast(false);
  }, []);

  const commitPendingDelete = useCallback(async () => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pendingDeleteRef.current = null;
    setShowDeleteUndoToast(false);

    const { itemId } = pending;
    try {
      await deleteItem(itemId);
    } catch {
      // Error surfaced by controller
    } finally {
      setHiddenItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [deleteItem]);

  const handleUndoDelete = useCallback(() => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pendingDeleteRef.current = null;
    setShowDeleteUndoToast(false);
    setHiddenItemIds((prev) => {
      const next = new Set(prev);
      next.delete(pending.itemId);
      return next;
    });
  }, []);

  const handleDeleteItem = useCallback(
    (itemId: number) => {
      void (async () => {
        await commitPendingDelete();

        setHiddenItemIds((prev) => new Set(prev).add(itemId));
        setShowDeleteUndoToast(true);

        const timeoutId = setTimeout(() => {
          void commitPendingDelete();
        }, UI_CONFIG.undoDeleteDurationMs);

        pendingDeleteRef.current = { itemId, timeoutId };
      })();
    },
    [commitPendingDelete]
  );

  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (openMenuItemId === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-wardrobe-item-menu]')) {
        setOpenMenuItemId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuItemId]);

  const dismissFlowTip = () => {
    localStorage.setItem('wardrobe_flow_tip_dismissed', 'true');
    setFlowTipDismissed(true);
  };

  const loadWardrobeItemImageIntoFlow = async (item: WardrobeItem) => {
    if (!item.image_data || !outfitController) return;

    const response = await fetch(`data:image/jpeg;base64,${item.image_data}`);
    const blob = await response.blob();
    const file = new File([blob], `wardrobe-item-${item.id}.jpg`, { type: 'image/jpeg' });

    outfitController.setSourceWardrobeItem?.({
      id: item.id,
      category: item.category,
      color: item.color,
    });
    outfitController.setImage(file);
    onSourceImageLoaded?.();
  };

  const applyWardrobeItemToMainFlow = async (item: WardrobeItem) => {
    if (!outfitController) return;

    if (outfitController.prepareStyleFromWardrobeItem) {
      await outfitController.prepareStyleFromWardrobeItem(item);
      onSourceImageLoaded?.();
      return;
    }

    await loadWardrobeItemImageIntoFlow(item);
  };

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

  const categories = WARDROBE_FORM_CATEGORIES;

  const loadWardrobeWithCategoryFilter = useCallback((
    category: string | null,
    search?: string,
    page: number = 1
  ) => {
    const apiCategory = apiCategoryParamForFilter(category);
    const bulkLimit = usesClientSideCategoryFilter(category) ? CLIENT_SIDE_FILTER_LOAD_LIMIT : undefined;
    loadWardrobe(apiCategory, search, page, bulkLimit);
  }, [loadWardrobe]);

  const isClientSideCategoryFilter = usesClientSideCategoryFilter(selectedCategory);

  // Load wardrobe and summary on mount or when initialCategory changes
  React.useEffect(() => {
    // Summary is loaded by the wardrobe controller hook on mount.
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      loadWardrobeWithCategoryFilter(initialCategory, undefined, 1);
    } else {
      loadWardrobe(undefined, undefined, 1);
    }
  }, [loadWardrobe, loadSummary, initialCategory, setSelectedCategory, loadWardrobeWithCategoryFilter]);

  // Handle category filter
  const handleCategoryFilter = (category: string | null) => {
    if (category === selectedCategory) {
      // If clicking the same category, deselect it to show all
      setSelectedCategory(null);
      loadWardrobe(undefined, searchQuery || undefined, 1);
    } else {
      setSelectedCategory(category);
      loadWardrobeWithCategoryFilter(category, searchQuery || undefined, 1);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearchQuery);
    loadWardrobeWithCategoryFilter(selectedCategory, localSearchQuery || undefined, 1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    loadWardrobeWithCategoryFilter(selectedCategory, searchQuery || undefined, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = isClientSideCategoryFilter
    ? 0
    : totalCount > 0
      ? Math.ceil(totalCount / itemsPerPage)
      : 0;

  // Function to highlight search term in text
  const highlightSearchTerm = (text: string | null, searchTerm: string): React.ReactNode => {
    if (!text || !searchTerm) return text || '';
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-brand-blue/30 text-slate-200 font-medium px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
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
        await applyWardrobeItemToMainFlow(item);
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

  const handleToggleCompleteOutfitItem = (item: WardrobeItem) => {
    const slot = normalizeCompleteOutfitSlot(item.category);
    if (!slot) {
      setSuggestionError('This item is not eligible for outfit completion.');
      return;
    }

    setSelectedCompleteOutfitItems((current) => {
      if (current.some((selected) => selected.id === item.id)) {
        setSuggestionError(null);
        return current.filter((selected) => selected.id !== item.id);
      }

      if (current.some((selected) => normalizeCompleteOutfitSlot(selected.category) === slot)) {
        setSuggestionError('Choose one item per outfit slot');
        return current;
      }

      if (isUpperBodyExclusiveCompleteOutfitSlot(slot)) {
        const selectedSlots = current
          .map((selected) => normalizeCompleteOutfitSlot(selected.category))
          .filter((selectedSlot): selectedSlot is CompleteOutfitSlot => selectedSlot !== null);
        if (hasCompleteOutfitUpperBodyConflict(selectedSlots, slot)) {
          setSuggestionError('Choose only one of blazer, outerwear, or sweater');
          return current;
        }
      }

      if (current.length >= COMPLETE_OUTFIT_MAX_ITEMS) {
        setSuggestionError('Select up to 5 items');
        return current;
      }

      setSuggestionError(null);
      return [...current, item];
    });
  };

  const handleCompleteOutfitWithAI = async () => {
    if (selectedCompleteOutfitItems.length < 1) {
      setSuggestionError('Select at least 1 item');
      return;
    }

    const selectedIds = selectedCompleteOutfitItems.map((item) => item.id);
    setCompletionLoading(true);
    setSuggestionError(null);

    try {
      if (outfitController?.completeOutfitFromWardrobeSelection) {
        await outfitController.completeOutfitFromWardrobeSelection(selectedIds);
      } else {
        const data = await ApiService.getWardrobeOnlySuggestion('', '', '', '', undefined, selectedIds);
        onSuggestionReady?.({
          ...data,
          id: Date.now().toString(),
          model_image: data.model_image || null,
          raw: data,
          matching_wardrobe_items: data.matching_wardrobe_items,
          meta: { source: 'wardrobe_multi_select', selectedWardrobeItemIds: selectedIds },
        });
      }

      setSelectedCompleteOutfitItems([]);
      onNavigateToMain?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete outfit';
      setSuggestionError(errorMessage);
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleOpenHistorySuggestions = async (item: WardrobeItem) => {
    setHistoryLoadingForItem(item.id);
    setHistoryLoadingMessage('Loading past suggestions for this item…');
    setHistorySuggestionsError(null);
    setHistorySuggestions([]);
    setHistorySourceItem(item);

    try {
      setHistoryLoadingMessage('Loading your saved looks…');
      const allHistory = await ApiService.getOutfitHistory(100);

      setHistoryLoadingMessage('Finding outfits for this item…');
      const matchingByItem = allHistory.filter((entry) => historyEntryReferencesItem(entry, item));

      setHistoryLoadingMessage('Preparing suggestions…');
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
      setHistoryLoadingMessage(null);
    }
  };

  const handleSelectHistorySuggestion = async (entry: OutfitHistoryEntry) => {
    if (!historySourceItem?.image_data) {
      setHistorySuggestionsError('Could not load source item image for this history suggestion.');
      return;
    }

    try {
      if (outfitController) {
        await loadWardrobeItemImageIntoFlow(historySourceItem);
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

  const filterChipClass = (active: boolean) =>
    `min-h-[40px] touch-manipulation px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-medium transition-all ${
      active
        ? 'btn-brand'
        : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10'
    }`;
  const completeOutfitActionDisabled =
    completionLoading ||
    (outfitController?.loading ?? false) ||
    selectedCompleteOutfitItems.length < 1;
  const completeOutfitActionCopy = completionLoading || (outfitController?.loading ?? false)
    ? 'Completing your outfit...'
    : selectedCompleteOutfitItems.length < 1
      ? 'Select at least 1 item'
      : 'Complete outfit with AI';
  const selectedSlotSummary = selectedCompleteOutfitItems
    .map((item) => {
      const slot = normalizeCompleteOutfitSlot(item.category);
      return slot ? formatCompleteOutfitSlotLabel(slot) : item.category;
    })
    .join(', ');

  return (
    <div className="overflow-x-hidden py-4 px-3 sm:py-8 sm:px-4">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur sm:mb-6 sm:p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">👔 My Wardrobe</h1>
              <p className="text-sm text-slate-300 sm:text-base">
                Pick a saved piece, build an outfit on Suggest, then generate with your preferences.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:flex-shrink-0">
              {onAnalyzeWardrobe && (
                <button
                  onClick={onAnalyzeWardrobe}
                  disabled={analyzingWardrobe}
                  className={`min-h-[44px] w-full touch-manipulation rounded-xl px-4 py-3 text-sm font-semibold transition-all shadow-md sm:w-auto sm:text-base ${
                    analyzingWardrobe
                      ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-400'
                      : 'btn-brand'
                  }`}
                  aria-label="Analyze my wardrobe gaps"
                >
                  {analyzingWardrobe ? (
                    'Analyzing...'
                  ) : (
                    <>
                      <span className="sm:hidden">Analyze Wardrobe</span>
                      <span className="hidden sm:inline">Analyze My Wardrobe</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="min-h-[44px] w-full touch-manipulation rounded-xl px-6 py-3 text-sm font-semibold shadow-md btn-brand transition-all sm:w-auto sm:text-base"
              >
                + Add Item
              </button>
            </div>
          </div>

          {!flowTipDismissed && wardrobeItems && wardrobeItems.length > 0 && (
            <div className="mt-4 rounded-xl border border-brand-blue/30 bg-brand-gradient-soft p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">How to style from wardrobe</p>
                  <ol className="mt-2 space-y-1.5 text-sm text-slate-200">
                    <li><span className="font-medium text-brand-blue">1.</span> Pick an item below</li>
                    <li><span className="font-medium text-brand-blue">2.</span> Tap <strong className="text-white">Style this item</strong></li>
                    <li><span className="font-medium text-brand-blue">3.</span> On Suggest, set preferences and tap <strong className="text-white">Generate Outfit</strong></li>
                  </ol>
                </div>
                <button
                  type="button"
                  onClick={dismissFlowTip}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                  aria-label="Dismiss wardrobe flow tip"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Category Filters */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mb-1 w-full text-sm font-medium text-slate-300 sm:mb-0 sm:w-auto sm:mr-2">Filter by:</span>
              <button
                onClick={() => handleCategoryFilter(null)}
                className={filterChipClass(selectedCategory === null)}
              >
                All <span className="ml-1 font-semibold">({summary ? summary.total_items || 0 : 0})</span>
              </button>
              {visibleFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => handleCategoryFilter(chip.key)}
                  className={filterChipClass(selectedCategory === chip.key)}
                >
                  {chip.label}
                  <span className="ml-1 font-semibold">
                    ({getFilterChipCount(summary, chip.key)})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur sm:mb-6 sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search description, color, name..."
              className="min-h-[44px] w-full min-w-0 flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue"
            />
            <div className="flex gap-2 sm:flex-shrink-0">
              <button
                type="submit"
                className="min-h-[44px] min-w-0 flex-1 touch-manipulation rounded-xl px-4 py-3 text-sm font-medium transition-colors btn-brand sm:flex-none sm:px-6"
              >
                🔍 Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearchQuery('');
                    setSearchQuery('');
                    loadWardrobeWithCategoryFilter(selectedCategory, undefined, 1);
                  }}
                  className="min-h-[44px] flex-1 touch-manipulation rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/20 sm:flex-none"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
          {searchQuery && (
            <p className="text-sm text-slate-300 mt-2">
              Searching for: <strong className="text-white">&quot;{searchQuery}&quot;</strong>
            </p>
          )}
        </div>

        {/* Complete Outfit Multi-Select */}
        {!loading && wardrobeItems && wardrobeItems.length > 0 && (
          <div
            className="mb-4 rounded-2xl border border-brand-blue/25 bg-brand-gradient-soft p-4 shadow-xl backdrop-blur sm:mb-6 sm:p-5"
            data-testid="wardrobe-completion-panel"
          >
            <div>
              <p className="text-base font-semibold text-white">Complete an outfit from selected wardrobe pieces</p>
              <p className="mt-1 text-sm text-slate-200">
                Select 1 to 5 items across different slots: shirt, trousers, blazer, shoes, belt, jacket or coat
                (outerwear), or sweater (layer). Choose only one of blazer, outerwear, or sweater.
              </p>
              <p
                className="mt-2 text-xs font-medium text-slate-300"
                aria-live="polite"
                data-testid="wardrobe-selection-status"
              >
                {selectedCompleteOutfitItems.length === 0
                  ? 'No items selected'
                  : `${selectedCompleteOutfitItems.length} selected${selectedSlotSummary ? `: ${selectedSlotSummary}` : ''}`}
              </p>
            </div>

            {outfitController?.filters && outfitController.setFilters && outfitController.setPreferenceText && (
              <details
                className="group mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
                open={selectedCompleteOutfitItems.length > 0}
                data-testid="wardrobe-completion-preferences"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 [&::-webkit-details-marker]:hidden">
                  <span>{MAIN_FLOW_UX_COPY.preferencesSection}</span>
                  <span className="text-slate-500 transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-white/10 px-4 py-4">
                  <AnalysisPreferences
                    filters={outfitController.filters}
                    setFilters={outfitController.setFilters}
                    preferenceText={outfitController.preferenceText ?? ''}
                    setPreferenceText={outfitController.setPreferenceText}
                    variant="sidebar"
                    showSharedHint
                    useWardrobeOnly={outfitController.useWardrobeOnly ?? false}
                    setUseWardrobeOnly={outfitController.setUseWardrobeOnly}
                    showWardrobeOnly={isAuthenticated && !!outfitController.setUseWardrobeOnly}
                  />
                </div>
              </details>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {selectedCompleteOutfitItems.some((item) => item.image_data) && (
                <div
                  className="scrollbar-none flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden pt-1 pb-1 sm:order-first sm:mr-auto"
                  data-testid="wardrobe-selection-thumbnails"
                >
                  {selectedCompleteOutfitItems
                    .filter((item) => item.image_data)
                    .map((item) => {
                      const slot = normalizeCompleteOutfitSlot(item.category);
                      const slotLabel = slot ? formatCompleteOutfitSlotLabel(slot) : item.category;
                      return (
                        <div
                          key={item.id}
                          className="relative h-12 w-12 flex-shrink-0"
                        >
                          <button
                            type="button"
                            onClick={() => handleViewImage(item.image_data!)}
                            className="h-full w-full overflow-hidden rounded-lg border border-white/10 bg-slate-800/80 transition hover:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                            aria-label={`View ${slotLabel}`}
                            data-testid={`wardrobe-selection-thumb-${item.id}`}
                          >
                            <img
                              src={`data:image/jpeg;base64,${item.image_data}`}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCompleteOutfitItem(item);
                            }}
                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-slate-900/90 text-xs text-slate-200 shadow-md transition hover:bg-red-500/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                            aria-label={`Remove ${slotLabel}`}
                            data-testid={`wardrobe-selection-remove-${item.id}`}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
              <button
                type="button"
                onClick={handleCompleteOutfitWithAI}
                disabled={completeOutfitActionDisabled}
                className="min-h-[48px] rounded-xl px-5 py-3 text-sm font-semibold shadow-md btn-brand transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[220px]"
              >
                {completeOutfitActionCopy}
              </button>
              {selectedCompleteOutfitItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompleteOutfitItems([]);
                    setSuggestionError(null);
                  }}
                  className="min-h-[40px] rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/20 sm:min-w-[140px]"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
        )}

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
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
            <p className="mt-4 text-slate-200">Loading wardrobe...</p>
          </div>
        ) : !wardrobeItems || (Array.isArray(wardrobeItems) && wardrobeItems.length === 0) ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-12 text-center">
            <div className="text-6xl mb-4">👔</div>
            <h3 className="text-2xl font-bold text-white mb-2">Your wardrobe is empty</h3>
            <p className="text-slate-300 mb-6">Add items to get personalized outfit suggestions!</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 btn-brand rounded-xl font-semibold transition-all"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="space-y-4 pb-6 sm:pb-8">
            {visibleWardrobeItems.map((item) => {
              const completeOutfitSlot = normalizeCompleteOutfitSlot(item.category);
              const isCompleteOutfitEligible = !!completeOutfitSlot;
              const isSelectedForCompleteOutfit = selectedCompleteOutfitIds.has(item.id);
              const slotAlreadySelected =
                !!completeOutfitSlot &&
                selectedCompleteOutfitSlots.has(completeOutfitSlot) &&
                !isSelectedForCompleteOutfit;
              const upperBodySlotTaken =
                !!completeOutfitSlot &&
                isUpperBodyExclusiveCompleteOutfitSlot(completeOutfitSlot) &&
                selectedCompleteOutfitItems.some((selected) => {
                  if (selected.id === item.id) return false;
                  const selectedSlot = normalizeCompleteOutfitSlot(selected.category);
                  return selectedSlot && isUpperBodyExclusiveCompleteOutfitSlot(selectedSlot);
                });
              const completeOutfitSelectionAction = isSelectedForCompleteOutfit ? 'Remove' : 'Add';
              const completeOutfitSelectionAriaLabel = isSelectedForCompleteOutfit
                ? `${completeOutfitSelectionAction} ${item.category} from outfit completion`
                : `${completeOutfitSelectionAction} ${item.category} to outfit completion`;
              const completeOutfitSelectionCopy = isSelectedForCompleteOutfit
                ? 'Remove from outfit completion'
                : isCompleteOutfitEligible
                  ? 'Add to outfit completion'
                  : 'Outfit completion unavailable';
              return (
              <div
                key={item.id}
                data-testid={`wardrobe-item-card-${item.id}`}
                className={`overflow-visible rounded-2xl border p-3 shadow-xl backdrop-blur transition-shadow hover:shadow-2xl sm:p-4${
                  isSelectedForCompleteOutfit
                    ? ' border-brand-blue/70 bg-brand-blue/15 ring-2 ring-brand-blue/40'
                    : ' border-white/10 bg-white/5'
                }${openMenuItemId === item.id ? ' relative z-50' : ''}`}
              >
                <div className="flex gap-3 sm:gap-4">
                  {item.image_data ? (
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-800/80 sm:h-32 sm:w-32">
                      <img
                        src={`data:image/jpeg;base64,${item.image_data}`}
                        alt={item.category}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800/80 sm:h-32 sm:w-32">
                      <span className="text-3xl text-slate-400 sm:text-4xl">📷</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="text-base font-bold text-white sm:text-lg">{wardrobeCategoryLabel(item.category)}</h3>
                      {isSelectedForCompleteOutfit && (
                        <span className="inline-flex w-fit items-center rounded-full border border-brand-blue/30 bg-brand-blue/20 px-2.5 py-1 text-xs font-semibold text-brand-blue">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                    {item.color && (
                      <p className="mt-1 text-sm text-slate-300">
                        <span className="font-medium text-slate-200">Color:</span>{' '}
                        {searchQuery ? highlightSearchTerm(item.color, searchQuery) : item.color}
                      </p>
                    )}
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                        {searchQuery ? highlightSearchTerm(item.description, searchQuery) : item.description}
                      </p>
                    )}
                    {item.name && (
                      <p className="mt-1 text-sm text-slate-300">
                        <span className="font-medium text-slate-200">Name:</span>{' '}
                        {searchQuery ? highlightSearchTerm(item.name, searchQuery) : item.name}
                      </p>
                    )}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleToggleCompleteOutfitItem(item)}
                        disabled={!isCompleteOutfitEligible || completionLoading || (outfitController?.loading ?? false)}
                        aria-pressed={isSelectedForCompleteOutfit}
                        aria-label={completeOutfitSelectionAriaLabel}
                        className={`min-h-[40px] w-full rounded-xl border px-3 py-2 text-sm font-semibold transition sm:w-auto ${
                          isSelectedForCompleteOutfit
                            ? 'border-brand-blue/50 bg-brand-blue/20 text-white hover:bg-brand-blue/30'
                            : isCompleteOutfitEligible
                              ? 'border-white/15 bg-white/10 text-slate-200 hover:bg-white/20'
                              : 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'
                        }`}
                        title={
                          !isCompleteOutfitEligible
                            ? 'Unsupported item category for outfit completion'
                            : upperBodySlotTaken
                              ? 'Choose only one of blazer, outerwear, or sweater'
                              : slotAlreadySelected
                                ? 'Choose one item per outfit slot'
                                : undefined
                        }
                      >
                        {completeOutfitSelectionCopy}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-white/10 pt-3 sm:mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Single-item styling
                  </p>
                  <div className="flex items-stretch gap-2">
                    <button
                      onClick={() => handleGetAISuggestion(item)}
                      disabled={
                        !item.image_data ||
                        suggestionLoading === item.id ||
                        (outfitController?.loading ?? false)
                      }
                      className="flex min-h-[48px] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl border border-brand-blue/30 bg-brand-blue/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Open Suggest with this wardrobe item loaded"
                      aria-label="Style this item with AI"
                    >
                      {suggestionLoading === item.id || (outfitController?.loading ?? false) ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Opening in Suggest…</span>
                        </>
                      ) : (
                        <>
                          <span>✨ Style this item</span>
                          <span className="text-xs font-normal text-white/80">
                            Single-item Suggest flow
                          </span>
                        </>
                      )}
                    </button>
                    <div className="relative flex-shrink-0" data-wardrobe-item-menu>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuItemId((prev) => (prev === item.id ? null : item.id))
                        }
                        className="flex h-12 min-w-[48px] touch-manipulation items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 text-xl text-slate-200 transition hover:bg-white/10"
                        aria-label="More actions"
                        aria-expanded={openMenuItemId === item.id}
                        aria-haspopup="menu"
                        data-testid={`wardrobe-item-menu-${item.id}`}
                      >
                        ⋮
                      </button>
                      {openMenuItemId === item.id && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-white/15 bg-slate-900 py-1 shadow-2xl"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            disabled={!item.image_data}
                            onClick={() => {
                              if (item.image_data) {
                                handleViewImage(item.image_data);
                                setOpenMenuItemId(null);
                              }
                            }}
                            className="flex w-full min-h-[44px] touch-manipulation items-center px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="View image"
                            data-testid={`wardrobe-menu-view-image-${item.id}`}
                          >
                            View image
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              handleEditItem(item);
                              setOpenMenuItemId(null);
                            }}
                            className="flex w-full min-h-[44px] touch-manipulation items-center px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10"
                            aria-label="Edit"
                            data-testid={`wardrobe-menu-edit-${item.id}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={historyLoadingForItem === item.id}
                            onClick={() => {
                              void handleOpenHistorySuggestions(item);
                              setOpenMenuItemId(null);
                            }}
                            className="flex w-full min-h-[44px] touch-manipulation items-center px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Past Suggestions"
                            data-testid={`wardrobe-menu-past-suggestions-${item.id}`}
                          >
                            {historyLoadingForItem === item.id ? 'Loading…' : 'Past Suggestions'}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              handleDeleteItem(item.id);
                              setOpenMenuItemId(null);
                            }}
                            className="flex w-full min-h-[44px] touch-manipulation items-center px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-white/10 hover:text-red-300"
                            aria-label="Delete"
                            data-testid={`wardrobe-menu-delete-${item.id}`}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur sm:mt-6 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-center text-sm text-slate-300 sm:text-left">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
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
                            ? 'btn-brand'
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
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mb-4"></div>
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
                        className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-brand-blue bg-white/5 transition-colors"
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
                        className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                        className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                        className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                        className="flex-1 px-6 py-3 btn-brand rounded-full font-semibold transition-all disabled:opacity-50"
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
                              className="text-sm text-brand-blue underline"
                            >
                              Try analyzing again
                            </button>
                          </div>
                        )}
                        {!analysisError && imagePreview && (
                          <div className="bg-brand-gradient-soft border border-brand-blue/30 rounded-xl p-3 mb-4">
                            <p className="text-sm text-slate-200">
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
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                              className="flex-1 px-6 py-3 btn-brand rounded-full font-semibold transition-all disabled:opacity-50"
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
                          className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center cursor-pointer hover:border-brand-blue bg-white/5 transition-colors"
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
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mb-4"></div>
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
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                              className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                              className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-brand-blue bg-white/5 transition-colors"
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
                              className="flex-1 px-6 py-3 btn-brand rounded-full font-semibold transition-all disabled:opacity-50"
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
                            className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                            className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                            className="w-full px-3 py-2 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                            className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-brand-blue bg-white/5 transition-colors"
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
                            className="flex-1 px-6 py-3 btn-brand rounded-full font-semibold transition-all disabled:opacity-50"
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
                  <p className="font-semibold text-white">{wardrobeCategoryLabel(duplicateItem.category)}</p>
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
                    Showing history outfits for selected item: <span className="text-white font-medium">{wardrobeCategoryLabel(historySourceItem.category)}</span>
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Suggestion #{entry.id}</span>
                              <span className="text-[11px] px-2 py-1 rounded-full border border-white/15 bg-white/5 text-slate-300">
                                {new Date(entry.created_at).toLocaleString()}
                              </span>
                            </div>

                            {entry.text_input && (
                              <p className="mt-2 text-sm text-slate-300 line-clamp-2">
                                <span className="text-slate-400">Prompt:</span> {entry.text_input}
                              </p>
                            )}

                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                                <span className="text-slate-400">👔 Shirt:</span> {entry.shirt}
                              </div>
                              <div className="rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                                <span className="text-slate-400">👖 Trouser:</span> {entry.trouser}
                              </div>
                              <div className="rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                                <span className="text-slate-400">🧥 Blazer:</span> {entry.blazer}
                              </div>
                              <div className="rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                                <span className="text-slate-400">👞 Shoes:</span> {entry.shoes}
                              </div>
                              <div className="rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 sm:col-span-2">
                                <span className="text-slate-400">🎀 Belt:</span> {entry.belt}
                              </div>
                            </div>

                            <div className="mt-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-3">
                              <p className="text-xs uppercase tracking-wide text-brand-blue mb-1">Why This Works</p>
                              <p className="text-sm text-slate-200 line-clamp-3">{entry.reasoning}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSelectHistorySuggestion(entry)}
                            className="px-4 py-2 btn-brand rounded-xl font-semibold transition-colors whitespace-nowrap"
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

        <LoadingOverlay
          isLoading={historyLoadingForItem !== null}
          operationType="past-suggestions"
          message={historyLoadingMessage ?? 'Loading past suggestions for this item…'}
        />

        {showDeleteUndoToast && (
          <div
            className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-slide-in sm:left-auto sm:right-6 sm:translate-x-0"
            role="status"
            aria-live="polite"
            data-testid="wardrobe-delete-undo-toast"
          >
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur">
              <p className="flex-1 text-sm font-medium text-white">Item deleted.</p>
              <button
                type="button"
                onClick={handleUndoDelete}
                className="text-sm font-semibold text-brand-blue transition-opacity hover:opacity-80"
                aria-label="Undo delete"
              >
                Undo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wardrobe;
