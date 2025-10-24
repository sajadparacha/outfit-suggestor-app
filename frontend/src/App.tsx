/**
 * Main Application Component
 * Refactored with MVC architecture
 * Uses controllers for business logic and views for presentation
 */

import React from 'react';
import Hero from './views/components/Hero';
import Sidebar from './views/components/Sidebar';
import OutfitPreview from './views/components/OutfitPreview';
import Toast from './views/components/Toast';
import Footer from './views/components/Footer';
import { useOutfitController } from './controllers/useOutfitController';
import { useToastController } from './controllers/useToastController';

function App() {
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
  } = useOutfitController();

  const { toast, showToast, hideToast } = useToastController();

  // Event Handlers
  const handleLike = () => {
    showToast('Thanks for the feedback! 👍', 'success');
  };

  const handleDislike = () => {
    showToast("We'll improve our suggestions! 👎", 'success');
    getSuggestion(); // Get a new suggestion
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <Hero />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
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
              onGetSuggestion={getSuggestion}
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
              onNext={getSuggestion}
            />
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
