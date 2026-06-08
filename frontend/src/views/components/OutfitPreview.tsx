import React from 'react';
import { OutfitSuggestion, MatchingWardrobeItem } from '../../models/OutfitModels';
import OutfitItemCard from './suggestion/OutfitItemCard';

interface OutfitPreviewProps {
  suggestion: OutfitSuggestion | null;
  loading: boolean;
  error: string | null;
  onGenerateAnother: () => void;
  onMakeMoreFormal?: () => void;
  onMakeMoreCasual?: () => void;
  onUseWardrobeOnly?: () => void;
  onChangeOccasion?: () => void;
  onNavigateToWardrobe?: (category?: string) => void; // Optional callback to navigate to wardrobe
  isAuthenticated?: boolean; // Whether user is logged in
  onAddToWardrobe?: () => void; // Callback to add uploaded item to wardrobe
  hasImage?: boolean; // Whether an image was uploaded for this suggestion
  showWardrobeOnlyAction?: boolean;
  showAiPromptResponse?: boolean;
  isAdmin?: boolean;
}

const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  suggestion,
  loading,
  error,
  onGenerateAnother,
  onMakeMoreFormal,
  onMakeMoreCasual,
  onUseWardrobeOnly,
  onChangeOccasion,
  onNavigateToWardrobe,
  isAuthenticated = false,
  onAddToWardrobe,
  hasImage = false,
  showWardrobeOnlyAction = true,
  showAiPromptResponse = true,
  isAdmin = false
}) => {
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

  const selectedIdsByCategory: Partial<Record<'shirt' | 'trouser' | 'blazer' | 'shoes' | 'belt', number | null | undefined>> = suggestion
    ? {
        shirt: suggestion.shirt_id,
        trouser: suggestion.trouser_id,
        blazer: suggestion.blazer_id,
        shoes: suggestion.shoes_id,
        belt: suggestion.belt_id,
      }
    : {};

  const confidenceLine = React.useMemo(() => {
    if (!suggestion) return '';
    const styleHint = suggestion.reasoning.toLowerCase().includes('business') ? 'Business Casual' : 'Smart Casual';
    const seasonHint = suggestion.reasoning.toLowerCase().includes('spring')
      ? 'Spring'
      : suggestion.reasoning.toLowerCase().includes('summer')
        ? 'Summer'
        : 'All Seasons';
    return `Optimized for ${styleHint} - ${seasonHint}`;
  }, [suggestion]);

  const resolvedUploadCategory = React.useMemo(() => {
    if (!suggestion?.imageUrl) return null;

    const categoryValues: Array<{ key: 'shirt' | 'trouser' | 'blazer' | 'shoes' | 'belt'; value: string }> = [
      { key: 'shirt', value: suggestion.shirt || '' },
      { key: 'trouser', value: suggestion.trouser || '' },
      { key: 'blazer', value: suggestion.blazer || '' },
      { key: 'shoes', value: suggestion.shoes || '' },
      { key: 'belt', value: suggestion.belt || '' },
    ];

    // Prefer explicit AI wording when present (e.g. "from the uploaded image").
    const textMatchedCategory = categoryValues.find(({ value }) =>
      /uploaded image|from your upload|your upload/i.test(value)
    )?.key;

    if (textMatchedCategory) return textMatchedCategory;

    const raw = (suggestion.source_slot || suggestion.upload_matched_category || '').toLowerCase();
    const aliases: Record<string, 'shirt' | 'trouser' | 'blazer' | 'shoes' | 'belt'> = {
      shirt: 'shirt',
      shirts: 'shirt',
      trouser: 'trouser',
      trousers: 'trouser',
      pant: 'trouser',
      pants: 'trouser',
      blazer: 'blazer',
      blazers: 'blazer',
      jacket: 'blazer',
      jackets: 'blazer',
      shoe: 'shoes',
      shoes: 'shoes',
      belt: 'belt',
      belts: 'belt',
    };
    return aliases[raw] ?? null;
  }, [suggestion]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-xl backdrop-blur sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-80 rounded-2xl bg-white/10 md:h-96"></div>
          <div className="h-4 rounded bg-white/10 w-3/4"></div>
          <div className="h-4 rounded bg-white/10 w-1/2"></div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="h-24 rounded-xl bg-white/10"></div>
            <div className="h-24 rounded-xl bg-white/10"></div>
            <div className="h-24 rounded-xl bg-white/10"></div>
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
            onClick={onGenerateAnother}
            className="btn-brand rounded-full px-6 py-3"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-xl backdrop-blur">
        <div className="relative flex min-h-[320px] flex-col items-center justify-center bg-hero-flatlay p-6 sm:min-h-[400px] sm:p-8 lg:min-h-[480px] lg:p-12">
          <div className="absolute inset-0 bg-brand-gradient-soft opacity-30" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <span className="text-5xl drop-shadow-lg sm:text-6xl" role="img" aria-label="Shirt">👔</span>
            <span className="text-4xl drop-shadow-lg sm:text-5xl" role="img" aria-label="Shoes">👞</span>
            <span className="text-4xl drop-shadow-lg sm:text-5xl" role="img" aria-label="Jacket">🧥</span>
            <span className="text-4xl drop-shadow-lg sm:text-5xl" role="img" aria-label="Jeans">👖</span>
          </div>
          <p className="relative mt-8 text-center text-sm text-slate-400 sm:text-base">
            Your AI-styled outfit preview will appear here
          </p>
          <p className="sr-only">Ready for Style Magic?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_18px_50px_rgba(2,8,23,0.55)] backdrop-blur sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl">
        {suggestion.model_image && suggestion.imageUrl ? (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900">Uploaded item</span>
              <img src={suggestion.imageUrl} alt="Uploaded clothing item" className="h-[360px] w-full object-contain md:h-[420px]" />
            </div>
            <button
              type="button"
              onClick={() => setShowFullImage(true)}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 text-left"
            >
              <span className="absolute left-3 top-3 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white">AI model preview</span>
              <img
                src={`data:image/png;base64,${suggestion.model_image}`}
                alt="AI generated model wearing recommended outfit"
                className="h-[360px] w-full object-contain md:h-[420px]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('image/png')) target.src = `data:image/jpeg;base64,${suggestion.model_image}`;
                }}
              />
            </button>
          </div>
        ) : suggestion.model_image ? (
          <button
            type="button"
            onClick={() => setShowFullImage(true)}
            className="relative flex min-h-[360px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-left"
          >
            <span className="absolute left-3 top-3 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white">AI model preview</span>
            <img
              src={`data:image/png;base64,${suggestion.model_image}`}
              alt="AI generated model wearing recommended outfit"
              className="max-h-[520px] w-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('image/png')) target.src = `data:image/jpeg;base64,${suggestion.model_image}`;
              }}
            />
          </button>
        ) : suggestion.imageUrl ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4">
            <span className="absolute left-7 top-7 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900">Uploaded item</span>
            <img src={suggestion.imageUrl} alt="Uploaded clothing item" className="h-[360px] w-full object-contain md:h-[420px]" />
          </div>
        ) : (
          <div className="flex h-[340px] items-center justify-center text-6xl text-slate-500">👔</div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">AI Styled Outfit</h2>
        <p className="sr-only">Your Perfect Outfit</p>
        <p className="mt-1 text-sm text-brand-blue">{confidenceLine}</p>
        {process.env.NODE_ENV !== 'production' && (
          <p className="mt-2 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-200">
            Debug: upload matched category = {suggestion.upload_matched_category || 'none'}
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(
          [
            { key: 'shirt', label: 'Shirt', value: suggestion.shirt },
            { key: 'trouser', label: 'Trousers', value: suggestion.trouser },
            { key: 'blazer', label: 'Blazer', value: suggestion.blazer },
            { key: 'shoes', label: 'Shoes', value: suggestion.shoes },
            { key: 'belt', label: 'Belt', value: suggestion.belt },
          ] as const
        ).map(({ key, label, value }) => {
          const categoryMatches = suggestion.matching_wardrobe_items?.[key] || [];
          const selectedId = selectedIdsByCategory[key];
          const match = (selectedId ? categoryMatches.find((item) => item.id === selectedId) : undefined) as MatchingWardrobeItem | undefined;
          const useUploadForThisCard = !!suggestion.imageUrl && key === resolvedUploadCategory;
          const wardrobeImageSrc = !useUploadForThisCard && match?.image_data ? `data:image/jpeg;base64,${match.image_data}` : null;
          const thumbSrc = useUploadForThisCard ? suggestion.imageUrl! : wardrobeImageSrc;
          const tagLabel = useUploadForThisCard ? 'From your upload' : wardrobeImageSrc ? 'From your wardrobe' : 'AI Suggested';
          const tagTone = useUploadForThisCard || wardrobeImageSrc ? 'wardrobe' : 'ai';
          const legacyHint = !match && !useUploadForThisCard ? '(suggested by AI)' : undefined;

          return (
            <OutfitItemCard
              key={key}
              title={label}
              description={value}
              imageSrc={thumbSrc}
              imageAlt={label}
              tag={tagLabel}
              tagTone={tagTone}
              legacyHint={legacyHint}
              onImageClick={thumbSrc ? () => setFullWardrobeImage({ src: thumbSrc, label }) : undefined}
            />
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Why This Works</h3>
        <p className="text-sm leading-6 text-slate-200">{suggestion.reasoning}</p>
      </div>

      {(isAdmin && suggestion.cost) || (showAiPromptResponse && isAdmin) ? (
        <details className="group mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 [&::-webkit-details-marker]:hidden">
            <span>Advanced options</span>
            <span className="text-slate-500 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-4 border-t border-white/10 px-4 py-4">
            {isAdmin && suggestion.cost && (
              <div className="rounded-xl border border-brand-blue/20 bg-brand-gradient-soft p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="mb-1 font-semibold text-brand-blue">AI Suggestion Cost</h3>
                    <div className="text-sm text-slate-200 space-y-1">
                      <div>GPT-4 Vision: {formatCost(suggestion.cost.gpt4_cost)}</div>
                      {suggestion.cost.model_image_cost !== undefined && suggestion.cost.model_image_cost > 0 && (
                        <div>Model Image: {formatCost(suggestion.cost.model_image_cost)}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{formatCost(suggestion.cost.total_cost)}</div>
                    <div className="text-xs text-brand-purple">Total</div>
                  </div>
                </div>
              </div>
            )}

            {showAiPromptResponse && isAdmin && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                <h3 className="mb-4 font-semibold text-white">AI Prompt & Response (Admin)</h3>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Input Prompt</div>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-200">{aiPrompt}</pre>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">AI Response</div>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-200">{aiResponse}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </details>
      ) : null}

      <div className="mt-6 space-y-4">
        <button
          onClick={onGenerateAnother}
          disabled={!hasImage}
          className={`min-h-[48px] w-full touch-manipulation rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            hasImage
              ? 'btn-brand'
              : 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
          }`}
          aria-label="Generate another look"
        >
          Generate Another Look
        </button>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {onMakeMoreFormal && (
            <button
              type="button"
              onClick={onMakeMoreFormal}
              disabled={!hasImage}
              className="min-h-[44px] touch-manipulation rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-brand-purple/60 hover:bg-brand-purple/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Make it more formal"
            >
              Make it more formal
            </button>
          )}
          {onMakeMoreCasual && (
            <button
              type="button"
              onClick={onMakeMoreCasual}
              disabled={!hasImage}
              className="min-h-[44px] touch-manipulation rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-brand-purple/60 hover:bg-brand-purple/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Make it more casual"
            >
              Make it more casual
            </button>
          )}
          {showWardrobeOnlyAction && onUseWardrobeOnly && (
            <button
              type="button"
              onClick={onUseWardrobeOnly}
              disabled={!hasImage || !isAuthenticated}
              className="min-h-[44px] touch-manipulation rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-brand-blue/60 hover:bg-brand-blue/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Use wardrobe items only"
            >
              Use wardrobe items only
            </button>
          )}
          {onChangeOccasion && (
            <button
              type="button"
              onClick={onChangeOccasion}
              className="min-h-[44px] touch-manipulation rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-200/50 hover:bg-white/10"
              aria-label="Change occasion"
            >
              Change occasion
            </button>
          )}
        </div>
      </div>

      {onNavigateToWardrobe && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToWardrobe()}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-300 transition hover:border-sky-300/60 hover:text-sky-200"
          >
            Open Wardrobe
          </button>
        </div>
      )}

      {isAuthenticated && onAddToWardrobe && (
        <div className="mt-4">
          <button
            onClick={onAddToWardrobe}
            disabled={!hasImage}
            className={`min-h-[48px] touch-manipulation rounded-xl px-5 py-3 text-sm font-medium transition-all ${
              hasImage
                ? 'border border-white/15 bg-white/5 text-slate-200 hover:border-brand-purple/60 hover:bg-brand-purple/10'
                : 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
            }`}
            aria-label="Add new item to your wardrobe"
          >
            Add to Wardrobe
          </button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-3 z-40 px-4 sm:hidden">
        <div className="mx-auto flex max-w-md flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-2 backdrop-blur">
          <button
            onClick={onGenerateAnother}
            disabled={!hasImage}
            className="btn-brand min-h-[44px] w-full rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Generate another look"
          >
            Generate Another Look
          </button>
          <div className="grid grid-cols-2 gap-2">
            {onMakeMoreFormal && (
              <button
                type="button"
                onClick={onMakeMoreFormal}
                disabled={!hasImage}
                className="min-h-[40px] rounded-xl border border-white/20 px-2 py-2 text-[11px] font-medium text-slate-100 disabled:opacity-40"
              >
                More formal
              </button>
            )}
            {onMakeMoreCasual && (
              <button
                type="button"
                onClick={onMakeMoreCasual}
                disabled={!hasImage}
                className="min-h-[40px] rounded-xl border border-white/20 px-2 py-2 text-[11px] font-medium text-slate-100 disabled:opacity-40"
              >
                More casual
              </button>
            )}
          </div>
        </div>
      </div>

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

