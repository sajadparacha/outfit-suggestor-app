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
import Toast from './views/components/Toast';
import Footer from './views/components/Footer';
import ConfirmationModal from './views/components/ConfirmationModal';
import Login from './views/components/Login';
import Register from './views/components/Register';
import ChangePassword from './views/components/ChangePassword';
import { useOutfitController } from './controllers/useOutfitController';
import { useHistoryController } from './controllers/useHistoryController';
import { useHistorySearchController } from './controllers/useHistorySearchController';
import { useToastController } from './controllers/useToastController';
import { useAuthController } from './controllers/useAuthController';

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
  const [currentView, setCurrentView] = useState<'main' | 'history' | 'about' | 'settings'>('main');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showModelImageConfirm, setShowModelImageConfirm] = useState(false);
  const [modelImageConfirmed, setModelImageConfirmed] = useState(false);

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
    <div className="min-h-screen bg-gray-50">
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
                    📋 History
                  </button>
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
      <div className="container mx-auto px-4 py-8">
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
              />
            </div>
          </div>
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
              searchController={historySearchController}
            />
          ) : (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">History</h2>
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

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
