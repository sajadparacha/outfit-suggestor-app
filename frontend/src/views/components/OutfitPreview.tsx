import React from 'react';
import { OutfitSuggestion, MatchingWardrobeItem } from '../../models/OutfitModels';

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
  hasImage?: boolean; // Whether an image was uploaded for this suggestion
  showAiPromptResponse?: boolean;
  isAdmin?: boolean;
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
  onAddToWardrobe,
  hasImage = false,
  showAiPromptResponse = true,
  isAdmin = false
}) => {
  // Hook must be first
  const [showDetails, setShowDetails] = React.useState(false);
  const [showFullImage, setShowFullImage] = React.useState(false);
  const [fullWardrobeImage, setFullWardrobeImage] = React.useState<{ src: string; label: string } | null>(null);

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

  const rawWithPrompt = suggestion?.raw as { ai_prompt?: string } | undefined;
  const aiPrompt =
    suggestion?.ai_prompt ||
    rawWithPrompt?.ai_prompt ||
    suggestion?.meta?.usedPrompt ||
    'Prompt details are not available for this suggestion.';
  const aiResponse = suggestion?.ai_raw_response
    ? suggestion.ai_raw_response
    : suggestion?.raw
      ? JSON.stringify(suggestion.raw, null, 2)
      : JSON.stringify(
          {
            shirt: suggestion?.shirt ?? '',
            trouser: suggestion?.trouser ?? '',
            blazer: suggestion?.blazer ?? '',
            shoes: suggestion?.shoes ?? '',
            belt: suggestion?.belt ?? '',
            reasoning: suggestion?.reasoning ?? '',
          },
          null,
          2
        );

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

  // Warn when AI-selected wardrobe IDs are not present in matched items for a category.
  React.useEffect(() => {
    if (!suggestion) return;

    const selectedIdsByCategory: Partial<Record<'shirt' | 'trouser' | 'blazer' | 'shoes' | 'belt', number | null | undefined>> = {
      shirt: suggestion.shirt_id,
      trouser: suggestion.trouser_id,
      blazer: suggestion.blazer_id,
      shoes: suggestion.shoes_id,
      belt: suggestion.belt_id,
    };

    (Object.keys(selectedIdsByCategory) as Array<keyof typeof selectedIdsByCategory>).forEach((category) => {
      const selectedId = selectedIdsByCategory[category];
      if (!selectedId) return;
      const categoryMatches = suggestion.matching_wardrobe_items?.[category] || [];
      const exists = categoryMatches.some((item) => item.id === selectedId);
      if (!exists) {
        console.warn(
          `[OutfitPreview] AI-selected wardrobe ID not found in matched items`,
          {
            category,
            selectedId,
            matchedItemIds: categoryMatches.map((item) => item.id),
          }
        );
      }
    });
  }, [suggestion]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-4 sm:p-6 lg:p-8">
        {/* Skeleton Loader */}
        <div className="animate-pulse space-y-6">
          <div className="bg-white/10 h-96 rounded-xl"></div>
          <div className="h-4 bg-white/10 rounded w-3/4"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-12 bg-white/10 rounded"></div>
            <div className="h-12 bg-white/10 rounded"></div>
            <div className="h-12 bg-white/10 rounded"></div>
            <div className="h-12 bg-white/10 rounded"></div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <div className="inline-flex items-center text-teal-300">
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
      <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-4 sm:p-6 lg:p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h3 className="text-xl font-semibold text-white mb-2">Oops! Something went wrong</h3>
          <p className="text-slate-200 mb-6">{error}</p>
          <button
            onClick={onNext}
            className="px-6 py-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 sm:p-8 lg:p-12">
        <div className="text-center">
          <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">👔</div>
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">Ready for Style Magic?</h3>
          <p className="text-slate-200 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
            Upload a photo of your clothing and let our AI create the perfect outfit combination for you!
          </p>
          <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-sm text-slate-400 px-2">
            <span>👈</span>
            <span>Start by uploading a photo on the left</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-all shadow-xl backdrop-blur hover:shadow-2xl">
      {/* Side by Side: Uploaded Image and Generated Model Image */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80">
        {suggestion.model_image && suggestion.imageUrl ? (
          // Show both images side by side
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* Uploaded Image - Left Side */}
            <div className="relative bg-white/5 rounded-xl overflow-hidden border border-white/10">
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
            <div className="relative bg-white/5 rounded-xl overflow-hidden border border-white/10">
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
          <div className="relative min-h-[400px] bg-slate-900/80 flex items-center justify-center">
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
      <div className="p-4 sm:p-6 lg:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Your Perfect Outfit</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {(
            [
              { key: 'shirt', label: 'Shirt', icon: '👕', value: suggestion.shirt, bg: 'bg-teal-500/10', text: 'text-teal-300' },
              { key: 'trouser', label: 'Trousers', icon: '👖', value: suggestion.trouser, bg: 'bg-purple-500/10', text: 'text-purple-300' },
              { key: 'blazer', label: 'Blazer', icon: '🧥', value: suggestion.blazer, bg: 'bg-blue-500/10', text: 'text-blue-300' },
              { key: 'shoes', label: 'Shoes', icon: '👞', value: suggestion.shoes, bg: 'bg-amber-500/10', text: 'text-amber-300' },
              { key: 'belt', label: 'Belt', icon: '🎀', value: suggestion.belt, bg: 'bg-rose-500/10', text: 'text-rose-300' },
            ] as const
          ).map(({ key, label, icon, value, bg, text }) => {
            const selectedIdsByCategory: Partial<Record<'shirt' | 'trouser' | 'blazer' | 'shoes' | 'belt', number | null | undefined>> = {
              shirt: suggestion.shirt_id,
              trouser: suggestion.trouser_id,
              blazer: suggestion.blazer_id,
              shoes: suggestion.shoes_id,
              belt: suggestion.belt_id,
            };
            const categoryMatches = suggestion.matching_wardrobe_items?.[key] || [];
            const selectedId = selectedIdsByCategory[key];
            // Only use wardrobe match when the AI returned a primary key for this slot.
            // If the AI didn't provide an ID (null/undefined), treat it as "suggested by AI".
            const match = (selectedId
              ? categoryMatches.find((item) => item.id === selectedId)
              : undefined) as MatchingWardrobeItem | undefined;
            // Use uploaded image only for the category that matched the upload (e.g. shirt card only when upload was a shirt)
            const useUploadForThisCard = suggestion.imageUrl && key === (suggestion.upload_matched_category ?? '');
            const wardrobeImageSrc = !useUploadForThisCard && match?.image_data
              ? `data:image/jpeg;base64,${match.image_data}`
              : null;
            const thumbSrc = useUploadForThisCard
              ? suggestion.imageUrl!
              : wardrobeImageSrc;

            // If this card is using a wardrobe thumbnail, prefer the wardrobe item's own description
            // so the text matches the image the user sees.
            const displayValue =
              wardrobeImageSrc && (match?.description || match?.color)
                ? (match?.description || match?.color || value)
                : value;

            const sourceLabel = useUploadForThisCard
              ? '(your upload)'
              : wardrobeImageSrc
                ? '(from wardrobe)'
                : !match
                  ? '(suggested by AI)'
                  : null;

            return (
              <div
                key={key}
                className={`${bg} rounded-xl p-4 border border-white/10 ${key === 'belt' ? 'md:col-span-2' : ''} flex gap-4 items-start`}
              >
                {thumbSrc && (
                  <button
                    type="button"
                    onClick={() => setFullWardrobeImage({ src: thumbSrc, label })}
                    className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white shadow cursor-pointer hover:ring-2 ring-teal-500 ring-offset-1 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500"
                    aria-label={`View ${label} full size`}
                    title="Click to view full size"
                  >
                    <img
                      src={thumbSrc}
                      alt={label}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${text} mb-1`}>
                    {icon} {label}
                    {sourceLabel && <span className="ml-1 text-xs">{sourceLabel}</span>}
                  </div>
                  <p className="text-slate-200">{displayValue}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reasoning */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-2">Why This Works</h3>
              <p className="text-slate-200 leading-relaxed">{suggestion.reasoning}</p>
            </div>
          </div>
        </div>

        {/* Cost Display (admin only) */}
        {isAdmin && suggestion.cost && (
          <div className="bg-teal-500/10 border border-teal-400/20 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-teal-200 mb-1">💰 AI Suggestion Cost</h3>
                <div className="text-sm text-slate-200 space-y-1">
                  <div>GPT-4 Vision: {formatCost(suggestion.cost.gpt4_cost)}</div>
                  {suggestion.cost.model_image_cost !== undefined && suggestion.cost.model_image_cost > 0 && (
                    <div>Model Image ({suggestion.model_image?.length ? 'DALL-E 3' : 'Other'}): {formatCost(suggestion.cost.model_image_cost)}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {formatCost(suggestion.cost.total_cost)}
                </div>
                <div className="text-xs text-teal-300">Total</div>
              </div>
            </div>
          </div>
        )}

        {showAiPromptResponse && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 mb-6">
            <h3 className="font-semibold text-white mb-4">AI Prompt & Response (only available to Admin)</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Input Prompt</div>
                <pre className="text-sm text-slate-200 whitespace-pre-wrap break-words max-h-56 overflow-auto">{aiPrompt}</pre>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">AI Response</div>
                <pre className="text-sm text-slate-200 whitespace-pre-wrap break-words max-h-56 overflow-auto">{aiResponse}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - touch-friendly on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <button
            onClick={onNext}
            disabled={!hasImage}
            className={`min-h-[48px] px-4 py-3 rounded-xl font-medium transition-all shadow-md touch-manipulation ${
              hasImage
                ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]'
                : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
            }`}
            aria-label="Get next suggestion"
          >
            🔄 Next
          </button>
          
          <button
            onClick={onLike}
            disabled={!hasImage}
            className={`min-h-[48px] px-4 py-3 rounded-xl font-medium transition-all shadow-md touch-manipulation ${
              hasImage
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]'
                : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
            }`}
            aria-label="Like this outfit"
          >
            👍 Like
          </button>
          
          <button
            onClick={onDislike}
            disabled={!hasImage}
            className={`min-h-[48px] px-4 py-3 rounded-xl font-medium transition-all shadow-md touch-manipulation ${
              hasImage
                ? 'bg-slate-600 text-white hover:bg-slate-500 active:scale-[0.98]'
                : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
            }`}
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
              disabled={!hasImage}
              className={`min-h-[48px] px-6 py-3 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 touch-manipulation ${
                hasImage
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98]'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
              }`}
              aria-label="Add new item to your wardrobe"
            >
              <span>👔</span>
              <span>Add to Wardrobe</span>
            </button>
            <p className="text-sm text-slate-400 text-center">
              If you want to add a new item to your wardrobe, press this button.
            </p>
          </div>
        )}
      </div>

      {/* Modal: AI Details */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="rounded-2xl bg-slate-900 border border-white/10 max-w-2xl w-full shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">AI Recommendation Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                aria-label="Close details"
                className="p-2 rounded hover:bg-white/10 text-slate-300"
              >
                ✖
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
              <>
                {suggestion.meta?.usedPrompt && (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Prompt Sent</div>
                    <pre className="text-sm text-slate-200 whitespace-pre-wrap">{suggestion.meta.usedPrompt}</pre>
                  </div>
                )}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Parsed Recommendation</div>
                  <pre className="text-sm text-slate-200 whitespace-pre-wrap">{JSON.stringify({
                    shirt: suggestion.shirt,
                    trouser: suggestion.trouser,
                    blazer: suggestion.blazer,
                    shoes: suggestion.shoes,
                    belt: suggestion.belt,
                    reasoning: suggestion.reasoning
                  }, null, 2)}</pre>
                </div>
                {suggestion.raw && (
                  <details className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <summary className="cursor-pointer text-sm font-medium text-slate-200">Raw AI Response JSON</summary>
                    <pre className="mt-2 text-xs text-slate-300 whitespace-pre-wrap">{JSON.stringify(suggestion.raw, null, 2)}</pre>
                  </details>
                )}
              </>
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Wardrobe Item Image */}
      {fullWardrobeImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          role="dialog"
          aria-modal="true"
          onClick={() => setFullWardrobeImage(null)}
        >
          <button
            onClick={() => setFullWardrobeImage(null)}
            aria-label="Close full image"
            className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white text-xl transition-colors z-10"
          >
            ✕
          </button>
          <img
            src={fullWardrobeImage.src}
            alt={`${fullWardrobeImage.label} from wardrobe - Full view`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            {fullWardrobeImage.label} — Click anywhere to close
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

