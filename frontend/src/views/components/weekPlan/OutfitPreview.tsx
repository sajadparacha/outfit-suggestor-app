import React from 'react';
import {
  DayOfWeek,
  WEEK_DAY_LABELS,
  WEEK_PLAN_EDITOR_SLOTS,
  WeekPlanDay,
  WeekPlanOutfit,
  getMissingOutfitSlots,
  getWeekDayStatus,
  isSlotPinned,
  isUngeneratedWeekPlanDay,
} from '../../../models/WeekPlanModels';
import { FILTER_OPTIONS } from '../../../utils/constants';
import { MAIN_FLOW_UX_COPY } from '../../../utils/mainFlowUxCopy';
import type { OutfitCategoryKey } from '../../../utils/outfitItemThumbnail';
import {
  optionalLayerCategories,
  resolveOptionalLayerText,
  shouldShowBlazerCard,
} from '../../../utils/outfitLayerExclusivity';
import WeekPlanOutfitAdminPanel from './WeekPlanOutfitAdminPanel';
import OutfitItem from './OutfitItem';
import OutfitSummary from './OutfitSummary';
import MissingItemCard from './MissingItemCard';
import { plannerSurface, secondaryCtaClass, selectClass } from './weekPlanStyles';
import type { OutfitSuggestion } from '../../../models/OutfitModels';

const OPTIONAL_SLOT_META: Record<
  'sweater' | 'outerwear' | 'tie',
  { key: OutfitCategoryKey; label: string; field: keyof WeekPlanOutfit }
> = {
  sweater: { key: 'sweater', label: MAIN_FLOW_UX_COPY.layerLabel, field: 'sweater' },
  outerwear: { key: 'outerwear', label: MAIN_FLOW_UX_COPY.outerwearLabel, field: 'outerwear' },
  tie: { key: 'tie', label: MAIN_FLOW_UX_COPY.tieLabel, field: 'tie' },
};

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

export interface OutfitPreviewProps {
  day: WeekPlanDay;
  season?: string;
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
  onChooseFromWardrobe: (slots: Array<{ key: string; label: string }>) => void;
  onUnpinSlot: (dayOfWeek: number, slotKey: string) => void;
  onFindAlternative: (dayOfWeek: number) => void;
  onContinueWithout: (dayOfWeek: number) => void;
}

