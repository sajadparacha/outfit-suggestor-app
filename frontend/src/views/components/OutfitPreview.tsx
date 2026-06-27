import React from 'react';
import { OutfitSuggestion } from '../../models/OutfitModels';
import OutfitItemCard from './suggestion/OutfitItemCard';
import EmptyOutfitPreview from './EmptyOutfitPreview';
import RefineMenu from './RefineMenu';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';
import { formatOutfitContextLine } from '../../utils/outfitContextLine';
import { parseOutfitItemCardText } from '../../utils/outfitItemCardText';
import { reasoningToBullets } from '../../utils/reasoningBullets';
import {
  resolveOutfitItemThumbnail,
  type CoreOutfitCategoryKey,
  type OptionalOutfitCategoryKey,
  type OutfitCategoryKey,
} from '../../utils/outfitItemThumbnail';

interface OutfitPreviewFilters {
  occasion?: string;
  season?: string;
  style?: string;
}

interface OutfitPreviewProps {
  suggestion: OutfitSuggestion | null;
  loading: boolean;
  error: string | null;
  filters?: OutfitPreviewFilters;
  onGenerateAnother: () => void;
  onMakeMoreFormal?: () => void;
  onMakeMoreCasual?: () => void;
  onUseWardrobeOnly?: () => void;
  onChangeOccasion?: () => void;
  onSaveLook?: () => void;
  isAuthenticated?: boolean;
  hasImage?: boolean;
  canGenerateAnother?: boolean;
  showWardrobeOnlyAction?: boolean;
  guestLimitReached?: boolean;
}

