import React from 'react';
import { InputPanelSource, SourceWardrobeItem } from '../../models/OutfitModels';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';
import { formatOutfitContextLine } from '../../utils/outfitContextLine';

interface Filters {
  occasion: string;
  season: string;
  style: string;
}

interface MainFlowCompactSummaryProps {
  filters: Filters;
  preferenceText: string;
  imagePreviewUrl?: string | null;
  flowPreviewUrl?: string | null;
  sourceWardrobeItem?: SourceWardrobeItem | null;
  imageName?: string;
  previewCaption?: string;
  inputSource?: InputPanelSource;
  summaryFilters?: Filters | null;
  summaryPreferenceText?: string | null;
}

const MainFlowCompactSummary: React.FC<MainFlowCompactSummaryProps> = ({
  filters,
  preferenceText,
  imagePreviewUrl = null,
  flowPreviewUrl = null,
  sourceWardrobeItem,
  imageName,
  previewCaption,
  inputSource = null,
  summaryFilters = null,
  summaryPreferenceText = null,
}) => {
  const displayFilters = summaryFilters ?? filters;
  const contextLine = formatOutfitContextLine(displayFilters);
  const notes = (summaryPreferenceText ?? preferenceText).trim();
  const previewUrl = imagePreviewUrl ?? flowPreviewUrl ?? null;

  const caption =
    previewCaption ??
    (inputSource === 'history'
      ? MAIN_FLOW_UX_COPY.fromHistory
      : sourceWardrobeItem
        ? `Wardrobe · ${sourceWardrobeItem.category}`
        : imageName);

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
      data-testid="main-flow-compact-summary"
    >
      {previewUrl && (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
          <img
            src={previewUrl}
            alt={sourceWardrobeItem ? `Wardrobe ${sourceWardrobeItem.category}` : 'Uploaded clothing'}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{contextLine}</p>
        {caption && (
          <p className="truncate text-xs text-slate-500">{caption}</p>
        )}
        {notes && (
          <p className="mt-0.5 truncate text-xs text-slate-400" title={notes}>
            Notes: {notes}
          </p>
        )}
      </div>
    </div>
  );
};

export default MainFlowCompactSummary;