const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  day,
  season,
  busy,
  showAdminDiagnostics = false,
  dismissedMissing,
  onUpdateDay,
  onRegenerateDay,
  onChooseFromWardrobe,
  onUnpinSlot,
  onFindAlternative,
  onContinueWithout,
}) => {
  const label = WEEK_DAY_LABELS[day.day_of_week as DayOfWeek] ?? `Day ${day.day_of_week}`;
  const useWardrobe = day.use_wardrobe_only !== false;
  const status = getWeekDayStatus(day);
  const outfit = day.outfit;
  const ungenerated = isUngeneratedWeekPlanDay(day);
  const missingSlots = outfit && !ungenerated && !dismissedMissing ? getMissingOutfitSlots(outfit) : [];
  const testIdPrefix = `week-day-summary-${day.day_of_week}`;
  const layerOpts = {
    season: season ?? null,
    occasion: day.occasion,
    style: day.style || 'classic',
  };

  const suggestion = outfit ? asSuggestion(outfit) : null;
  const showBlazer = suggestion ? shouldShowBlazerCard(suggestion) : false;

  const filledOptional =
    outfit && suggestion
      ? optionalLayerCategories(suggestion, null, layerOpts)
          .map((optKey) => {
            const text = resolveOptionalLayerText(suggestion, optKey, null, layerOpts);
            if (!text) return null;
            return { ...OPTIONAL_SLOT_META[optKey], value: text };
          })
          .filter((row): row is NonNullable<typeof row> => row != null)
      : [];

  const handleRegenerate = () => {
    if (day.outfit && !ungenerated) {
      const ok = window.confirm(
        `Regenerate ${label}? The current outfit for this day will be replaced.`
      );
      if (!ok) return;
    }
    onRegenerateDay(day.day_of_week);
  };

  const renderAddSlotCard = (
    key: string,
    slotLabel: string,
    options?: { optional?: boolean; missing?: boolean }
  ) => {
    const optional = options?.optional ?? false;
    const missing = options?.missing ?? false;
    if (optional) {
      return (
        <button
          key={key}
          type="button"
          className="flex min-h-[11rem] min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-white/25 bg-white/[0.03] p-3 text-center transition hover:border-brand-blue/40 hover:bg-brand-blue/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          data-testid="week-outfit-add-accessory"
          aria-label="Add accessory"
          onClick={() => onChooseFromWardrobe([{ key: 'belt', label: 'Accessory' }])}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Accessory
          </span>
          <span className="mt-2 text-sm font-medium text-slate-200">Add accessory</span>
          <span className="mt-1 text-xs text-slate-400">Optional</span>
        </button>
      );
    }
    if (missing) {
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChooseFromWardrobe([{ key, label: slotLabel }])}
          className="flex min-h-[11rem] min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-brand-purple/40 bg-brand-purple/5 p-3 text-center transition hover:bg-brand-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
          data-testid={`week-outfit-missing-slot-${key}`}
          aria-label={`Add ${slotLabel}`}
        >
          <p className="text-xs font-medium text-purple-100">{slotLabel}</p>
          <p className="mt-2 text-sm font-semibold text-purple-50">Add {slotLabel}</p>
        </button>
      );
    }
    return (
      <button
        key={key}
        type="button"
        onClick={() => onChooseFromWardrobe([{ key, label: slotLabel }])}
        className="flex min-h-[11rem] min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-white/25 bg-white/[0.03] p-3 text-center transition hover:border-brand-blue/40 hover:bg-brand-blue/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        data-testid={`week-outfit-add-slot-${key}`}
        aria-label={`Add ${slotLabel}`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {slotLabel}
        </span>
        <span className="mt-2 text-sm font-medium text-slate-200">Add {slotLabel}</span>
      </button>
    );
  };

  const renderEditorSlot = (
    key: (typeof WEEK_PLAN_EDITOR_SLOTS)[number]['key'],
    slotLabel: string,
    field: (typeof WEEK_PLAN_EDITOR_SLOTS)[number]['field'],
    slotOutfit: WeekPlanOutfit | null | undefined
  ) => {
    const pinned = isSlotPinned(day, key);
    const value = slotOutfit?.[field];
    const filled = typeof value === 'string' && value.trim();
    const isAccessory = key === 'belt';
    const isMissing = missingSlots.some((s) => s.key === key);

    if (pinned) {
      const displayOutfit: WeekPlanOutfit =
        slotOutfit ??
        ({
          summary: '',
          shirt: '',
          trouser: '',
          blazer: '',
          shoes: '',
          belt: '',
          reasoning: '',
        } as WeekPlanOutfit);
      return (
        <OutfitItem
          key={key}
          categoryKey={key}
          label={slotLabel}
          value={filled ? String(value) : 'Pinned item'}
          outfit={displayOutfit}
          pinned
          onUnpin={() => onUnpinSlot(day.day_of_week, key)}
          onChangeItem={
            !ungenerated
              ? (cat) => onChooseFromWardrobe([{ key: cat, label: slotLabel }])
              : undefined
          }
        />
      );
    }

    if (filled) {
      return (
        <OutfitItem
          key={key}
          categoryKey={key}
          label={slotLabel}
          value={String(value)}
          outfit={slotOutfit!}
          onChangeItem={(cat) => onChooseFromWardrobe([{ key: cat, label: slotLabel }])}
        />
      );
    }

    if (isAccessory) {
      return renderAddSlotCard(key, slotLabel, { optional: true });
    }

    if (isMissing) {
      return renderAddSlotCard(key, slotLabel, { missing: true });
    }

    return renderAddSlotCard(key, slotLabel);
  };

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
            onClick={handleRegenerate}
            disabled={busy}
            className={secondaryCtaClass}
            data-testid={`week-day-regenerate-${day.day_of_week}`}
          >
            Regenerate this day
          </button>
        )}
      </div>

      {/* Day prefs near content */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 min-[768px]:grid-cols-3">
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
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 self-end pb-1">
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
        <p className="text-sm text-slate-400">
          This day is not planned. Mark it as planned in the week overview to edit an outfit.
        </p>
      )}

      {day.enabled && ungenerated && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Add wardrobe items to pin slots, then Generate outfits to fill the rest.
          </p>
          <div
            className="grid grid-cols-2 gap-2 min-[640px]:grid-cols-4"
            data-testid="week-outfit-slots"
          >
            {WEEK_PLAN_EDITOR_SLOTS.map(({ key, label: slotLabel, field }) =>
              renderEditorSlot(key, slotLabel, field, outfit)
            )}
          </div>
        </div>
      )}

      {day.enabled && outfit && !ungenerated && (
        <div className="grid grid-cols-1 gap-5 min-[900px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Outfit left */}
          <div className="space-y-3">
            <div
              className="grid grid-cols-2 gap-2 min-[640px]:grid-cols-4"
              data-testid="week-outfit-slots"
            >
              {WEEK_PLAN_EDITOR_SLOTS.map(({ key, label: slotLabel, field }) =>
                renderEditorSlot(key, slotLabel, field, outfit)
              )}
            </div>

            {showBlazer && outfit.blazer?.trim() && (
              <div className="grid grid-cols-2 gap-2 min-[640px]:grid-cols-4">
                <OutfitItem
                  categoryKey="blazer"
                  label="Blazer"
                  value={outfit.blazer}
                  outfit={outfit}
                  onChangeItem={(cat) =>
                    onChooseFromWardrobe([{ key: cat, label: 'Blazer' }])
                  }
                />
              </div>
            )}

            {filledOptional.length > 0 && (
              <div className="grid grid-cols-2 gap-2 min-[640px]:grid-cols-4">
                {filledOptional.map(({ key, label: slotLabel, value }) => (
                  <OutfitItem
                    key={key}
                    categoryKey={key}
                    label={slotLabel}
                    value={value}
                    outfit={outfit}
                    onChangeItem={(cat) =>
                      onChooseFromWardrobe([{ key: cat, label: slotLabel }])
                    }
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

          {/* Why + actions right */}
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
