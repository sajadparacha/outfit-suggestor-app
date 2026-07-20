import React from 'react';
import { WeekPlan } from '../../../models/WeekPlanModels';
import { FILTER_OPTIONS } from '../../../utils/constants';
import { plannerSurface, primaryCtaClass, selectClass } from './weekPlanStyles';

export interface PlannerSettingsProps {
  plan: WeekPlan;
  busy: boolean;
  enabledDayCount: number;
  generating: boolean;
  onSetSharedSeason: (season: string) => void;
  onSetReminderTime: (time: string) => void;
  onGenerateWeek: () => void;
}

const PlannerSettings: React.FC<PlannerSettingsProps> = ({
  plan,
  busy,
  enabledDayCount,
  generating,
  onSetSharedSeason,
  onSetReminderTime,
  onGenerateWeek,
}) => {
  const seasonLabel =
    FILTER_OPTIONS.seasons.find((s) => s.value === plan.shared_season)?.label ??
    plan.shared_season;

  return (
    <section
      className={`${plannerSurface} space-y-4 p-4 min-[768px]:p-5`}
      aria-label="Week settings"
      data-testid="week-planner-settings"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[9rem] flex-1">
          <label
            htmlFor="week-shared-season"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Season
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
          <p className="mt-1 hidden text-xs text-slate-500 min-[768px]:block" aria-hidden>
            {seasonLabel}
          </p>
        </div>
        <div className="min-w-[9rem] flex-1">
          <label
            htmlFor="week-reminder-time"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Reminder
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
          <p className="mt-1 text-xs text-slate-500">Timezone: {plan.timezone}</p>
        </div>
        <button
          type="button"
          onClick={onGenerateWeek}
          disabled={busy || enabledDayCount === 0}
          className={`${primaryCtaClass} w-full min-[480px]:w-auto`}
          data-testid="week-generate-week"
        >
          {generating ? 'Generating…' : 'Generate week'}
        </button>
      </div>
    </section>
  );
};

export default PlannerSettings;
