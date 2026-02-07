import React from 'react';
import { OutfitSuggestion } from '../../models/OutfitModels';

interface OutfitPreviewProps {
  suggestion: OutfitSuggestion | null;
  loading: boolean;
  error: string | null;
  onLike: () => void;
  onDislike: () => void;
  onNext: () => void;
  onNavigateToWardrobe?: (category?: string) => void; // Optional callback to navigate to wardrobe
  isAuthenticated?: boolean; // Whether user is logged in
  onAddToWardrobe?: () => void; // Callback to add uploaded item to wardrobe
}

const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  suggestion,
  loading,
  error,
  onLike,
  onDislike,
  onNext,
  onNavigateToWardrobe,
  isAuthenticated = false,
  onAddToWardrobe
}) => {
  // Hook must be first
  const [showDetails, setShowDetails] = React.useState(false);
  const [showFullImage, setShowFullImage] = React.useState(false);

  // Format cost for display
  const formatCost = (cost: number): string => {
    if (cost < 0.01) {
      return `$${cost.toFixed(4)}`;
    } else if (cost < 0.10) {
      return `$${cost.toFixed(3)}`;
    } else {
      return `$${cost.toFixed(2)}`;
    }
  };

  // Debug: Log suggestion data
  React.useEffect(() => {
    if (suggestion) {
      console.log('OutfitPreview - Suggestion data:', {
        hasModelImage: !!suggestion.model_image,
        modelImageLength: suggestion.model_image?.length || 0,
        hasImageUrl: !!suggestion.imageUrl,
        cost: suggestion.cost,
        modelImagePreview: suggestion.model_image ? suggestion.model_image.substring(0, 50) + '...' : null
      });
    }
  }, [suggestion]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Skeleton Loader */}
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-200 h-96 rounded-xl"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <div className="inline-flex items-center text-teal-600">
            <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-lg font-medium">AI is creating your perfect outfit...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Oops! Something went wrong</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onNext}
            className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12">
        <div className="text-center">
          <div className="text-8xl mb-6">👔</div>
          <h3 className="text-2xl font-semibold text-gray-800 mb-3">Ready for Style Magic?</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Upload a photo of your clothing and let our AI create the perfect outfit combination for you!
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <span>👈</span>
            <span>Start by uploading a photo on the left</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl">
      {/* Side by Side: Uploaded Image and Generated Model Image */}
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200">
        {suggestion.model_image && suggestion.imageUrl ? (
          // Show both images side by side
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* Uploaded Image - Left Side */}
            <div className="relative bg-white rounded-lg overflow-hidden shadow-md">
              <div className="absolute top-2 left-2 bg-teal-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg z-10">
                📤 Your Upload
              </div>
              <img
                src={suggestion.imageUrl}
                alt="Uploaded clothing item"
                className="w-full h-auto max-h-[600px] object-contain"
              />
            </div>
            
            {/* Generated Model Image - Right Side */}
            <div className="relative bg-white rounded-lg overflow-hidden shadow-md">
              <div className="absolute top-2 left-2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg z-10">
                🤖 AI Model
              </div>
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
                🔍 Click to expand
              </div>
              <img
                src={`data:image/png;base64,${suggestion.model_image}`}
                alt="AI generated model wearing recommended outfit"
                className="w-full h-auto max-h-[600px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowFullImage(true)}
                onError={(e) => {
                  console.error('Error loading model image:', e);
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('image/png')) {
                    target.src = `data:image/jpeg;base64,${suggestion.model_image}`;
                  }
                }}
                onLoad={() => {
                  console.log('✅ Model image loaded successfully');
                }}
              />
            </div>
          </div>
        ) : suggestion.model_image ? (
          // Only model image available
          <div className="relative min-h-[400px] bg-white flex items-center justify-center">
            <img
              src={`data:image/png;base64,${suggestion.model_image}`}
              alt="AI generated model wearing recommended outfit"
              className="w-full h-auto max-h-[600px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowFullImage(true)}
              onError={(e) => {
                console.error('Error loading model image:', e);
                const target = e.target as HTMLImageElement;
                if (target.src.includes('image/png')) {
                  target.src = `data:image/jpeg;base64,${suggestion.model_image}`;
                }
              }}
              onLoad={() => {
                console.log('✅ Model image loaded successfully');
              }}
            />
            <div className="absolute top-4 right-4 bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg z-10">
              🤖 AI Model
            </div>
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium z-10">
              🔍 Click to expand
            </div>
          </div>
        ) : suggestion.imageUrl ? (
          // Only uploaded image available
          <div className="relative">
            <img
              src={suggestion.imageUrl}
              alt="Uploaded clothing item"
              className="w-full h-96 object-contain"
            />
            <div className="absolute top-4 right-4 bg-teal-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              📤 Your Upload
            </div>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center">
            <div className="text-6xl">👔</div>
          </div>
        )}
      </div>

      {/* Outfit Details */}
      <div className="p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Perfect Outfit</h2>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-teal-50 rounded-lg p-4">
            <div className="text-sm font-medium text-teal-700 mb-1">👕 Shirt</div>
            <p className="text-gray-800">{suggestion.shirt}</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-700 mb-1">👖 Trousers</div>
            <p className="text-gray-800">{suggestion.trouser}</p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-700 mb-1">🧥 Blazer</div>
            <p className="text-gray-800">{suggestion.blazer}</p>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="text-sm font-medium text-amber-700 mb-1">👞 Shoes</div>
            <p className="text-gray-800">{suggestion.shoes}</p>
          </div>
          
          <div className="bg-rose-50 rounded-lg p-4 md:col-span-2">
            <div className="text-sm font-medium text-rose-700 mb-1">🎀 Belt</div>
            <p className="text-gray-800">{suggestion.belt}</p>
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-gradient-to-r from-teal-50 to-purple-50 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-2">Why This Works</h3>
              <p className="text-gray-700 leading-relaxed">{suggestion.reasoning}</p>
            </div>
          </div>
        </div>

        {/* Cost Display */}
        {suggestion.cost && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">💰 AI Suggestion Cost</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>GPT-4 Vision: {formatCost(suggestion.cost.gpt4_cost)}</div>
                  {suggestion.cost.model_image_cost !== undefined && suggestion.cost.model_image_cost > 0 && (
                    <div>Model Image ({suggestion.model_image?.length ? 'DALL-E 3' : 'Other'}): {formatCost(suggestion.cost.model_image_cost)}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900">
                  {formatCost(suggestion.cost.total_cost)}
                </div>
                <div className="text-xs text-blue-600">Total</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <button
            onClick={onNext}
            className="px-4 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-all transform hover:scale-105 shadow-md"
            aria-label="Get next suggestion"
          >
            🔄 Next
          </button>
          
          <button
            onClick={onLike}
            className="px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all transform hover:scale-105 shadow-md"
            aria-label="Like this outfit"
          >
            👍 Like
          </button>
          
          <button
            onClick={onDislike}
            className="px-4 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all transform hover:scale-105 shadow-md"
            aria-label="Dislike this outfit"
          >
            👎 Dislike
          </button>
        </div>

        {/* Add to Wardrobe Button - Only show if authenticated */}
        {isAuthenticated && onAddToWardrobe && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAddToWardrobe}
              className="px-6 py-3 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-all transform hover:scale-105 shadow-md flex items-center gap-2"
              aria-label="Add new item to your wardrobe"
            >
              <span>👔</span>
              <span>Add to Wardrobe</span>
            </button>
            <p className="text-sm text-gray-500 text-center">
              If you want to add a new item to your wardrobe, press this button.
            </p>
          </div>
        )}
      </div>

      {/* Modal: AI Details */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">AI Recommendation Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                aria-label="Close details"
                className="p-2 rounded hover:bg-gray-100"
              >
                ✖
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
              <>
                {suggestion.meta?.usedPrompt && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Prompt Sent</div>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">{suggestion.meta.usedPrompt}</pre>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Parsed Recommendation</div>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">{JSON.stringify({
                    shirt: suggestion.shirt,
                    trouser: suggestion.trouser,
                    blazer: suggestion.blazer,
                    shoes: suggestion.shoes,
                    belt: suggestion.belt,
                    reasoning: suggestion.reasoning
                  }, null, 2)}</pre>
                </div>
                {suggestion.raw && (
                  <details className="bg-gray-50 rounded-lg p-3">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">Raw AI Response JSON</summary>
                    <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(suggestion.raw, null, 2)}</pre>
                  </details>
                )}
              </>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Image View */}
      {showFullImage && suggestion.model_image && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer" 
          role="dialog" 
          aria-modal="true"
          onClick={() => setShowFullImage(false)}
        >
          <button
            onClick={() => setShowFullImage(false)}
            aria-label="Close full image"
            className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white text-xl transition-colors z-10"
          >
            ✕
          </button>
          <img
            src={`data:image/png;base64,${suggestion.model_image}`}
            alt="AI generated model wearing recommended outfit - Full view"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('image/png')) {
                target.src = `data:image/jpeg;base64,${suggestion.model_image}`;
              }
            }}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            Click anywhere to close
          </div>
        </div>
      )}
    </div>
  );
};

export default OutfitPreview;

