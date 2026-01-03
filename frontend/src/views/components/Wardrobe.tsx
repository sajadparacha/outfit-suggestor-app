import React, { useState, useRef, useEffect } from 'react';
import { useWardrobeController } from '../../controllers/useWardrobeController';
import { WardrobeItem, WardrobeItemCreate } from '../../models/WardrobeModels';
import ApiService from '../../services/ApiService';
import ConfirmationModal from './ConfirmationModal';

interface WardrobeProps {
  initialCategory?: string | null;
}

const Wardrobe: React.FC<WardrobeProps> = ({ initialCategory = null }) => {
  const {
    wardrobeItems,
    summary,
    loading,
    error,
    selectedCategory,
    loadWardrobe,
    analyzeImage,
    addItem,
    deleteItem,
    setSelectedCategory,
    clearError,
  } = useWardrobeController();

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

  // Essential categories only - matches outfit suggestion structure
  const categories = ['shirt', 'trouser', 'blazer', 'shoes', 'belt', 'other'];

  // Load wardrobe on mount or when initialCategory changes
  React.useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      loadWardrobe(initialCategory);
    } else {
      loadWardrobe();
    }
  }, [loadWardrobe, initialCategory, setSelectedCategory]);

  // Handle category filter
  const handleCategoryFilter = (category: string | null) => {
    if (category === selectedCategory) {
      // If clicking the same category, deselect it to show all
      setSelectedCategory(null);
      loadWardrobe();
    } else {
      setSelectedCategory(category);
      loadWardrobe(category || undefined);
    }
  };

  // Get category count from summary
  const getCategoryCount = (category: string): number => {
    if (!summary || !summary.by_category) return 0;
    return summary.by_category[category] || 0;
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
                All {summary && `(${summary.total_items || 0})`}
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
                  {summary && ` (${getCategoryCount(category)})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-red-800">{error}</span>
            <button onClick={clearError} className="text-red-600 hover:text-red-800">✕</button>
          </div>
        )}

        {/* Wardrobe Items List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading wardrobe...</p>
          </div>
        ) : wardrobeItems.length === 0 ? (
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
            {wardrobeItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow">
                {item.image_data && (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={`data:image/jpeg;base64,${item.image_data}`}
                      alt={item.category}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 capitalize text-lg">{item.category}</h3>
                      {item.color && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Color:</span> {item.color}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-500 hover:text-red-700 text-xl ml-4 flex-shrink-0"
                      title="Delete item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
