import React, { useState, useRef, useEffect } from 'react';
import { useWardrobeController } from '../../controllers/useWardrobeController';
import { WardrobeItem, WardrobeItemCreate } from '../../models/WardrobeModels';

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
  const [step, setStep] = useState<'upload' | 'review'>('upload'); // Two-step process: upload → review
  const [formData, setFormData] = useState<WardrobeItemCreate>({
    category: 'shirt',
    color: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('blip'); // 'blip' or 'vit-gpt2'
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['shirt', 'trouser', 'blazer', 'jacket', 'shoes', 'belt', 'tie', 'suit', 'sweater', 'polo', 't_shirt', 'jeans', 'shorts', 'other'];

  // Handle initial category filter from navigation and load wardrobe
  React.useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      loadWardrobe(initialCategory);
    } else {
      loadWardrobe();
    }
  }, [loadWardrobe, initialCategory, setSelectedCategory]);

  const handleImageUpload = async (file: File) => {
    setImageFile(file);
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisComplete(false);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    try {
      // Analyze image with AI using selected model
      const properties = await analyzeImage(file, selectedModel);
      
      console.log('📊 Analysis properties received:', properties);
      console.log('🤖 Model used:', properties.model_used);
      
      // Auto-populate form with extracted properties (simplified - only category, color, description)
      setFormData({
        category: properties.category || 'shirt',
        color: properties.color || '',
        description: properties.description || '',
      });
      
      // Store model information (backend always returns model_used)
      if (properties.model_used) {
        console.log('✅ Setting model used:', properties.model_used);
        setModelUsed(properties.model_used);
      } else {
        console.warn('⚠️ No model_used in response:', properties);
      }
      setAnalysisComplete(true);
      // Move to review step
      setStep('review');
    } catch (err) {
      // Show error but allow manual entry
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze image';
      setAnalysisError(errorMessage);
      console.error('Failed to analyze image:', err);
      // Don't block user - they can still proceed manually
    } finally {
      setAnalyzing(false);
    }
  };

  const handleProceedToReview = () => {
    // Allow user to proceed to review step even if AI analysis failed
    setStep('review');
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addItem(formData, imageFile || undefined);
      // Reset modal
      setShowAddModal(false);
      setStep('upload');
      setFormData({
        category: 'shirt',
        color: '',
        description: '',
      });
      setImageFile(null);
      setImagePreview(null);
      setAnalysisError(null);
      setAnalysisComplete(false);
      setModelUsed(null);
      setSelectedModel('blip'); // Reset to default
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      // Error is handled by controller
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setStep('upload');
    setFormData({
      category: 'shirt',
      color: '',
      description: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setAnalysisError(null);
    setAnalysisComplete(false);
    setModelUsed(null);
    setSelectedModel('blip'); // Reset to default
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

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
    loadWardrobe(category || undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">👔 My Wardrobe</h1>
              <p className="text-gray-600">Manage your clothing items for personalized outfit suggestions</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-purple-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all shadow-lg"
            >
              + Add Item
            </button>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{summary.total_items}</div>
                <div className="text-sm text-blue-600">Total Items</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-700">{summary.categories.length}</div>
                <div className="text-sm text-purple-600">Categories</div>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-teal-700">
                  {summary.by_category.shirt || 0}
                </div>
                <div className="text-sm text-teal-600">Shirts</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-indigo-700">
                  {summary.by_category.trouser || 0}
                </div>
                <div className="text-sm text-indigo-600">Trousers</div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-red-800">{error}</span>
            <button onClick={clearError} className="text-red-600 hover:text-red-800">✕</button>
          </div>
        )}

        {/* Category Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Items {summary && `(${summary.total_items})`}
            </button>
            {categories.map((cat) => {
              const count = summary?.by_category?.[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                    selectedCategory === cat
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.replace('_', ' ')} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Wardrobe Items Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            <p className="mt-4 text-gray-600">Loading wardrobe...</p>
          </div>
        ) : wardrobeItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">👔</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Your wardrobe is empty</h3>
            <p className="text-gray-600 mb-6">Add items to get personalized outfit suggestions!</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-purple-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wardrobeItems.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {item.image_data && (
                  <div className="h-48 bg-gray-100 overflow-hidden">
                    <img
                      src={`data:image/jpeg;base64,${item.image_data}`}
                      alt={item.category}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 capitalize">{item.category}</h3>
                      {item.color && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Color:</span> {item.color}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-500 hover:text-red-700 text-xl"
                      title="Delete item"
                    >
                      🗑️
                    </button>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {step === 'upload' ? '📸 Upload Item Photo' : '✏️ Review & Confirm'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {step === 'upload' ? (
                  /* Step 1: Upload Image */
                  <div className="space-y-6">
                    {/* Model Selection */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        🤖 Select AI Model for Analysis
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedModel === 'blip' 
                            ? 'border-teal-500 bg-teal-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            name="model"
                            value="blip"
                            checked={selectedModel === 'blip'}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <span className="font-semibold text-gray-800 block">BLIP</span>
                            <span className="text-xs text-gray-600">More detailed descriptions</span>
                          </div>
                        </label>
                        <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedModel === 'vit-gpt2' 
                            ? 'border-teal-500 bg-teal-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            name="model"
                            value="vit-gpt2"
                            checked={selectedModel === 'vit-gpt2'}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <span className="font-semibold text-gray-800 block">ViT-GPT2</span>
                            <span className="text-xs text-gray-600">Faster analysis</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        Take or upload a photo of your clothing item. Our AI will automatically extract all the details!
                      </p>
                      
                      {imagePreview ? (
                        <div className="mb-4">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-teal-500 transition-colors"
                        >
                          <div className="text-6xl mb-4">📸</div>
                          <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
                          <p className="text-sm text-gray-500 mt-2">JPG, PNG up to 20MB</p>
                        </div>
                      )}
                      
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

                    {analyzing && (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4"></div>
                        <p className="text-gray-600 font-medium">🤖 AI is analyzing your item...</p>
                        <p className="text-sm text-gray-500 mt-2">Extracting color, style, category, and more</p>
                      </div>
                    )}

                    {imagePreview && !analyzing && (
                      <div className="space-y-4">
                        {analysisError && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800 mb-2">
                              ⚠️ <strong>AI analysis failed:</strong> {analysisError}
                            </p>
                            <p className="text-xs text-yellow-700">
                              Don't worry! You can still add the item manually.
                            </p>
                          </div>
                        )}
                        
                        {analysisComplete && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-800">
                              ✅ <strong>Analysis complete!</strong> Proceeding to review...
                            </p>
                          </div>
                        )}

                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                              setAnalysisError(null);
                              setAnalysisComplete(false);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                          >
                            Choose Different Photo
                          </button>
                          
                          {!analysisComplete && (
                            <button
                              type="button"
                              onClick={handleProceedToReview}
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-purple-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all"
                            >
                              {analysisError ? 'Continue Manually' : 'Continue to Review'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Step 2: Review & Edit Extracted Data */
                  <form onSubmit={handleAddItem} className="space-y-4">
                    {imagePreview && (
                      <div className="mb-4">
                        <img
                          src={imagePreview}
                          alt="Item preview"
                          className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                        />
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-800">
                        ✨ <strong>AI Analysis Complete!</strong> Review the extracted details below and make any adjustments before saving.
                      </p>
                      {modelUsed && (
                        <p className="text-xs text-blue-600 mt-2">
                          Model used: <strong>{modelUsed}</strong>
                        </p>
                      )}
                    </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type (Category) *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., Navy blue, Charcoal gray, Black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Style) *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      rows={4}
                      placeholder="Include fit (classic, slim, relaxed), formality (formal, casual, business casual), pattern (solid, striped, checked), and key style features..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Describe the style including fit, formality, pattern, and distinctive features
                    </p>
                  </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setStep('upload')}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                      >
                        ← Back to Upload
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-purple-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Adding...' : '✅ Save Item'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
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

