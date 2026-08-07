import React, { useEffect, useState } from 'react';
import { OutfitSuggestion } from '../../../models/OutfitModels';
import { WeekPlanOutfit } from '../../../models/WeekPlanModels';
import { MAIN_FLOW_UX_COPY } from '../../../utils/mainFlowUxCopy';
import { parseOutfitItemCardText } from '../../../utils/outfitItemCardText';
import {
  resolveOutfitItemThumbnail,
  type OutfitCategoryKey,
} from '../../../utils/outfitItemThumbnail';

export interface OutfitItemProps {
  categoryKey: OutfitCategoryKey;
  label: string;
  value: string;
  outfit: WeekPlanOutfit;
  onChangeItem?: (categoryKey: OutfitCategoryKey) => void;
}

function asSuggestion(outfit: WeekPlanOutfit): OutfitSuggestion {
  return {
    id: 'week-plan',
    shirt: outfit.shirt,
    trouser: outfit.trouser,
    blazer: outfit.blazer,
    shoes: outfit.shoes,
    belt: outfit.belt,
    reasoning: outfit.reasoning,
    sweater: outfit.sweater,
    outerwear: outfit.outerwear,
    tie: outfit.tie,
    shirt_id: outfit.shirt_id,
    trouser_id: outfit.trouser_id,
    blazer_id: outfit.blazer_id,
    shoes_id: outfit.shoes_id,
    belt_id: outfit.belt_id,
    sweater_id: outfit.sweater_id,
    outerwear_id: outfit.outerwear_id,
    tie_id: outfit.tie_id,
    matching_wardrobe_items: outfit.matching_wardrobe_items ?? undefined,
    model_image: outfit.model_image,
  };
}

const OutfitItem: React.FC<OutfitItemProps> = ({
  categoryKey,
  label,
  value,
  outfit,
  onChangeItem,
}) => {
  const suggestion = asSuggestion(outfit);
  const thumb = resolveOutfitItemThumbnail(suggestion, categoryKey);
  const { shortName } = parseOutfitItemCardText(value);
  const displayName = shortName || value;
  const tagLabel =
    thumb.tag === 'wardrobe' ? MAIN_FLOW_UX_COPY.tagFromWardrobe : MAIN_FLOW_UX_COPY.tagAiSuggested;
  const imageAlt = displayName
    ? `${label}: ${displayName}`
    : `${label} item`;
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    if (!viewingImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewingImage(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewingImage]);

  return (
    <article
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0A0E1A]/60"
      data-testid={`week-outfit-item-${categoryKey}`}
    >
      <div className="aspect-square bg-slate-900/80">
        {thumb.imageSrc ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewingImage(thumb.imageSrc);
            }}
            className="block h-full min-h-[44px] w-full min-w-[44px] cursor-pointer overflow-hidden transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            aria-label={`View ${label} full size`}
            data-testid={`week-outfit-enlarge-${categoryKey}`}
            title="Click to view full size"
          >
            <img
              src={thumb.imageSrc}
              alt={imageAlt}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-b from-white/[0.04] to-transparent px-2 text-center"
            aria-hidden
            data-testid={`week-outfit-placeholder-${categoryKey}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </span>
            <span className="text-xs text-slate-500">No photo</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div className="flex items-start justify-between gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            {label}
          </p>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
              thumb.tag === 'ai'
                ? 'bg-brand-blue/20 text-sky-200'
                : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {tagLabel}
          </span>
        </div>
        <p className="text-sm font-medium leading-snug text-white line-clamp-2">
          {displayName}
        </p>
        {onChangeItem && (
          <button
            type="button"
            onClick={() => onChangeItem(categoryKey)}
            className="mt-auto min-h-[44px] w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            data-testid={`week-outfit-change-${categoryKey}`}
            aria-label={`Change ${label}`}
          >
            Change
          </button>
        )}
      </div>

      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setViewingImage(null)}
          data-testid={`week-outfit-viewer-${categoryKey}`}
          role="dialog"
          aria-modal="true"
          aria-label={`${label} full size`}
        >
          <div className="relative flex h-full w-full max-h-[90vh] max-w-7xl items-center justify-center">
            <img
              src={viewingImage}
              alt="Full size view"
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute right-4 top-4 rounded-full bg-black bg-opacity-50 p-3 text-2xl text-white transition-all hover:bg-opacity-70"
              title="Close"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default OutfitItem;
