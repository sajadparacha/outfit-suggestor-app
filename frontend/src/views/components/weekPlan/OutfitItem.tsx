import React from 'react';
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

  return (
    <article
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0A0E1A]/60"
      data-testid={`week-outfit-item-${categoryKey}`}
    >
      <div className="aspect-square bg-slate-900/80">
        {thumb.imageSrc ? (
          <img
            src={thumb.imageSrc}
            alt={imageAlt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-b from-white/[0.04] to-transparent px-2 text-center"
            aria-hidden
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
    </article>
  );
};

export default OutfitItem;
