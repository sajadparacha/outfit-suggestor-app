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
import { useOutfitController } from './controllers/useOutfitController';
import { useHistoryController } from './controllers/useHistoryController';
import { useToastController } from './controllers/useToastController';
import ApiService from './services/ApiService';
import { OutfitSuggestion } from './models/OutfitModels';

function App() {
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
  } = useHistoryController();

  const { toast, showToast, hideToast } = useToastController();

  // Event Handlers
  const handleGetSuggestion = async () => {
    if (!image) {
      showToast('Please upload an image first', 'error');
      return;
    }

    try {
      // Check for duplicate image
      const duplicateCheck = await ApiService.checkDuplicate(image);
      
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
        await getSuggestion();
        await fetchRecentHistory();
      }
    } catch (err) {
      // If duplicate check fails, proceed with AI call anyway
      console.error('Duplicate check failed:', err);
      await getSuggestion();
      await fetchRecentHistory();
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
    await getSuggestion();
    await fetchRecentHistory();
  };

  const handleLike = () => {
    showToast('Thanks for the feedback! 👍', 'success');
  };

  const handleDislike = async () => {
    showToast("We'll improve our suggestions! 👎", 'success');
    await handleGetSuggestion(); // Get a new suggestion and refresh history
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <Hero />

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
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
