import React, { useState, useRef } from 'react';
import { useWardrobeController } from '../../controllers/useWardrobeController';
import { WardrobeItem, WardrobeItemCreate, WardrobeItemUpdate } from '../../models/WardrobeModels';
import ApiService from '../../services/ApiService';
import ConfirmationModal from './ConfirmationModal';

interface WardrobeProps {
  initialCategory?: string | null;
  onSuggestionReady?: (suggestion: any) => void; // Callback when outfit suggestion is ready
  onNavigateToMain?: () => void; // Callback to navigate to main view
  outfitController?: {
    setImage: (image: File | null) => void;
    getSuggestion: (skipDuplicateCheck?: boolean, sourceImage?: File | null) => Promise<void>;
    loading: boolean;
    error: string | null;
    showDuplicateModal: boolean;
    handleUseCachedSuggestion: () => void;
  }; // Outfit controller to use same logic as main view
}

const Wardrobe: React.FC<WardrobeProps> = ({ 
  initialCategory = null,
  onSuggestionReady,
  onNavigateToMain,
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

  // Essential categories only - matches outfit suggestion structure
  const categories = ['shirt', 'trouser', 'blazer', 'shoes', 'belt', 'other'];

  // Load wardrobe and summary on mount or when initialCategory changes
  React.useEffect(() => {
    // Load summary first to get counts
    loadSummary();
    
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      loadWardrobe(initialCategory, undefined, 1);
    } else {
      loadWardrobe(undefined, undefined, 1);
    }
  }, [loadWardrobe, loadSummary, initialCategory, setSelectedCategory]);

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
            <mark key={index} className="bg-yellow-300 text-gray-900 font-medium px-0.5 rounded">
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
      setSuggestionError('This item doesn\'t have an image. Please add an image first.');
      return;
    }

    // If outfit controller is provided, use the same logic as main view
    if (outfitController) {
      setSuggestionLoading(item.id);
      setSuggestionError(null);

      try {
        // Convert base64 image to File object
        const base64Image = item.image_data;
        const response = await fetch(`data:image/jpeg;base64,${base64Image}`);
        const blob = await response.blob();
        const file = new File([blob], `wardrobe-item-${item.id}.jpg`, { type: 'image/jpeg' });

        // Set the image in the outfit controller (same as main view)
        outfitController.setImage(file);

        // Navigate to main view BEFORE getting suggestion
        // This ensures duplicate modal (if shown) appears on main view
        // and the suggestion will be displayed correctly
        if (onNavigateToMain) {
          onNavigateToMain();
        }

        // Get suggestion using the same logic as main view
        // This will handle duplicate checking, compression, filters, etc.
        // IMPORTANT: pass the same File we just created so duplicate
        // detection and the final suggestion both use this wardrobe item's
        // image, avoiding any stale state from previous uploads.
        // If duplicate is found, the confirmation modal on the main view
        // will allow you to "Use Existing" or "Get New".
        await outfitController.getSuggestion(false, file); // Enable duplicate check with explicit image
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get outfit suggestion';
        setSuggestionError(errorMessage);
        console.error('Error getting outfit suggestion:', err);
      } finally {
        setSuggestionLoading(null);
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
          'dalle3'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">👔 My Wardrobe</h1>
              <p className="text-gray-600">Add items to get personalized outfit suggestions</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md"
            >
              + Add Item
            </button>
          </div>

          {/* Category Filters */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700 mr-2">Filter by:</span>
              <button
                onClick={() => handleCategoryFilter(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === null
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All <span className="ml-1 font-semibold">({summary ? summary.total_items || 0 : 0})</span>
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryFilter(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                    selectedCategory === category
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search by description, color, or name..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
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
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </form>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Searching for: <strong>"{searchQuery}"</strong>
            </p>
          )}
        </div>

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-red-800">{error}</span>
            <button onClick={clearError} className="text-red-600 hover:text-red-800">✕</button>
          </div>
        )}
        {outfitController?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-red-800">{outfitController.error}</span>
            <button onClick={clearError} className="text-red-600 hover:text-red-800">✕</button>
          </div>
        )}
        {suggestionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-red-800">{suggestionError}</span>
            <button onClick={() => setSuggestionError(null)} className="text-red-600 hover:text-red-800">✕</button>
          </div>
        )}

        {/* Wardrobe Items List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading wardrobe...</p>
          </div>
        ) : !wardrobeItems || (Array.isArray(wardrobeItems) && wardrobeItems.length === 0) ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">👔</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Your wardrobe is empty</h3>
            <p className="text-gray-600 mb-6">Add items to get personalized outfit suggestions!</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {wardrobeItems && Array.isArray(wardrobeItems) && wardrobeItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow">
                {item.image_data && (
                  <div 
                    className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 ring-indigo-500 transition-all"
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
                  <div className="w-32 h-32 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <span className="text-gray-400 text-4xl">📷</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 capitalize text-lg">{item.category}</h3>
                      {item.color && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Color:</span>{' '}
                          {searchQuery ? highlightSearchTerm(item.color, searchQuery) : item.color}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {searchQuery ? highlightSearchTerm(item.description, searchQuery) : item.description}
                        </p>
                      )}
                      {item.name && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Name:</span>{' '}
                          {searchQuery ? highlightSearchTerm(item.name, searchQuery) : item.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      {item.image_data && (
                        <button
                          onClick={() => handleGetAISuggestion(item)}
                          disabled={suggestionLoading === item.id || (outfitController?.loading ?? false)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
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
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-blue-500 hover:text-blue-700 text-xl"
                        title="Edit item"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 text-xl"
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
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === 1 || loading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === totalPages || loading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {imagePreview && !analyzing ? '✏️ Review & Add to Wardrobe' : '📸 Add Item to Wardrobe'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {analyzing ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">🤖 AI is analyzing your item...</p>
                    <p className="text-sm text-gray-500 mt-2">Please wait while we extract details from your image</p>
                  </div>
                ) : analysisError && !imagePreview ? (
                  <form onSubmit={handleAddItem} className="space-y-4">
                    {/* Manual entry fallback if analysis fails */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ <strong>AI analysis failed:</strong> {analysisError}
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        You can still add the item manually below.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Image *
                      </label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                      >
                        <div className="text-4xl mb-2">📸</div>
                        <p className="text-gray-600 font-medium">Click to upload</p>
                        <p className="text-sm text-gray-500 mt-1">JPG, PNG up to 20MB</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file);
                          }
                        }}
                        className="hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color *
                      </label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., Navy blue, Black"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        rows={3}
                        placeholder="e.g., Classic fit, casual style"
                        required
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
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
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-yellow-800 mb-2">
                              ⚠️ AI analysis had issues, but you can still save manually.
                            </p>
                            <button
                              onClick={() => {
                                setAnalysisError(null);
                                setAnalyzing(true);
                                handleImageUpload(imageFile!);
                              }}
                              className="text-sm text-yellow-700 underline"
                            >
                              Try analyzing again
                            </button>
                          </div>
                        )}
                        {!analysisError && imagePreview && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-blue-800">
                              ✨ <strong>AI Analysis Complete!</strong> Review and edit the extracted details below before saving.
                            </p>
                          </div>
                        )}
                        <form onSubmit={handleAddItem} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Category *
                            </label>
                            <select
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Color *
                            </label>
                            <input
                              type="text"
                              value={formData.color}
                              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="e.g., Navy blue, Black"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description *
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                            >
                              Choose Different Photo
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
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
                          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                        >
                          <div className="text-6xl mb-4">📸</div>
                          <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
                          <p className="text-sm text-gray-500 mt-2">JPG, PNG up to 20MB</p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
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
                          className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editImagePreview && !editAnalyzing ? '✏️ Edit Wardrobe Item' : '✏️ Edit Wardrobe Item'}
                  </h2>
                  <button
                    onClick={handleCloseEditModal}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {editAnalyzing ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">🤖 AI is analyzing your image...</p>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Category *
                            </label>
                            <select
                              value={editFormData.category}
                              onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Color *
                            </label>
                            <input
                              type="text"
                              value={editFormData.color}
                              onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="e.g., Navy blue, Black"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description *
                            </label>
                            <textarea
                              value={editFormData.description}
                              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              rows={3}
                              placeholder="e.g., Classic fit, casual style"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Change Image (Optional)
                            </label>
                            <div
                              onClick={() => editFileInputRef.current?.click()}
                              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                            >
                              <div className="text-2xl mb-2">📸</div>
                              <p className="text-gray-600 text-sm">Click to upload new image</p>
                            </div>
                            <input
                              ref={editFileInputRef}
                              type="file"
                              accept="image/*"
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
                              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                              {loading ? 'Updating...' : '✅ Update Item'}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <form onSubmit={handleUpdateItem} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category *
                          </label>
                          <select
                            value={editFormData.category}
                            onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color *
                          </label>
                          <input
                            type="text"
                            value={editFormData.color}
                            onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., Navy blue, Black"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description *
                          </label>
                          <textarea
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            rows={3}
                            placeholder="e.g., Classic fit, casual style"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Add Image (Optional)
                          </label>
                          <div
                            onClick={() => editFileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                          >
                            <div className="text-2xl mb-2">📸</div>
                            <p className="text-gray-600 text-sm">Click to upload image</p>
                          </div>
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="image/*"
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
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
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
                <p className="text-center">We found a similar item already in your wardrobe:</p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {duplicateItem.image_data && (
                    <img
                      src={`data:image/jpeg;base64,${duplicateItem.image_data}`}
                      alt="Existing item"
                      className="w-full max-h-32 object-contain mb-3 rounded"
                    />
                  )}
                  <p className="font-semibold text-gray-800 capitalize">{duplicateItem.category}</p>
                  {duplicateItem.color && (
                    <p className="text-sm text-gray-600">Color: {duplicateItem.color}</p>
                  )}
                  {duplicateItem.description && (
                    <p className="text-sm text-gray-600 mt-1">{duplicateItem.description}</p>
                  )}
                </div>
                <p className="text-sm text-gray-600 text-center">Do you still want to add this item anyway?</p>
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
      </div>
    </div>
  );
};

export default Wardrobe;
