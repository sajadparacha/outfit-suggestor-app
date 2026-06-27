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

function occasionDisplay(v: string): string {
  const m: Record<string, string> = {
    everyday: 'Everyday',
    work: 'Work',
    'date-night': 'Date Night',
    'dinner-night-out': 'Dinner / Night Out',
    party: 'Party',
    'wedding-guest': 'Wedding Guest',
    'formal-event': 'Formal Event',
    travel: 'Travel',
    workout: 'Workout',
    errands: 'Errands',
    lounge: 'Lounge',
    outdoor: 'Outdoor',
  };
  return v ? m[v] || v : 'Everyday';
}

function seasonDisplay(v: string): string {
  const m: Record<string, string> = {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
    transitional: 'Transitional',
    'all-season': 'All Season',
  };
  return v ? m[v] || v : 'All Season';
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
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      data-testid="main-flow-compact-summary"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {MAIN_FLOW_UX_COPY.compactSummaryTitle}
      </h2>

      {previewUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
          <img
            src={previewUrl}
            alt={sourceWardrobeItem ? `Wardrobe ${sourceWardrobeItem.category}` : 'Uploaded clothing'}
            className="mx-auto max-h-28 w-full object-contain"
          />
          <p className="truncate px-2 py-1.5 text-center text-[11px] text-slate-500">
            {caption}
          </p>
        </div>
      )}

      <p className="mt-3 text-sm font-medium text-brand-blue">{contextLine}</p>

      <dl className="mt-3 space-y-1.5 text-sm text-slate-300">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Occasion</dt>
          <dd className="text-right text-white">{occasionDisplay(displayFilters.occasion)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Season</dt>
          <dd className="text-right text-white">{seasonDisplay(displayFilters.season)}</dd>
        </div>
        {notes && (
          <div>
            <dt className="text-slate-500">Notes</dt>
            <dd className="mt-0.5 text-slate-200 line-clamp-2">{notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
};

export default MainFlowCompactSummary;
