import React from 'react';
import {
  DayOfWeek,
  MissingOutfitSlot,
  WEEK_DAY_LABELS,
  WEEK_PLAN_CORE_SLOTS,
  WeekPlanDay,
  WeekPlanOutfit,
  getMissingOutfitSlots,
  getWeekDayStatus,
} from '../../../models/WeekPlanModels';
import { FILTER_OPTIONS } from '../../../utils/constants';
import { MAIN_FLOW_UX_COPY } from '../../../utils/mainFlowUxCopy';
import type { OutfitCategoryKey } from '../../../utils/outfitItemThumbnail';
import WeekPlanOutfitAdminPanel from './WeekPlanOutfitAdminPanel';
import OutfitItem from './OutfitItem';
import OutfitSummary from './OutfitSummary';
import MissingItemCard from './MissingItemCard';
import { plannerSurface, secondaryCtaClass, selectClass } from './weekPlanStyles';

const OPTIONAL_SLOTS: Array<{ key: OutfitCategoryKey; label: string; field: keyof WeekPlanOutfit }> =
  [
    { key: 'sweater', label: MAIN_FLOW_UX_COPY.layerLabel, field: 'sweater' },
    { key: 'outerwear', label: MAIN_FLOW_UX_COPY.outerwearLabel, field: 'outerwear' },
    { key: 'tie', label: MAIN_FLOW_UX_COPY.tieLabel, field: 'tie' },
  ];

export interface OutfitPreviewProps {
  day: WeekPlanDay;
  busy: boolean;
  showAdminDiagnostics?: boolean;
  dismissedMissing: boolean;
  onUpdateDay: (
    dayOfWeek: number,
    patch: {
      enabled?: boolean;
      occasion?: string;
      style?: string;
      use_wardrobe_only?: boolean;
    }
  ) => void;
  onRegenerateDay: (dayOfWeek: number) => void;
  onChooseFromWardrobe: (slots: MissingOutfitSlot[]) => void;
  onFindAlternative: (dayOfWeek: number) => void;
  onContinueWithout: (dayOfWeek: number) => void;
}

const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  day,
  busy,
  showAdminDiagnostics = false,
  dismissedMissing,
  onUpdateDay,
  onRegenerateDay,
  onChooseFromWardrobe,
  onFindAlternative,
  onContinueWithout,
}) => {
  const label = WEEK_DAY_LABELS[day.day_of_week as DayOfWeek] ?? `Day ${day.day_of_week}`;
  const useWardrobe = day.use_wardrobe_only !== false;
  const status = getWeekDayStatus(day);
  const outfit = day.outfit;
  const missingSlots = outfit && !dismissedMissing ? getMissingOutfitSlots(outfit) : [];
  const testIdPrefix = `week-day-summary-${day.day_of_week}`;

  const filledCore = WEEK_PLAN_CORE_SLOTS.filter(({ field }) => {
    if (!outfit) return false;
    const value = outfit[field];
    return typeof value === 'string' && value.trim();
  });

  const filledOptional = OPTIONAL_SLOTS.filter(({ field }) => {
    if (!outfit) return false;
    const value = outfit[field];
    return typeof value === 'string' && value.trim();
  });

  return (
    <section
      className={`${plannerSurface} p-4 min-[768px]:p-5`}
      aria-label={`${label} detail`}
      data-testid="week-day-detail"
      data-day={day.day_of_week}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">{label}</h2>
        {day.enabled && (
          <button
            type="button"
            onClick={() => onRegenerateDay(day.day_of_week)}
            disabled={busy}
            className={secondaryCtaClass}
            data-testid={`week-day-regenerate-${day.day_of_week}`}
          >
            Regenerate
          </button>
        )}
      </div>

      {/* Day setup */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1200px]:grid-cols-4">
        <div>
          <label
            htmlFor={`week-day-occasion-${day.day_of_week}`}
            className="mb-1 block text-xs font-medium text-slate-400"
          >
            Occasion
          </label>
          <select
            id={`week-day-occasion-${day.day_of_week}`}
            value={day.occasion}
            onChange={(e) => onUpdateDay(day.day_of_week, { occasion: e.target.value })}
            disabled={busy || !day.enabled}
            className={selectClass}
            aria-label={`${label} occasion`}
          >
            {FILTER_OPTIONS.occasions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`week-day-style-${day.day_of_week}`}
            className="mb-1 block text-xs font-medium text-slate-400"
          >
            Style
          </label>
          <select
            id={`week-day-style-${day.day_of_week}`}
            value={day.style || 'classic'}
            onChange={(e) => onUpdateDay(day.day_of_week, { style: e.target.value })}
            disabled={busy || !day.enabled}
            className={selectClass}
            aria-label={`${label} style`}
          >
            {FILTER_OPTIONS.styles.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {day.enabled && (
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              checked={useWardrobe}
              onChange={(e) =>
                onUpdateDay(day.day_of_week, { use_wardrobe_only: e.target.checked })
              }
              disabled={busy}
              aria-label={`${label} use wardrobe`}
              data-testid={`week-day-wardrobe-${day.day_of_week}`}
              className="h-4 w-4 rounded border-white/20 bg-slate-800 text-brand-blue focus:ring-brand-blue"
            />
            <span className="text-xs font-medium text-slate-300">Use wardrobe</span>
          </label>
        )}
      </div>

      {!day.enabled && (
        <p className="text-sm text-slate-400">This is a rest day. Enable it to plan an outfit.</p>
      )}

      {day.enabled && !outfit && (
        <p className="text-sm text-slate-400">
          Not generated yet. Tap Generate week or Regenerate for this day.
        </p>
      )}

      {day.enabled && outfit && (
        <div className="grid grid-cols-1 gap-5 min-[768px]:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filledCore.map(({ key, label: slotLabel, field }) => (
                <OutfitItem
                  key={key}
                  categoryKey={key}
                  label={slotLabel}
                  value={String(outfit[field])}
                  outfit={outfit}
                />
              ))}
              {missingSlots.map((slot) => (
                <div
                  key={slot.key}
                  className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-brand-purple/40 bg-brand-purple/5 p-2 text-center"
                  data-testid={`week-outfit-missing-slot-${slot.key}`}
                >
                  <p className="text-xs font-medium text-purple-200">{slot.label}</p>
                  <p className="mt-1 text-[10px] text-purple-300/70">Missing</p>
                </div>
              ))}
            </div>
            {filledOptional.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filledOptional.map(({ key, label: slotLabel, field }) => (
                  <OutfitItem
                    key={key}
                    categoryKey={key}
                    label={slotLabel}
                    value={String(outfit[field])}
                    outfit={outfit}
                  />
                ))}
              </div>
            )}
            {missingSlots.length > 0 && (
              <MissingItemCard
                slots={missingSlots}
                busy={busy}
                onChooseFromWardrobe={() => onChooseFromWardrobe(missingSlots)}
                onFindAlternative={() => onFindAlternative(day.day_of_week)}
                onContinueWithout={() => onContinueWithout(day.day_of_week)}
              />
            )}
          </div>

          <div className="space-y-4">
            <OutfitSummary
              outfit={outfit}
              status={status}
              testIdPrefix={testIdPrefix}
              fromWardrobe={useWardrobe}
            />
            {showAdminDiagnostics && (
              <WeekPlanOutfitAdminPanel dayLabel={label} outfit={outfit} />
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default OutfitPreview;
