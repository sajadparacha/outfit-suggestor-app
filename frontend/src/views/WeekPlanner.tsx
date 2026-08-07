/**
 * Week Outfit Planner — UX hierarchy redesign (header → controls → week → day → secondary).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DayOfWeek,
  WeekPlan,
  WeekPlanHistoryItem,
  WeekPlanPresetItem,
  WeekPlanToday,
  WEEK_DAY_LABELS,
  formatLocalizedDateTime,
  formatOccasionLabel,
  planHasGeneratedOutfits,
} from '../models/WeekPlanModels';
import { ROUTES, wardrobePickPath } from '../navigation/routes';
import WeekPlannerHeader from './components/weekPlan/WeekPlannerHeader';
import PlannerSettings from './components/weekPlan/PlannerSettings';
import WeekDaySelector from './components/weekPlan/WeekDaySelector';
import OutfitPreview from './components/weekPlan/OutfitPreview';
import PlannerActionBar from './components/weekPlan/PlannerActionBar';
import WeekPlanPresets from './components/weekPlan/WeekPlanPresets';
import { plannerSurface } from './components/weekPlan/weekPlanStyles';

const HISTORY_RECENT_LIMIT = 3;
const TOAST_MS = 4500;

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
  isDirty?: boolean;
  lastSavedAt?: Date | null;
  hasGeneratedOutfits?: boolean;
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
  onDismissMessage?: () => void;
  presets?: WeekPlanPresetItem[];
  presetCount?: number;
  presetLimit?: number;
  presetAtLimit?: boolean;
  presetBusy?: boolean;
  onSavePresetAs?: (name: string) => void | Promise<void>;
  onUpdatePreset?: (presetId: number) => void | Promise<void>;
  onRenamePreset?: (presetId: number, name: string) => void | Promise<void>;
  onDeletePreset?: (presetId: number) => void | Promise<void>;
  onLoadPreset?: (presetId: number) => void | Promise<void>;
  isAdmin?: boolean;
  showAiPromptResponse?: boolean;
}

const TodaySection: React.FC<{ today: WeekPlanToday | null }> = ({ today }) => {
  if (!today) return null;

  const dayLabel =
    WEEK_DAY_LABELS[today.day_of_week as DayOfWeek] ?? `Day ${today.day_of_week}`;
  const occasion = formatOccasionLabel(today.occasion ?? undefined);
  const summary =
    today.enabled && today.outfit?.summary
      ? today.outfit.summary
      : today.enabled
        ? 'Generate this week to fill in today’s outfit.'
        : 'Today is not planned in your week.';

  return (
    <section
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-[#151B2D]/70 px-4 py-3"
      aria-label="Today"
      data-testid="week-today-section"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
        Today · {dayLabel}
      </p>
      <h2 className="text-sm font-semibold text-white">
        {today.enabled && occasion ? occasion : 'No outfit planned'}
      </h2>
      <p className="w-full text-sm text-slate-300 min-[640px]:w-auto" data-testid="week-today-summary">
        {summary}
      </p>
    </section>
  );
};

const ToastBanner: React.FC<{
  message: string;
  onDismiss: () => void;
}> = ({ message, onDismiss }) => {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, TOAST_MS);
    return () => window.clearTimeout(id);
  }, [message, onDismiss]);

  return (
    <div
      className="fixed bottom-20 left-1/2 z-40 w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-xl border border-brand-blue/30 bg-[#151B2D]/95 px-4 py-3 text-sm text-slate-100 shadow-xl backdrop-blur min-[768px]:bottom-6"
      role="status"
      data-testid="week-plan-message"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
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
  isDirty = false,
  lastSavedAt = null,
  hasGeneratedOutfits: hasGeneratedProp,
  enabledDayCount,
  onUpdateDay,
  onSetReminderTime,
  onSetSharedStyle: _onSetSharedStyle,
  onSetSharedSeason,
  onSave,
  onGenerateWeek,
  onRegenerateDay,
  onClearPlan,
  onRestoreHistory,
  onDismissMessage,
  presets = [],
  presetCount = 0,
  presetLimit = 0,
  presetAtLimit = false,
  presetBusy = false,
  onSavePresetAs,
  onUpdatePreset,
  onRenamePreset,
  onDeletePreset,
  onLoadPreset,
  isAdmin = false,
  showAiPromptResponse = false,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dayFromQuery = searchParams.get('day');
  const [selectedDay, setSelectedDay] = useState(0);
  const [dismissedMissingDays, setDismissedMissingDays] = useState<Set<number>>(
    () => new Set()
  );
  const [historyShowAll, setHistoryShowAll] = useState(false);
  const [historyMenuId, setHistoryMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (dayFromQuery != null) {
      const d = Number(dayFromQuery);
      if (Number.isInteger(d) && d >= 0 && d <= 6) {
        setSelectedDay(d);
        return;
      }
    }
    if (!plan) return;
    if (today?.day_of_week != null) {
      setSelectedDay(today.day_of_week);
      return;
    }
    const firstEnabled = plan.days.find((d) => d.enabled);
    if (firstEnabled) setSelectedDay(firstEnabled.day_of_week);
  }, [plan?.days?.length, today?.day_of_week, dayFromQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const busy = loading || generating || saving || restoring || presetBusy;
  const showAdminDiagnostics = isAdmin && showAiPromptResponse;
  const hasGeneratedOutfits =
    hasGeneratedProp ?? (plan ? planHasGeneratedOutfits(plan) : false);
  const saveIsPrimary = hasGeneratedOutfits && isDirty;

  const selectedDayPlan = useMemo(
    () => plan?.days.find((d) => d.day_of_week === selectedDay) ?? plan?.days[0] ?? null,
    [plan, selectedDay]
  );

  const visibleHistory = historyShowAll
    ? history
    : history.slice(0, HISTORY_RECENT_LIMIT);

  const handlePrimaryAction = () => {
    if (saveIsPrimary) {
      onSave();
      return;
    }
    if (hasGeneratedOutfits) {
      const ok = window.confirm(
        'Generate outfits for all planned days? Existing outfits will be replaced.'
      );
      if (!ok) return;
    }
    onGenerateWeek();
  };

  const handleChooseFromWardrobe = (slots: Array<{ key: string; label: string }>) => {
    const slot = slots[0];
    if (!slot) return;
    navigate(
      wardrobePickPath({
        dayOfWeek: selectedDay,
        slotKey: slot.key,
        category: slot.key,
      })
    );
  };

  const handleFindAlternative = (dayOfWeek: number) => {
    onRegenerateDay(dayOfWeek);
  };

  const handleContinueWithout = (dayOfWeek: number) => {
    setDismissedMissingDays((prev) => new Set(prev).add(dayOfWeek));
  };

  const dismissMessage = () => {
    onDismissMessage?.();
  };

  if (loading && !plan) {
    return (
      <div className="mx-auto max-w-6xl py-16 text-center" role="status">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-blue border-t-transparent motion-reduce:animate-none" />
        <p className="mt-4 text-slate-300">Loading your week…</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-6xl rounded-xl border border-white/10 bg-[#151B2D] p-8 text-center">
        <p className="text-slate-300">Unable to load your week plan.</p>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-6xl space-y-4 overflow-x-hidden bg-[#0A0E1A] pb-24 text-slate-100 min-[768px]:space-y-5 min-[768px]:pb-10"
      data-testid="week-planner"
    >
      <WeekPlannerHeader
        timezone={plan.timezone}
        generating={generating}
        saving={saving}
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        hasGeneratedOutfits={hasGeneratedOutfits}
        enabledDayCount={enabledDayCount}
        busy={busy}
        onPrimaryAction={handlePrimaryAction}
        onSecondaryGenerate={
          saveIsPrimary
            ? () => {
                const ok = window.confirm(
                  'Generate outfits for all planned days? Existing outfits will be replaced.'
                );
                if (ok) onGenerateWeek();
              }
            : undefined
        }
      />

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
        <ToastBanner message={message} onDismiss={dismissMessage} />
      )}

      <PlannerSettings
        plan={plan}
        busy={busy}
        enabledDayCount={enabledDayCount}
        generating={generating}
        onSetSharedSeason={onSetSharedSeason}
        onSetReminderTime={onSetReminderTime}
      />

      {!hasGeneratedOutfits && (
        <p
          className="text-sm text-slate-400"
          data-testid="week-planner-empty-tip"
        >
          Generate outfits for your week. Add wardrobe items first for closer matches.
        </p>
      )}

      <WeekDaySelector
        days={plan.days}
        selectedDay={selectedDay}
        busy={busy}
        enabledDayCount={enabledDayCount}
        generating={generating}
        timezone={plan.timezone}
        onSelectDay={setSelectedDay}
        onUpdateDay={onUpdateDay}
      />

      {selectedDayPlan && (
        <OutfitPreview
          day={selectedDayPlan}
          season={plan.shared_season}
          busy={busy}
          showAdminDiagnostics={showAdminDiagnostics}
          dismissedMissing={dismissedMissingDays.has(selectedDayPlan.day_of_week)}
          onUpdateDay={onUpdateDay}
          onRegenerateDay={onRegenerateDay}
          onChooseFromWardrobe={handleChooseFromWardrobe}
          onFindAlternative={handleFindAlternative}
          onContinueWithout={handleContinueWithout}
        />
      )}

      <PlannerActionBar
        busy={busy}
        saving={saving}
        showSave={!saveIsPrimary}
        onSave={onSave}
        onBack={() => navigate(ROUTES.MAIN)}
        onClearPlan={onClearPlan}
      />

      {onSavePresetAs && onUpdatePreset && onRenamePreset && onDeletePreset && onLoadPreset && (
        <WeekPlanPresets
          plan={plan}
          presets={presets}
          presetCount={presetCount}
          presetLimit={presetLimit}
          presetAtLimit={presetAtLimit}
          busy={busy}
          presetBusy={presetBusy}
          onSaveAs={onSavePresetAs}
          onUpdate={onUpdatePreset}
          onRename={onRenamePreset}
          onDelete={onDeletePreset}
          onLoad={onLoadPreset}
        />
      )}

      <section
        className={`${plannerSurface} p-4 min-[768px]:p-5`}
        aria-label="Plan history"
        data-testid="week-plan-history"
      >
        <details className="group" data-testid="week-plan-history-disclosure">
          <summary className="flex min-h-[44px] cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-white">Plan history</h2>
              <p className="mt-1 text-sm text-slate-400">
                Past weekly outfits. Load restores a backup without adding a new row.
              </p>
            </div>
            <span className="text-slate-500 transition group-open:rotate-180" aria-hidden>
              ▼
            </span>
          </summary>

          <div className="mt-4 border-t border-white/5 pt-4">
            {history.length === 0 ? (
              <p className="text-sm text-slate-400" data-testid="week-plan-history-empty">
                No plan history yet. Clear plan or regenerate after outfits exist to keep a copy
                here.
              </p>
            ) : (
              <>
                <ul className="space-y-2" data-testid="week-plan-history-list">
                  {visibleHistory.map((item) => {
                    const when = formatLocalizedDateTime(item.created_at);
                    return (
                      <li
                        key={item.id}
                        className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0A0E1A]/50 px-4 py-3"
                        data-testid={`week-plan-history-item-${item.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.enabled_day_count} day
                            {item.enabled_day_count === 1 ? '' : 's'}
                            {when ? ` · ${when}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {onRestoreHistory && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isDirty || hasGeneratedOutfits) {
                                  const ok = window.confirm(
                                    'Load this plan? Unsaved changes to the current week may be lost.'
                                  );
                                  if (!ok) return;
                                }
                                onRestoreHistory(item.id);
                              }}
                              disabled={busy}
                              className="min-h-[44px] rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                              data-testid={`week-plan-history-load-${item.id}`}
                            >
                              Load
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setHistoryMenuId((id) => (id === item.id ? null : item.id))
                            }
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/10"
                            aria-label={`More actions for ${item.label}`}
                            aria-expanded={historyMenuId === item.id}
                            data-testid={`week-plan-history-menu-${item.id}`}
                          >
                            ⋯
                          </button>
                          {historyMenuId === item.id && onRestoreHistory && (
                            <div
                              className="absolute right-4 top-14 z-10 min-w-[10rem] space-y-1 rounded-xl border border-white/10 bg-[#151B2D] p-2 shadow-xl"
                              role="menu"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setHistoryMenuId(null);
                                  if (isDirty || hasGeneratedOutfits) {
                                    const ok = window.confirm(
                                      'Load this plan? Unsaved changes to the current week may be lost.'
                                    );
                                    if (!ok) return;
                                  }
                                  onRestoreHistory(item.id);
                                }}
                                disabled={busy}
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
                              >
                                Load
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {history.length > HISTORY_RECENT_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setHistoryShowAll((v) => !v)}
                    className="mt-3 min-h-[44px] text-sm font-medium text-slate-300 underline-offset-2 hover:underline"
                    data-testid="week-plan-history-view-all"
                  >
                    {historyShowAll ? 'Show less' : 'View all'}
                  </button>
                )}
              </>
            )}
          </div>
        </details>
      </section>
    </div>
  );
};

export default WeekPlanner;
