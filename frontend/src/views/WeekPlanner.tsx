/**
 * Week Outfit Planner — responsive redesign (desktop / tablet / phone).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DayOfWeek,
  MissingOutfitSlot,
  WeekPlan,
  WeekPlanHistoryItem,
  WeekPlanToday,
  WEEK_DAY_LABELS,
  formatOccasionLabel,
} from '../models/WeekPlanModels';
import { ROUTES, wardrobePath } from '../navigation/routes';
import WeekPlannerHeader from './components/weekPlan/WeekPlannerHeader';
import PlannerSettings from './components/weekPlan/PlannerSettings';
import WeekDaySelector from './components/weekPlan/WeekDaySelector';
import OutfitPreview from './components/weekPlan/OutfitPreview';
import PlannerActionBar from './components/weekPlan/PlannerActionBar';
import { plannerSurface } from './components/weekPlan/weekPlanStyles';

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

const TodaySection: React.FC<{ today: WeekPlanToday | null }> = ({ today }) => {
  if (!today) {
    return (
      <section className={`${plannerSurface} p-4`} aria-label="Today">
        <h2 className="text-lg font-semibold text-white">Today</h2>
        <p className="mt-2 text-sm text-slate-400">
          Enable days and generate outfits to see today&apos;s look here.
        </p>
      </section>
    );
  }

  const dayLabel =
    WEEK_DAY_LABELS[today.day_of_week as DayOfWeek] ?? `Day ${today.day_of_week}`;
  const occasion = formatOccasionLabel(today.occasion ?? undefined);

  return (
    <section
      className="rounded-xl border border-brand-blue/20 bg-gradient-to-br from-brand-blue/10 via-[#151B2D] to-brand-purple/10 p-4 shadow-xl min-[768px]:p-5"
      aria-label="Today"
      data-testid="week-today-section"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue/90">
        Today · {dayLabel}
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">
        {today.enabled && occasion ? occasion : 'No outfit planned'}
      </h2>
      {today.enabled && today.outfit?.summary ? (
        <p className="mt-2 text-sm text-slate-300" data-testid="week-today-summary">
          {today.outfit.summary}
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-400">
          {today.enabled
            ? 'Generate this week to fill in today’s outfit.'
            : 'Today is not enabled in your week plan.'}
        </p>
      )}
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
  onSetSharedStyle: _onSetSharedStyle,
  onSetSharedSeason,
  onSave,
  onGenerateWeek,
  onRegenerateDay,
  onClearPlan,
  onRestoreHistory,
  isAdmin = false,
  showAiPromptResponse = false,
}) => {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(0);
  /** Local dismiss of missing-item UI per day (Continue without). */
  const [dismissedMissingDays, setDismissedMissingDays] = useState<Set<number>>(
    () => new Set()
  );

  useEffect(() => {
    if (!plan) return;
    if (today?.day_of_week != null) {
      setSelectedDay(today.day_of_week);
      return;
    }
    const firstEnabled = plan.days.find((d) => d.enabled);
    if (firstEnabled) setSelectedDay(firstEnabled.day_of_week);
  }, [plan?.days?.length, today?.day_of_week]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = loading || generating || saving || restoring;
  const showAdminDiagnostics = isAdmin && showAiPromptResponse;

  const selectedDayPlan = useMemo(
    () => plan?.days.find((d) => d.day_of_week === selectedDay) ?? plan?.days[0] ?? null,
    [plan, selectedDay]
  );

  const handleChooseFromWardrobe = (slots: MissingOutfitSlot[]) => {
    const category = slots[0]?.key;
    navigate(wardrobePath(category));
  };

  const handleFindAlternative = (dayOfWeek: number) => {
    onRegenerateDay(dayOfWeek);
  };

  const handleContinueWithout = (dayOfWeek: number) => {
    setDismissedMissingDays((prev) => new Set(prev).add(dayOfWeek));
  };

  if (loading && !plan) {
    return (
      <div className="mx-auto max-w-6xl py-16 text-center" role="status">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
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
      className="mx-auto max-w-6xl space-y-5 bg-[#0A0E1A] pb-24 text-slate-100 min-[768px]:pb-10"
      data-testid="week-planner"
    >
      <WeekPlannerHeader />

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
        <div
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"
          role="status"
        >
          {generating
            ? 'Generating outfits…'
            : restoring
              ? 'Loading previous plan…'
              : 'Saving plan…'}
        </div>
      )}

      <PlannerSettings
        plan={plan}
        busy={busy}
        enabledDayCount={enabledDayCount}
        generating={generating}
        onSetSharedSeason={onSetSharedSeason}
        onSetReminderTime={onSetReminderTime}
        onGenerateWeek={onGenerateWeek}
      />

      <WeekDaySelector
        days={plan.days}
        selectedDay={selectedDay}
        busy={busy}
        enabledDayCount={enabledDayCount}
        onSelectDay={setSelectedDay}
        onUpdateDay={onUpdateDay}
      />

      {selectedDayPlan && (
        <OutfitPreview
          day={selectedDayPlan}
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
        onSave={onSave}
        onBack={() => navigate(ROUTES.MAIN)}
        onClearPlan={onClearPlan}
      />

      <section
        className={`${plannerSurface} p-4 min-[768px]:p-5`}
        aria-label="Previous plans"
        data-testid="week-plan-history"
      >
        <h2 className="text-lg font-semibold text-white">Previous plans</h2>
        <p className="mt-1 text-sm text-slate-400">
          Backups when you clear the week or regenerate over existing outfits. Save weekly plan
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0A0E1A]/50 px-4 py-3"
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
