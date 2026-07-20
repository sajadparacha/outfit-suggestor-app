/**
 * Week Outfit Planner — plan outfits for Mon–Sun with occasions and reminder time.
 */

import React from 'react';
import {
  WeekPlan,
  WeekPlanHistoryItem,
  WeekPlanOutfit,
  WeekPlanToday,
  WEEK_DAY_LABELS,
  DayOfWeek,
} from '../models/WeekPlanModels';
import { OutfitSuggestion } from '../models/OutfitModels';
import { FILTER_OPTIONS } from '../utils/constants';
import { MAIN_FLOW_UX_COPY } from '../utils/mainFlowUxCopy';
import { parseOutfitItemCardText } from '../utils/outfitItemCardText';
import { reasoningToBullets } from '../utils/reasoningBullets';
import {
  resolveOutfitItemThumbnail,
  type OutfitCategoryKey,
} from '../utils/outfitItemThumbnail';
import OutfitItemCard from './components/suggestion/OutfitItemCard';
import WeekPlanOutfitAdminPanel from './components/weekPlan/WeekPlanOutfitAdminPanel';

export interface WeekPlannerProps {
  plan: WeekPlan | null;
  today: WeekPlanToday | null;
  history?: WeekPlanHistoryItem[];
  loading: boolean;
  generating: boolean;
  saving: boolean;
  restoring?: boolean;
  error: string | null;
  message: string | null;
  enabledDayCount: number;
  onUpdateDay: (
    dayOfWeek: number,
    patch: {
      enabled?: boolean;
      occasion?: string;
      style?: string;
      use_wardrobe_only?: boolean;
    }
  ) => void;
  onSetReminderTime: (time: string) => void;
  onSetSharedStyle: (style: string) => void;
  onSetSharedSeason: (season: string) => void;
  onSave: () => void;
  onGenerateWeek: () => void;
  onRegenerateDay: (dayOfWeek: number) => void;
  onClearPlan?: () => void;
  onRestoreHistory?: (historyId: number) => void;
  isAdmin?: boolean;
  showAiPromptResponse?: boolean;
}

const selectClass =
  'w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-brand-blue/50 focus:outline-none focus:ring-1 focus:ring-brand-blue/40';