const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  suggestion,
  loading,
  error,
  filters = {},
  onGenerateAnother,
  onMakeMoreFormal,
  onMakeMoreCasual,
  onUseWardrobeOnly,
  onChangeOccasion,
  onSaveLook,
  isAuthenticated = false,
  hasImage = false,
  canGenerateAnother,
  showWardrobeOnlyAction = true,
  guestLimitReached = false,
}) => {
  const canRegenerate = canGenerateAnother ?? hasImage;
  const aiActionsDisabled = !canRegenerate || guestLimitReached;
  const [showFullImage, setShowFullImage] = React.useState(false);
  const [fullWardrobeImage, setFullWardrobeImage] = React.useState<{ src: string; label: string } | null>(null);

  const contextLine = formatOutfitContextLine(filters);
  const reasoningBullets = suggestion ? reasoningToBullets(suggestion.reasoning) : [];

  React.useEffect(() => {
    if (!suggestion) return;

    const selectedIdsByCategory: Partial<
      Record<CoreOutfitCategoryKey | OptionalOutfitCategoryKey, number | null | undefined>
    > = {
      shirt: suggestion.shirt_id,
      trouser: suggestion.trouser_id,
      blazer: suggestion.blazer_id,
      shoes: suggestion.shoes_id,
      belt: suggestion.belt_id,
      sweater: suggestion.sweater_id,
      outerwear: suggestion.outerwear_id,
      tie: suggestion.tie_id,
    };

    (Object.keys(selectedIdsByCategory) as Array<keyof typeof selectedIdsByCategory>).forEach((category) => {
      const selectedId = selectedIdsByCategory[category];
      if (!selectedId) return;
      const categoryMatches = suggestion.matching_wardrobe_items?.[category] || [];
      const exists = categoryMatches.some((item) => item.id === selectedId);
      if (!exists) {
        console.warn('[OutfitPreview] AI-selected wardrobe ID not found in matched items', {
          category,
          selectedId,
          matchedItemIds: categoryMatches.map((item) => item.id),
        });
      }
    });
  }, [suggestion]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-xl backdrop-blur sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-80 rounded-2xl bg-white/10 md:h-96" />
          <div className="h-4 w-3/4 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/10" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="h-24 rounded-xl bg-white/10" />
            <div className="h-24 rounded-xl bg-white/10" />
            <div className="h-24 rounded-xl bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-white/5 p-4 shadow-xl backdrop-blur sm:p-6 lg:p-8">
        <div className="text-center">
          <div className="mb-4 text-6xl">😞</div>
          <h3 className="mb-2 text-xl font-semibold text-white">Oops! Something went wrong</h3>
          <p className="mb-6 text-slate-200">{error}</p>
          <button
            onClick={onGenerateAnother}
            disabled={aiActionsDisabled}
            className="btn-brand rounded-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <EmptyOutfitPreview />
      </div>
    );
  }

  const renderHero = () => {
    if (suggestion.model_image) {
      return (
        <button
          type="button"
          onClick={() => setShowFullImage(true)}
          className="relative flex min-h-[280px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-left lg:min-h-[360px]"
        >
          <span className="absolute left-3 top-3 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white">
            AI model preview
          </span>
          <img
            src={`data:image/png;base64,${suggestion.model_image}`}
            alt="AI generated model wearing recommended outfit"
            className="max-h-[520px] w-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('image/png')) {
                target.src = `data:image/jpeg;base64,${suggestion.model_image}`;
              }
            }}
          />
        </button>
      );
    }

    return (
      <div className="relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-purple/20 p-8 lg:min-h-[360px]">
        <div className="absolute inset-0 bg-brand-gradient-soft opacity-20" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <span className="text-4xl" aria-hidden>👔</span>
          <span className="text-4xl" aria-hidden>👖</span>
          <span className="text-4xl" aria-hidden>👞</span>
        </div>
        <p className="relative mt-6 text-center text-lg font-semibold text-white">{contextLine}</p>
        <p className="relative mt-1 text-center text-sm text-slate-400">Styled outfit preview</p>
      </div>
    );
  };

  const primaryActionClass = (enabled: boolean) =>
    `min-h-[48px] flex-1 touch-manipulation rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
      enabled
        ? 'btn-brand'
        : 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
    }`;

  const saveLookClass =
    'min-h-[48px] flex-1 touch-manipulation rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-200';

  const renderStickyActionBar = (wrapperClassName: string, testId: string) => (
    <div className={wrapperClassName}>
      <div
        className="mx-auto flex max-w-md gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-2 backdrop-blur md:max-w-[980px]"
        data-testid={testId}
      >
        {onSaveLook && (
          <button
            type="button"
            onClick={onSaveLook}
            className="min-h-[44px] flex-1 rounded-xl border border-white/20 bg-white/5 px-2 py-2 text-xs font-medium text-slate-100 md:min-h-[48px] md:text-sm"
            aria-label={MAIN_FLOW_UX_COPY.saveLook}
          >
            {MAIN_FLOW_UX_COPY.saveLook}
          </button>
        )}
        <button
          onClick={onGenerateAnother}
          disabled={aiActionsDisabled}
          className="btn-brand min-h-[44px] flex-1 rounded-xl px-2 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[48px] md:text-sm"
          aria-label={MAIN_FLOW_UX_COPY.generateAnother}
        >
          {MAIN_FLOW_UX_COPY.generateAnother}
        </button>
        <RefineMenu
          variant="compact"
          onMakeMoreFormal={onMakeMoreFormal}
          onMakeMoreCasual={onMakeMoreCasual}
          onUseWardrobeOnly={onUseWardrobeOnly}
          onChangeOccasion={onChangeOccasion}
          showWardrobeOnlyAction={showWardrobeOnlyAction}
          refineDisabled={aiActionsDisabled}
          wardrobeOnlyDisabled={!canRegenerate || !isAuthenticated}
        />
      </div>
    </div>
  );

  const isOptionalItemPresent = (value: string | null | undefined) =>
    value != null && value.trim() !== '';

  const optionalItems = (
    [
      { key: 'sweater', label: MAIN_FLOW_UX_COPY.layerLabel, value: suggestion.sweater },
      { key: 'outerwear', label: MAIN_FLOW_UX_COPY.outerwearLabel, value: suggestion.outerwear },
      { key: 'tie', label: MAIN_FLOW_UX_COPY.tieLabel, value: suggestion.tie },
    ] as const
  ).filter(({ value }) => isOptionalItemPresent(value));

  const hasOptionalLayers = optionalItems.length > 0;

  const renderItemCard = (
    key: OutfitCategoryKey,
    label: string,
    value: string
  ) => {
    const thumb = resolveOutfitItemThumbnail(suggestion, key, suggestion.imageUrl);
    const tagLabel =
      thumb.tag === 'upload'
        ? MAIN_FLOW_UX_COPY.tagFromUpload
        : thumb.tag === 'wardrobe'
          ? MAIN_FLOW_UX_COPY.tagFromWardrobe
          : MAIN_FLOW_UX_COPY.tagAiSuggested;
    const tagTone = thumb.tag === 'ai' ? 'ai' : 'wardrobe';
    const legacyHint = thumb.tag === 'ai' ? '(suggested by AI)' : undefined;
    const { shortName, oneLineReason } = parseOutfitItemCardText(value);

    return (
      <OutfitItemCard
        key={key}
        title={label}
        shortName={shortName}
        oneLineReason={oneLineReason}
        imageSrc={thumb.imageSrc}
        imageAlt={label}
        tag={tagLabel}
        tagTone={tagTone}
        legacyHint={legacyHint}
        onImageClick={thumb.imageSrc ? () => setFullWardrobeImage({ src: thumb.imageSrc!, label }) : undefined}
      />
    );
  };

  return (
    <div
      className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_18px_50px_rgba(2,8,23,0.55)] backdrop-blur sm:p-6 lg:p-8"
      data-testid="outfit-preview-result"
    >
      <div id="outfit-result-hero" className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl">
        {renderHero()}
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{MAIN_FLOW_UX_COPY.resultTitle}</h2>
        <p className="mt-1 text-sm text-brand-blue">{contextLine}</p>
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
        ).map(({ key, label, value }) => renderItemCard(key, label, value))}
      </div>

      {hasOptionalLayers && (
        <details
          className="group mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
          open
          data-testid="also-wear-section"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold uppercase tracking-wide text-slate-300 [&::-webkit-details-marker]:hidden">
            <span>{MAIN_FLOW_UX_COPY.alsoWearSection}</span>
            <span className="text-slate-500 transition-transform group-open:rotate-180" aria-hidden>
              ▼
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-5 sm:grid-cols-2">
            {optionalItems.map(({ key, label, value }) => renderItemCard(key, label, value!))}
          </div>
        </details>
      )}

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
          {MAIN_FLOW_UX_COPY.whyThisWorks}
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-200">
          {reasoningBullets.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </ul>
      </div>

      <div
        className="mt-6 hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center md:hidden"
        data-testid="result-primary-actions"
      >
        <button
          onClick={onGenerateAnother}
          disabled={aiActionsDisabled}
          className={primaryActionClass(!aiActionsDisabled)}
          aria-label={MAIN_FLOW_UX_COPY.generateAnother}
        >
          {MAIN_FLOW_UX_COPY.generateAnother}
        </button>
        {onSaveLook && (
          <button
            type="button"
            onClick={onSaveLook}
            className={saveLookClass}
            aria-label={MAIN_FLOW_UX_COPY.saveLook}
          >
            {MAIN_FLOW_UX_COPY.saveLook}
          </button>
        )}
        <RefineMenu
          onMakeMoreFormal={onMakeMoreFormal}
          onMakeMoreCasual={onMakeMoreCasual}
          onUseWardrobeOnly={onUseWardrobeOnly}
          onChangeOccasion={onChangeOccasion}
          showWardrobeOnlyAction={showWardrobeOnlyAction}
          refineDisabled={aiActionsDisabled}
          wardrobeOnlyDisabled={!canRegenerate || !isAuthenticated}
        />
      </div>

      {renderStickyActionBar('fixed inset-x-0 bottom-3 z-40 px-4 sm:hidden', 'result-sticky-mobile-actions')}
      {renderStickyActionBar('fixed inset-x-0 bottom-3 z-40 hidden px-4 md:block', 'result-sticky-wide-actions')}

      {fullWardrobeImage && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setFullWardrobeImage(null)}
        >
          <button
            onClick={() => setFullWardrobeImage(null)}
            aria-label="Close full image"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-3 text-xl text-white transition-colors hover:bg-white/30"
          >
            ✕
          </button>
          <img
            src={fullWardrobeImage.src}
            alt={`${fullWardrobeImage.label} - Full view`}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showFullImage && suggestion.model_image && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowFullImage(false)}
        >
          <button
            onClick={() => setShowFullImage(false)}
            aria-label="Close full image"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-3 text-xl text-white transition-colors hover:bg-white/30"
          >
            ✕
          </button>
          <img
            src={`data:image/png;base64,${suggestion.model_image}`}
            alt="AI generated model wearing recommended outfit - Full view"
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('image/png')) {
                target.src = `data:image/jpeg;base64,${suggestion.model_image}`;
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default OutfitPreview;
