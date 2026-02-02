/**
 * Main Application Component
 * Refactored with MVC architecture
 * Uses controllers for business logic and views for presentation
 */

import React, { useState } from 'react';
import Hero from './views/components/Hero';
import Sidebar from './views/components/Sidebar';
import OutfitPreview from './views/components/OutfitPreview';
import OutfitHistory from './views/components/OutfitHistory';
import About from './views/components/About';
import Wardrobe from './views/components/Wardrobe';
import AdminReports from './views/components/AdminReports';
import Toast from './views/components/Toast';
import Footer from './views/components/Footer';
import ConfirmationModal from './views/components/ConfirmationModal';
import LoadingOverlay from './views/components/LoadingOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './views/components/Login';
import Register from './views/components/Register';
import ChangePassword from './views/components/ChangePassword';
import { useOutfitController } from './controllers/useOutfitController';
import { useHistoryController } from './controllers/useHistoryController';
import { useHistorySearchController } from './controllers/useHistorySearchController';
import { useToastController } from './controllers/useToastController';
import { useAuthController } from './controllers/useAuthController';
import { useWardrobeController } from './controllers/useWardrobeController';
import ApiService from './services/ApiService';

function App() {
  // Check URL parameter for model generation feature flag
  const modelGenerationEnabled = React.useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('modelGeneration') === 'true';
  }, []);

  // Authentication
  const { user, isAuthenticated, isLoading: authLoading, login, register, logout, error: authError, clearError } = useAuthController();
  const [showRegister, setShowRegister] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // View state (UI-only state)
  const [currentView, setCurrentView] = useState<'main' | 'history' | 'wardrobe' | 'reports' | 'about' | 'settings'>('main');
  const [wardrobeCategoryFilter, setWardrobeCategoryFilter] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showModelImageConfirm, setShowModelImageConfirm] = useState(false);
  const [modelImageConfirmed, setModelImageConfirmed] = useState(false);
  const [showAddWardrobeModal, setShowAddWardrobeModal] = useState(false);
  const [wardrobeFormData, setWardrobeFormData] = useState<{category: string; color: string; description: string} | null>(null);
  const [wardrobeImageToAdd, setWardrobeImageToAdd] = useState<File | null>(null);
  const [showWardrobeDuplicateModal, setShowWardrobeDuplicateModal] = useState(false);
  const [duplicateWardrobeItem, setDuplicateWardrobeItem] = useState<any>(null);

  // Controllers (Business Logic)
  const {
    image,
    filters,
    preferenceText,
    currentSuggestion,
    loading,
    error,
    generateModelImage,
    imageModel,
    showDuplicateModal,
    setImage,
    setFilters,
    setPreferenceText,
    setCurrentSuggestion,
    setGenerateModelImage,
    setImageModel,
    getSuggestion,
    handleUseCachedSuggestion,
    handleGetNewSuggestion,
  } = useOutfitController({
    onSuggestionSuccess: async () => {
      await fetchRecentHistory();
    }
  });

  const {
    history,
    loading: historyLoading,
    error: historyError,
    isFullView,
    refreshHistory,
    fetchRecentHistory,
    ensureFullHistory,
    deleteHistoryEntry,
  } = useHistoryController({
    userId: user?.id ?? null,
    isAuthenticated: isAuthenticated,
  });

  // History search controller
  const historySearchController = useHistorySearchController(
    history,
    ensureFullHistory,
    isFullView
  );

  const { toast, showToast, hideToast } = useToastController();

  // Wardrobe controller for auto-add functionality
  const { analyzeImage, addItem, loading: wardrobeLoading } = useWardrobeController();
  const [addingToWardrobe, setAddingToWardrobe] = useState(false);

  // Ensure model generation is disabled if feature flag is off
  React.useEffect(() => {
    if (!modelGenerationEnabled && generateModelImage) {
      setGenerateModelImage(false);
    }
  }, [modelGenerationEnabled, generateModelImage, setGenerateModelImage]);

  // Event Handlers (UI orchestration only)
  const handleGetSuggestion = async (skipModelImageConfirm: boolean = false) => {
    if (!image) {
      showToast('Please upload an image first', 'error');
      return;
    }

    // Show confirmation dialog if model image generation is enabled and not already confirmed
    if (generateModelImage && !skipModelImageConfirm && !modelImageConfirmed) {
      setShowModelImageConfirm(true);
      return;
    }

    // Reset confirmation state for next time
    if (skipModelImageConfirm) {
      setModelImageConfirmed(false);
    }

    // All business logic is now in the controller
    await getSuggestion();
  };

  const handleUseCachedSuggestionWrapper = () => {
    handleUseCachedSuggestion();
    showToast('Loaded suggestion from history! 📋', 'success');
  };

  const handleLike = () => {
    showToast('Thanks for the feedback! 👍', 'success');
  };

  const handleDislike = async () => {
    showToast("We'll improve our suggestions! 👎", 'success');
    await handleGetSuggestion(); // Get a new suggestion
  };

  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      await login(credentials);
      showToast('Welcome back! 👋', 'success');
    } catch (err) {
      // Error is handled by auth controller
    }
  };

  const handleRegister = async (data: { email: string; password: string; full_name?: string }) => {
    try {
      await register(data);
      // Auto-login happens in the controller
      showToast('Registration successful! Welcome! 👋', 'success');
    } catch (err) {
      // Error is handled by auth controller
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'success');
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow anonymous access - show login/register as optional modal, not required

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{ pointerEvents: loading ? 'none' : 'auto' }}
    >
      {/* Hero Section */}
      <Hero />

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentView('main')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  currentView === 'main'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎨 Get Suggestion
              </button>
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => setCurrentView('history')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      currentView === 'history'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📋 Outfit History
                  </button>
                  <button
                    onClick={() => setCurrentView('wardrobe')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      currentView === 'wardrobe'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    👔 Wardrobe
                  </button>
                  {user?.is_admin && (
                    <button
                      onClick={() => setCurrentView('reports')}
                      className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                        currentView === 'reports'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      📊 Reports
                    </button>
                  )}
                  <button
                    onClick={() => setCurrentView('settings')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      currentView === 'settings'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    ⚙️ Settings
                  </button>
                </>
              )}
              <button
                onClick={() => setCurrentView('about')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  currentView === 'about'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ℹ️ About
              </button>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600">
                    {user?.full_name || user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowRegister(true)}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => {
                      setShowRegister(false);
                      setShowLoginModal(true);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="container mx-auto px-4 py-8"
        style={{ pointerEvents: loading ? 'none' : 'auto' }}
      >
        {currentView === 'main' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Sidebar */}
            <div className="lg:col-span-3">
              <Sidebar
                filters={filters}
                setFilters={setFilters}
                preferenceText={preferenceText}
                setPreferenceText={setPreferenceText}
                image={image}
                setImage={setImage}
                onGetSuggestion={handleGetSuggestion}
                loading={loading}
                generateModelImage={generateModelImage}
                setGenerateModelImage={setGenerateModelImage}
                imageModel={imageModel}
                setImageModel={setImageModel}
                modelGenerationEnabled={modelGenerationEnabled}
                isAuthenticated={isAuthenticated}
                onAddToWardrobe={async () => {
                  if (!image) {
                    showToast('Please upload an image first to add it to your wardrobe', 'error');
                    return;
                  }

                  if (addingToWardrobe || wardrobeLoading) {
                    return; // Prevent multiple clicks
                  }

                  setAddingToWardrobe(true);
                  try {
                    console.log('🔍 Checking for duplicate...');
                    
                    // Check for duplicate FIRST before AI analysis
                    const duplicateCheck = await ApiService.checkWardrobeDuplicate(image);
                    
                    if (duplicateCheck.is_duplicate && duplicateCheck.existing_item) {
                      // Show duplicate notification immediately
                      setDuplicateWardrobeItem(duplicateCheck.existing_item);
                      setWardrobeImageToAdd(image);
                      setShowWardrobeDuplicateModal(true);
                      setAddingToWardrobe(false);
                      return;
                    }
                    
                    console.log('✅ No duplicate found, proceeding with AI analysis...');
                    
                    // No duplicate found, proceed with AI analysis
                    console.log('📸 Analyzing image with AI...');
                    const properties = await analyzeImage(image, 'blip');
                    console.log('✅ Analysis complete:', properties);
                    
                    // Show form modal with extracted data for user to review/edit
                    setWardrobeFormData({
                      category: properties.category || 'shirt',
                      color: properties.color || '',
                      description: properties.description || '',
                    });
                    setWardrobeImageToAdd(image);
                    setShowAddWardrobeModal(true);
                  } catch (err) {
                    console.error('❌ Error:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
                    showToast(errorMessage, 'error');
                  } finally {
                    setAddingToWardrobe(false);
                  }
                }}
                addingToWardrobe={addingToWardrobe}
              />
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-9">
              <OutfitPreview
                suggestion={currentSuggestion}
                loading={loading}
                error={error}
                onLike={handleLike}
                onDislike={handleDislike}
                onNext={handleGetSuggestion}
                onNavigateToWardrobe={(category?: string) => {
                  setWardrobeCategoryFilter(category || null);
                  setCurrentView('wardrobe');
                }}
                isAuthenticated={isAuthenticated}
                onAddToWardrobe={async () => {
                  if (!image) {
                    showToast('No image to add. Please upload an image first.', 'error');
                    return;
                  }

                  setAddingToWardrobe(true);
                  try {
                    console.log('🔍 Checking for duplicate...');
                    
                    // Check for duplicate FIRST before AI analysis
                    const duplicateCheck = await ApiService.checkWardrobeDuplicate(image);
                    
                    if (duplicateCheck.is_duplicate && duplicateCheck.existing_item) {
                      // Show duplicate notification immediately
                      setDuplicateWardrobeItem(duplicateCheck.existing_item);
                      setWardrobeImageToAdd(image);
                      setShowWardrobeDuplicateModal(true);
                      setAddingToWardrobe(false);
                      return;
                    }
                    
                    console.log('✅ No duplicate found, proceeding with AI analysis...');
                    
                    // No duplicate found, proceed with AI analysis
                    const properties = await analyzeImage(image, 'blip');
                    
                    // Show form modal with extracted data for user to review/edit
                    setWardrobeFormData({
                      category: properties.category || 'shirt',
                      color: properties.color || '',
                      description: properties.description || '',
                    });
                    setWardrobeImageToAdd(image);
                    setShowAddWardrobeModal(true);
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
                    showToast(errorMessage, 'error');
                    console.error('Failed to process image:', err);
                  } finally {
                    setAddingToWardrobe(false);
                  }
                }}
              />
            </div>
          </div>
        )}

        {currentView === 'wardrobe' && (
          isAuthenticated ? (
            <ErrorBoundary label="Wardrobe" resetKey={currentView}>
              <Wardrobe 
                initialCategory={wardrobeCategoryFilter}
                onSuggestionReady={(suggestion) => {
                  // Suggestion is already set by the outfit controller's getSuggestion
                  setCurrentSuggestion(suggestion);
                }}
                onNavigateToMain={() => {
                  setCurrentView('main');
                }}
                outfitController={{
                  setImage,
                  getSuggestion,
                  loading,
                  error,
                  showDuplicateModal,
                  handleUseCachedSuggestion
                }}
              />
            </ErrorBoundary>
          ) : (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">👔 Wardrobe Management</h2>
              <p className="text-gray-600 mb-6">
                Please log in to manage your wardrobe and get personalized outfit suggestions based on your existing clothes.
              </p>
              <button
                onClick={() => {
                  setShowRegister(false);
                  setShowLoginModal(true);
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Login to Continue
              </button>
            </div>
          )
        )}

        {currentView === 'reports' && (
          isAuthenticated && user && user.is_admin ? (
            <ErrorBoundary label="Reports" resetKey={currentView}>
              <AdminReports user={user} />
            </ErrorBoundary>
          ) : (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Reports</h2>
              <p className="text-gray-600 mb-6">Admin privileges are required to view reports.</p>
            </div>
          )
        )}

        {currentView === 'history' && (
          isAuthenticated ? (
            <OutfitHistory
              history={history}
              loading={historyLoading}
              error={historyError}
              isFullView={isFullView}
              onRefresh={refreshHistory}
              onEnsureFullHistory={ensureFullHistory}
              onDelete={deleteHistoryEntry}
              searchController={historySearchController}
            />
          ) : (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Outfit History</h2>
              <p className="text-gray-600 mb-6">Please log in to view your outfit history.</p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Login
              </button>
            </div>
          )
        )}

        {currentView === 'about' && <About />}

        {currentView === 'settings' && (
          isAuthenticated ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">User Information</h3>
                  <p className="text-gray-600">
                    <strong>Email:</strong> {user?.email}
                  </p>
                  {user?.full_name && (
                    <p className="text-gray-600">
                      <strong>Name:</strong> {user.full_name}
                    </p>
                  )}
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Change Password</h3>
                  {showChangePassword ? (
                    <ChangePassword
                      onSuccess={() => {
                        setShowChangePassword(false);
                        showToast('Password changed successfully! ✅', 'success');
                      }}
                      onCancel={() => setShowChangePassword(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Change Password
                    </button>
                  )}
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Wardrobe Management</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage your wardrobe items to get personalized outfit suggestions based on what you own.
                  </p>
                  <button
                    onClick={() => setCurrentView('wardrobe')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    👔 Manage Wardrobe
                  </button>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
              <p className="text-gray-600 mb-6">Please log in to access your account settings.</p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Login
              </button>
            </div>
          )
        )}
      </div>

      {/* Login/Register Modal - Only show when explicitly requested */}
      {(showRegister || showLoginModal) && !isAuthenticated && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
            onClick={() => {
              setShowRegister(false);
              setShowLoginModal(false);
            }}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
              <button
                onClick={() => {
                  setShowRegister(false);
                  setShowLoginModal(false);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                ✕
              </button>
              {showRegister ? (
                <Register
                  onRegister={async (data) => {
                    await handleRegister(data);
                    setShowRegister(false);
                  }}
                  onSwitchToLogin={() => {
                    setShowRegister(false);
                    setShowLoginModal(true);
                    clearError();
                  }}
                  loading={authLoading}
                  error={authError}
                />
              ) : (
                <Login
                  onLogin={async (credentials) => {
                    await handleLogin(credentials);
                    setShowLoginModal(false);
                  }}
                  onSwitchToRegister={() => {
                    setShowLoginModal(false);
                    setShowRegister(true);
                    clearError();
                  }}
                  loading={authLoading}
                  error={authError}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* Duplicate Image Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDuplicateModal}
        title="Similar Image Found!"
        message="We found an existing outfit suggestion for this image in your history. Would you like to use the existing suggestion or get a new one from AI?"
        confirmText="Use Existing"
        cancelText="Get New"
        onConfirm={handleUseCachedSuggestionWrapper}
        onCancel={handleGetNewSuggestion}
      />

      {/* Model Image Generation Confirmation Modal */}
      <ConfirmationModal
        isOpen={showModelImageConfirm}
        title="Generate Model Image?"
        message="Would you like to create an AI-generated image of a model wearing your recommended outfit? The uploaded clothing item will be preserved exactly as shown in your photo. This may take a few extra seconds."
        confirmText="Yes, Generate"
        cancelText="Skip for Now"
        onConfirm={async () => {
          setShowModelImageConfirm(false);
          setModelImageConfirmed(true);
          await handleGetSuggestion(true);
        }}
        onCancel={async () => {
          setShowModelImageConfirm(false);
          setGenerateModelImage(false);
          setModelImageConfirmed(false);
          await handleGetSuggestion(true);
        }}
      />

      {/* Add to Wardrobe Modal with Editable Form */}
      {showAddWardrobeModal && wardrobeFormData && wardrobeImageToAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">✏️ Review & Add to Wardrobe</h2>
                <button
                  onClick={() => {
                    setShowAddWardrobeModal(false);
                    setWardrobeFormData(null);
                    setWardrobeImageToAdd(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!wardrobeFormData || !wardrobeImageToAdd) return;

                try {
                  setAddingToWardrobe(true);
                  
                  // No need to check duplicate again - already checked before AI analysis
                  // Proceed directly with adding
                  await addItem(wardrobeFormData, wardrobeImageToAdd);
                  showToast('Item added to wardrobe! ✅', 'success');
                  setShowAddWardrobeModal(false);
                  setWardrobeFormData(null);
                  setWardrobeImageToAdd(null);
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : 'Failed to add item to wardrobe';
                  showToast(errorMessage, 'error');
                  console.error('Failed to add item to wardrobe:', err);
                } finally {
                  setAddingToWardrobe(false);
                }
              }} className="space-y-4">
                {/* Image Preview */}
                <div className="mb-4">
                  <img
                    src={URL.createObjectURL(wardrobeImageToAdd)}
                    alt="Item preview"
                    className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={wardrobeFormData.category}
                    onChange={(e) => setWardrobeFormData({ ...wardrobeFormData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="shirt">Shirt</option>
                    <option value="trouser">Trouser</option>
                    <option value="blazer">Blazer</option>
                    <option value="shoes">Shoes</option>
                    <option value="belt">Belt</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={wardrobeFormData.color}
                    onChange={(e) => setWardrobeFormData({ ...wardrobeFormData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Navy blue, Black"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={wardrobeFormData.description}
                    onChange={(e) => setWardrobeFormData({ ...wardrobeFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    placeholder="e.g., Classic fit, casual style"
                    required
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    ✨ <strong>AI Analysis Complete!</strong> Review and edit the extracted details above before saving.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddWardrobeModal(false);
                      setWardrobeFormData(null);
                      setWardrobeImageToAdd(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingToWardrobe || wardrobeLoading}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {addingToWardrobe || wardrobeLoading ? 'Adding...' : '✅ Save to Wardrobe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Wardrobe Item Modal */}
      <ConfirmationModal
        isOpen={showWardrobeDuplicateModal}
        title="Similar Item Found! ⚠️"
        message={
          duplicateWardrobeItem ? (
            <div className="space-y-4">
              <p>We found a similar item already in your wardrobe:</p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                {duplicateWardrobeItem.image_data && (
                  <img
                    src={`data:image/jpeg;base64,${duplicateWardrobeItem.image_data}`}
                    alt="Existing item"
                    className="w-full max-h-32 object-contain mb-3 rounded"
                  />
                )}
                <p className="font-semibold text-gray-800 capitalize">{duplicateWardrobeItem.category}</p>
                {duplicateWardrobeItem.color && (
                  <p className="text-sm text-gray-600">Color: {duplicateWardrobeItem.color}</p>
                )}
                {duplicateWardrobeItem.description && (
                  <p className="text-sm text-gray-600 mt-1">{duplicateWardrobeItem.description}</p>
                )}
              </div>
              <p className="text-sm text-gray-600">Do you still want to add this item anyway?</p>
            </div>
          ) : (
            "A similar item already exists in your wardrobe. Do you still want to add it?"
          )
        }
        confirmText="Yes, Add Anyway"
        cancelText="Cancel"
        onConfirm={async () => {
          setShowWardrobeDuplicateModal(false);
          if (!wardrobeFormData || !wardrobeImageToAdd) return;
          
          try {
            setAddingToWardrobe(true);
            await addItem(wardrobeFormData, wardrobeImageToAdd);
            showToast('Item added to wardrobe! ✅', 'success');
            setShowAddWardrobeModal(false);
            setWardrobeFormData(null);
            setWardrobeImageToAdd(null);
            setDuplicateWardrobeItem(null);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add item to wardrobe';
            showToast(errorMessage, 'error');
            console.error('Failed to add item to wardrobe:', err);
          } finally {
            setAddingToWardrobe(false);
          }
        }}
        onCancel={() => {
          setShowWardrobeDuplicateModal(false);
          setDuplicateWardrobeItem(null);
        }}
      />

      {/* Loading Overlay - Disables entire app when generating suggestion */}
      <LoadingOverlay isLoading={loading} />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
