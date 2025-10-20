import React, { useState } from 'react';
import Hero from './components/Hero';
import Sidebar from './components/Sidebar';
import OutfitPreview from './components/OutfitPreview';
import Toast from './components/Toast';
import Footer from './components/Footer';

interface OutfitSuggestion {
  id: string;
  shirt: string;
  trouser: string;
  blazer: string;
  shoes: string;
  belt: string;
  reasoning: string;
  imageUrl?: string;
  raw?: unknown;
  meta?: { usedPrompt: string };
}

interface Filters {
  occasion: string;
  season: string;
  style: string;
}

function App() {
  const [image, setImage] = useState<File | null>(null);
  const [filters, setFilters] = useState<Filters>({
    occasion: 'casual',
    season: 'all',
    style: 'modern'
  });
  const [preferenceText, setPreferenceText] = useState<string>('');
  const [currentSuggestion, setCurrentSuggestion] = useState<OutfitSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleGetSuggestion = async () => {
    if (!image) {
      setError('Please upload an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', image);
      // Prefer free-text if provided, otherwise fall back to structured filters
      const trimmed = preferenceText.trim();
      const prompt = trimmed.length > 0
        ? `User preferences (free-text): ${trimmed}`
        : `Occasion: ${filters.occasion}, Season: ${filters.season}, Style: ${filters.style}`;
      formData.append('text_input', prompt);

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/suggest-outfit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get outfit suggestion');
      }

      const data = await response.json();
      setCurrentSuggestion({
        ...data,
        id: Date.now().toString(),
        imageUrl: image ? URL.createObjectURL(image) : undefined,
        raw: data,
        meta: { usedPrompt: prompt }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    showToast('Thanks for the feedback! 👍', 'success');
  };

  const handleDislike = () => {
    showToast('We\'ll improve our suggestions! 👎', 'success');
    handleGetSuggestion(); // Get a new suggestion
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
