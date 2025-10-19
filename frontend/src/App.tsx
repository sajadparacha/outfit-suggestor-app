import React, { useState } from 'react';
import ImageUpload from './components/ImageUpload';
import OutfitSuggestionComponent from './components/OutfitSuggestion';
import LoadingSpinner from './components/LoadingSpinner';

interface OutfitSuggestion {
  shirt: string;
  trouser: string;
  blazer: string;
  shoes: string;
  belt: string;
  reasoning: string;
}

function App() {
  const [image, setImage] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!image) {
      setError('Please upload an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('text_input', textInput);

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/suggest-outfit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get outfit suggestion');
      }

      const data = await response.json();
      setSuggestion(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              AI Outfit Suggestor
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload a photo of your shirt or blazer and get personalized outfit suggestions powered by AI
            </p>
          </header>

          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
            <ImageUpload 
              image={image} 
              setImage={setImage}
              textInput={textInput}
              setTextInput={setTextInput}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </div>

          {loading && <LoadingSpinner />}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {suggestion && <OutfitSuggestionComponent suggestion={suggestion} />}
        </div>
      </div>
    </div>
  );
}

export default App;