function weekOutfitAsSuggestion(outfit: WeekPlanOutfit): OutfitSuggestion {
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

function outfitPreviewThumbs(outfit: WeekPlanOutfit | null | undefined): string[] {
  if (!outfit?.matching_wardrobe_items) return [];
  const items = outfit.matching_wardrobe_items;
  const thumbs: string[] = [];
  for (const slot of ['shirt', 'trouser', 'blazer', 'shoes', 'belt'] as const) {
    const list = items[slot];
    if (list?.[0]?.image_data) {
      thumbs.push(list[0].image_data);
    }
  }
  return thumbs.slice(0, 4);
}

const CORE_SLOTS: Array<{ key: OutfitCategoryKey; label: string; field: keyof WeekPlanOutfit }> = [
  { key: 'shirt', label: 'Shirt', field: 'shirt' },
  { key: 'trouser', label: 'Trousers', field: 'trouser' },
  { key: 'blazer', label: 'Blazer', field: 'blazer' },
  { key: 'shoes', label: 'Shoes', field: 'shoes' },
  { key: 'belt', label: 'Belt', field: 'belt' },
];

const OPTIONAL_SLOTS: Array<{ key: OutfitCategoryKey; label: string; field: keyof WeekPlanOutfit }> = [
  { key: 'sweater', label: MAIN_FLOW_UX_COPY.layerLabel, field: 'sweater' },
  { key: 'outerwear', label: MAIN_FLOW_UX_COPY.outerwearLabel, field: 'outerwear' },
  { key: 'tie', label: MAIN_FLOW_UX_COPY.tieLabel, field: 'tie' },
];

const WeekOutfitDetails: React.FC<{
  outfit: WeekPlanOutfit;
  testIdPrefix: string;
}> = ({ outfit, testIdPrefix }) => {
  const suggestion = weekOutfitAsSuggestion(outfit);
  const reasoningBullets = reasoningToBullets(outfit.reasoning || '');

  const renderCard = (key: OutfitCategoryKey, label: string, value: string) => {
    const thumb = resolveOutfitItemThumbnail(suggestion, key);
    const tagLabel =
      thumb.tag === 'wardrobe' ? MAIN_FLOW_UX_COPY.tagFromWardrobe : MAIN_FLOW_UX_COPY.tagAiSuggested;
    const tagTone = thumb.tag === 'ai' ? 'ai' : 'wardrobe';
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
        legacyHint={thumb.tag === 'ai' ? '(suggested by AI)' : undefined}
      />
    );
  };

  const coreCards = CORE_SLOTS.flatMap(({ key, label, field }) => {
    const value = outfit[field];
    if (typeof value !== 'string' || !value.trim()) return [];
    return [renderCard(key, label, value)];
  });

  const optionalCards = OPTIONAL_SLOTS.flatMap(({ key, label, field }) => {
    const value = outfit[field];
    if (typeof value !== 'string' || !value.trim()) return [];
    return [renderCard(key, label, value)];
  });

  return (
    <details className="group mt-3" data-testid={`${testIdPrefix}-details`}>
      <summary
        className="cursor-pointer list-none text-sm text-slate-300 [&::-webkit-details-marker]:hidden"
        data-testid={testIdPrefix}
      >
        <span className="inline-flex items-center gap-2">
          <span className="text-slate-500 transition-transform group-open:rotate-180" aria-hidden>
            ▼
          </span>
          <span>{outfit.summary || 'Outfit details'}</span>
        </span>
      </summary>
      <div
        className="mt-3 space-y-4 rounded-xl border border-white/10 bg-slate-950/50 p-3"
        data-testid={`${testIdPrefix}-expanded`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{coreCards}</div>
        {optionalCards.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{optionalCards}</div>
        )}
        {reasoningBullets.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
              {MAIN_FLOW_UX_COPY.whyThisWorks}
            </h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-200">
              {reasoningBullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
};

const TodaySection: React.FC<{ today: WeekPlanToday | null }> = ({ today }) => {
  if (!today) {
    return (
      <section
        className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
        aria-label="Today"
      >
        <h2 className="text-lg font-semibold text-white">Today</h2>
        <p className="mt-2 text-sm text-slate-400">
          Enable days and generate outfits to see today’s look here.
        </p>
      </section>
    );
  }

  const dayLabel =
    WEEK_DAY_LABELS[today.day_of_week as DayOfWeek] ?? `Day ${today.day_of_week}`;
  const thumbs = outfitPreviewThumbs(today.outfit);
  const occasion = today.occasion;

  return (
    <section
      className="rounded-2xl border border-brand-blue/20 bg-gradient-to-br from-brand-blue/10 via-white/5 to-brand-purple/10 p-5 backdrop-blur shadow-xl"
      aria-label="Today"
      data-testid="week-today-section"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue/90">
            Today · {dayLabel}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            {today.enabled && occasion
              ? occasion.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : 'No outfit planned'}
          </h2>
          {today.enabled && today.outfit ? (
            <WeekOutfitDetails outfit={today.outfit} testIdPrefix="week-today-summary" />
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              {today.enabled
                ? 'Generate this week to fill in today’s outfit.'
                : 'Today is not enabled in your week plan.'}
            </p>
          )}
        </div>
        {thumbs.length > 0 && (
          <div className="flex gap-2" aria-label="Outfit preview">
            {thumbs.map((src, i) => (
              <img
                key={i}
                src={src.startsWith('data:') ? src : `data:image/jpeg;base64,${src}`}
                alt=""
                className="h-14 w-14 rounded-xl object-cover border border-white/10"
              />
            ))}
          </div>
        )}
        {today.outfit?.model_image && thumbs.length === 0 && (
          <img
            src={`data:image/png;base64,${today.outfit.model_image}`}
            alt="Today's outfit"
            className="h-20 w-16 rounded-xl object-cover border border-white/10"
          />
        )}
      </div>
    </section>
  );
};

const WeekPlanner: React.FC<WeekPlannerProps> = ({
  plan,
  today,
  history = [],
  loading,
  generating,
  saving,
  restoring = false,
  error,
  message,
  enabledDayCount,
  onUpdateDay,
  onSetReminderTime,
  onSetSharedStyle,
  onSetSharedSeason,
  onSave,
  onGenerateWeek,
  onRegenerateDay,
  onClearPlan,
  onRestoreHistory,
  isAdmin = false,
  showAiPromptResponse = false,
}) => {
  if (loading && !plan) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center" role="status">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
        <p className="mt-4 text-slate-300">Loading your week…</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-slate-300">Unable to load your week plan.</p>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>
    );
  }

  const busy = loading || generating || saving || restoring;
  const showAdminDiagnostics = isAdmin && showAiPromptResponse;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10" data-testid="week-planner">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Week Outfit Planner</h1>
        <p className="mt-2 text-sm text-slate-300">
          Plan outfits for the days you need them. Daily wake-up reminders are available on iOS;
          here you’ll see Today’s look in the app.
        </p>
      </header>

      <TodaySection today={today} />

      {error && (
        <div
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {message && !error && (
        <div
          className="rounded-xl border border-brand-blue/30 bg-brand-blue/10 px-4 py-3 text-sm text-slate-200"
          role="status"
          data-testid="week-plan-message"
        >
          {message}
        </div>
      )}

      {(generating || saving || restoring) && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300" role="status">
          {generating
            ? 'Generating outfits…'
            : restoring
              ? 'Loading previous plan…'
              : 'Saving plan…'}
        </div>
      )}

      {/* Shared controls — season + reminder only; occasion/style are per day */}
      <section
        className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur space-y-4"
        aria-label="Week settings"
      >
        <h2 className="text-lg font-semibold text-white">Week settings</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="week-shared-season" className="mb-1.5 block text-sm font-medium text-slate-200">
              Shared season
            </label>
            <select
              id="week-shared-season"
              value={plan.shared_season}
              onChange={(e) => onSetSharedSeason(e.target.value)}
              className={selectClass}
              disabled={busy}
              aria-label="Shared season"
            >
              {FILTER_OPTIONS.seasons.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="week-reminder-time" className="mb-1.5 block text-sm font-medium text-slate-200">
              Reminder time
            </label>
            <input
              id="week-reminder-time"
              type="time"
              value={plan.reminder_time}
              onChange={(e) => onSetReminderTime(e.target.value)}
              className={selectClass}
              disabled={busy}
              aria-label="Reminder time"
            />
            <p className="mt-1 text-xs text-slate-500">
              Timezone: {plan.timezone} (from your device on save)
            </p>
          </div>
        </div>
      </section>

      {/* Day rows */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur" aria-label="Days">
        <h2 className="mb-4 text-lg font-semibold text-white">Days</h2>
        {enabledDayCount === 0 && (
          <p className="mb-4 text-sm text-slate-400" data-testid="week-empty-days">
            Turn on the days you want to plan.
          </p>
        )}
        <ul className="space-y-3">
          {plan.days.map((day) => {
            const label = WEEK_DAY_LABELS[day.day_of_week as DayOfWeek] ?? `Day ${day.day_of_week}`;
            const useWardrobe = day.use_wardrobe_only !== false;
            return (
              <li
                key={day.day_of_week}
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
                data-testid={`week-day-${day.day_of_week}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex min-w-[7rem] cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) =>
                        onUpdateDay(day.day_of_week, { enabled: e.target.checked })
                      }
                      disabled={busy}
                      aria-label={`Enable ${label}`}
                      className="h-4 w-4 rounded border-white/20 bg-slate-800 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-sm font-medium text-white">{label}</span>
                  </label>
                  <select
                    value={day.occasion}
                    onChange={(e) =>
                      onUpdateDay(day.day_of_week, { occasion: e.target.value })
                    }
                    disabled={busy || !day.enabled}
                    className={`${selectClass} max-w-[12rem] flex-1`}
                    aria-label={`${label} occasion`}
                  >
                    {FILTER_OPTIONS.occasions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={day.style || 'classic'}
                    onChange={(e) =>
                      onUpdateDay(day.day_of_week, { style: e.target.value })
                    }
                    disabled={busy || !day.enabled}
                    className={`${selectClass} max-w-[12rem] flex-1`}
                    aria-label={`${label} style`}
                  >
                    {FILTER_OPTIONS.styles.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {day.enabled && (
                    <>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useWardrobe}
                          onChange={(e) =>
                            onUpdateDay(day.day_of_week, {
                              use_wardrobe_only: e.target.checked,
                            })
                          }
                          disabled={busy}
                          aria-label={`${label} use wardrobe`}
                          data-testid={`week-day-wardrobe-${day.day_of_week}`}
                          className="h-4 w-4 rounded border-white/20 bg-slate-800 text-brand-blue focus:ring-brand-blue"
                        />
                        <span className="text-xs font-medium text-slate-300">Use wardrobe</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => onRegenerateDay(day.day_of_week)}
                        disabled={busy}
                        className="min-h-[36px] rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        Regenerate
                      </button>
                    </>
                  )}
                </div>
                {day.enabled && day.outfit && (
                  <>
                    <WeekOutfitDetails
                      outfit={day.outfit}
                      testIdPrefix={`week-day-summary-${day.day_of_week}`}
                    />
                    {showAdminDiagnostics && (
                      <WeekPlanOutfitAdminPanel
                        dayLabel={label}
                        outfit={day.outfit}
                      />
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onGenerateWeek}
          disabled={busy || enabledDayCount === 0}
          className="btn-brand min-h-[44px] rounded-full px-6 py-2.5 font-semibold disabled:opacity-50"
        >
          Generate week
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="min-h-[44px] rounded-full border border-white/15 bg-white/10 px-6 py-2.5 font-medium text-slate-200 transition hover:bg-white/20 disabled:opacity-50"
        >
          Save plan
        </button>
        {onClearPlan && (
          <button
            type="button"
            onClick={() => {
              const ok = window.confirm(
                "Clear this week’s plan from Today? A copy is kept under Previous plans so you can Load it later."
              );
              if (ok) onClearPlan();
            }}
            disabled={busy}
            className="min-h-[44px] rounded-full border border-white/10 px-4 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 disabled:opacity-50"
            data-testid="week-clear-plan"
          >
            Clear plan
          </button>
        )}
      </div>

      {/* Previous plans */}
      <section
        className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
        aria-label="Previous plans"
        data-testid="week-plan-history"
      >
        <h2 className="text-lg font-semibold text-white">Previous plans</h2>
        <p className="mt-1 text-sm text-slate-400">
          Backups when you clear the week or regenerate over existing outfits. Save plan
          updates your current week—it loads automatically when you return.
        </p>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400" data-testid="week-plan-history-empty">
            No previous plans yet. Clear plan or regenerate after outfits exist to keep a copy
            here.
          </p>
        ) : (
          <ul className="mt-4 space-y-2" data-testid="week-plan-history-list">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
                data-testid={`week-plan-history-item-${item.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.enabled_day_count} day{item.enabled_day_count === 1 ? '' : 's'}
                    {item.created_at ? ` · ${item.created_at}` : ''}
                  </p>
                </div>
                {onRestoreHistory && (
                  <button
                    type="button"
                    onClick={() => onRestoreHistory(item.id)}
                    disabled={busy}
                    className="min-h-[36px] rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                    data-testid={`week-plan-history-load-${item.id}`}
                  >
                    Load
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default WeekPlanner;
