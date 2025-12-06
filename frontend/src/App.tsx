/**
 * Main Application Component
 * Refactored with MVC architecture
 * Uses controllers for business logic and views for presentation
 */

import React, { useState, useEffect } from 'react';
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
import ActivateAccount from './views/components/ActivateAccount';
import { useOutfitController } from './controllers/useOutfitController';
import { useHistoryController } from './controllers/useHistoryController';
import { useToastController } from './controllers/useToastController';
import { useAuthController } from './controllers/useAuthController';
import ApiService from './services/ApiService';
import { OutfitSuggestion } from './models/OutfitModels';
import { compressImage } from './utils/imageUtils';

function App() {
  // Authentication
  const { user, isAuthenticated, isLoading: authLoading, login, register, logout, error: authError, clearError } = useAuthController();
  const [showRegister, setShowRegister] = useState(false);
  
  // Check for activation token in URL
  const [activationToken, setActivationToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Check URL for activation token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setActivationToken(token);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // View state
  const [currentView, setCurrentView] = useState<'main' | 'history' | 'about'>('main');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingSuggestion, setExistingSuggestion] = useState<OutfitSuggestion | null>(null);

  // Controllers (Business Logic)
  const {
    image,
    filters,
    preferenceText,
    currentSuggestion,
    loading,
    error,
    setImage,
    setFilters,
    setPreferenceText,
    getSuggestion,
    setCurrentSuggestion,
  } = useOutfitController();

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

  const { toast, showToast, hideToast } = useToastController();

  // Event Handlers
  const handleGetSuggestion = async () => {
    if (!image) {
      showToast('Please upload an image first', 'error');
      return;
    }

    try {
      // Compress image before sending to reduce size
      const compressedImage = await compressImage(image);
      
      // Check for duplicate image
      const duplicateCheck = await ApiService.checkDuplicate(compressedImage);
      
      if (duplicateCheck.is_duplicate && duplicateCheck.existing_suggestion) {
        // Found duplicate - show confirmation modal
        const suggestion: OutfitSuggestion = {
          ...duplicateCheck.existing_suggestion,
          id: Date.now().toString(),
          imageUrl: URL.createObjectURL(image),
        };
        setExistingSuggestion(suggestion);
        setShowDuplicateModal(true);
      } else {
        // No duplicate - proceed with AI call
        // Temporarily set compressed image for API call
        const originalImage = image;
        setImage(compressedImage);
        await getSuggestion();
        setImage(originalImage); // Restore original for display
        await fetchRecentHistory();
      }
    } catch (err) {
      // If duplicate check fails, proceed with AI call anyway
      console.error('Duplicate check failed:', err);
      try {
        const compressedImage = await compressImage(image);
        const originalImage = image;
        setImage(compressedImage);
        await getSuggestion();
        setImage(originalImage);
        await fetchRecentHistory();
      } catch (compressErr) {
        console.error('Image compression failed:', compressErr);
        showToast('Failed to process image. Please try a smaller image.', 'error');
      }
    }
  };

  const handleUseCachedSuggestion = () => {
    // User chose to use existing suggestion
    if (existingSuggestion) {
      setCurrentSuggestion(existingSuggestion);
      showToast('Loaded suggestion from history! 📋', 'success');
    }
    setShowDuplicateModal(false);
    setExistingSuggestion(null);
  };

  const handleGetNewSuggestion = async () => {
    // User chose to get new AI suggestion
    setShowDuplicateModal(false);
    setExistingSuggestion(null);
    
    if (!image) {
      showToast('Please upload an image first', 'error');
      return;
    }
    
    try {
      // Compress image before sending
      const compressedImage = await compressImage(image);
      const originalImage = image;
      setImage(compressedImage);
      await getSuggestion();
      setImage(originalImage); // Restore original for display
      await fetchRecentHistory();
    } catch (err) {
      console.error('Failed to get new suggestion:', err);
      showToast('Failed to process image. Please try again.', 'error');
    }
  };

  const handleLike = () => {
    showToast('Thanks for the feedback! 👍', 'success');
  };

  const handleDislike = async () => {
    showToast("We'll improve our suggestions! 👎", 'success');
    await handleGetSuggestion(); // Get a new suggestion and refresh history
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
      // Show activation message instead of auto-login
      showToast('Registration successful! Please check your email to activate your account. 📧', 'success');
      // Switch to login after showing message
      setTimeout(() => {
        setShowRegister(false);
      }, 2000);
    } catch (err) {
      // Error is handled by auth controller
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'success');
  };

  const handleActivateComplete = () => {
    setActivationToken(null);
    showToast('Account activated! You can now log in. ✅', 'success');
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

  // Show activation page if activation token is present
  if (activationToken) {
    return (
      <>
        <ActivateAccount 
          token={activationToken} 
          onActivateComplete={handleActivateComplete}
        />
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </>
    );
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        {showRegister ? (
          <Register
            onRegister={handleRegister}
            onSwitchToLogin={() => {
              setShowRegister(false);
              clearError();
            }}
            loading={authLoading}
            error={authError}
          />
        ) : (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => {
              setShowRegister(true);
              clearError();
            }}
            loading={authLoading}
            error={authError}
          />
        )}
      </>
    );
  }

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
              <span className="text-sm text-gray-600">
                {user?.full_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
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
          <OutfitHistory
            history={history}
            loading={historyLoading}
            error={historyError}
            isFullView={isFullView}
            onRefresh={refreshHistory}
            onEnsureFullHistory={ensureFullHistory}
          />
        )}

        {currentView === 'about' && <About />}
      </div>

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
        onConfirm={handleUseCachedSuggestion}
        onCancel={handleGetNewSuggestion}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
