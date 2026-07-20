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

const OutfitItem: React.FC<OutfitItemProps> = ({ categoryKey, label, value, outfit }) => {
  const suggestion = asSuggestion(outfit);
  const thumb = resolveOutfitItemThumbnail(suggestion, categoryKey);
  const { shortName, oneLineReason } = parseOutfitItemCardText(value);
  const tagLabel =
    thumb.tag === 'wardrobe' ? MAIN_FLOW_UX_COPY.tagFromWardrobe : MAIN_FLOW_UX_COPY.tagAiSuggested;

  return (
    <article
      className="overflow-hidden rounded-xl border border-white/10 bg-[#0A0E1A]/60"
      data-testid={`week-outfit-item-${categoryKey}`}
    >
      <div className="aspect-square bg-slate-900/80">
        {thumb.imageSrc ? (
          <img
            src={thumb.imageSrc}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No image
          </div>
        )}
      </div>
      <div className="space-y-1 p-2.5">
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
              thumb.tag === 'ai'
                ? 'bg-brand-blue/20 text-brand-blue'
                : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {tagLabel}
          </span>
        </div>
        <p className="text-sm font-medium text-white line-clamp-2">{shortName || value}</p>
        {oneLineReason && (
          <p className="text-xs text-slate-400 line-clamp-2">{oneLineReason}</p>
        )}
      </div>
    </article>
  );
};

export default OutfitItem;
