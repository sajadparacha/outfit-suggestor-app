import React, { useState } from 'react';
import { WeekPlan } from '../../../models/WeekPlanModels';
import { FILTER_OPTIONS } from '../../../utils/constants';
import { plannerSurface, selectClass } from './weekPlanStyles';

export interface PlannerSettingsProps {
  plan: WeekPlan;
  busy: boolean;
  enabledDayCount: number;
  generating?: boolean;
  onSetSharedSeason: (season: string) => void;
  /** @deprecated Generate lives on the page header primary CTA */
  onGenerateWeek?: () => void;
}

const PlannerSettings: React.FC<PlannerSettingsProps> = ({
  plan,
  busy,
  onSetSharedSeason,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <section
      className={`${plannerSurface} space-y-3 p-3 min-[768px]:p-4`}
      aria-label="Week settings"
      data-testid="week-planner-settings"
    >
      <div className="min-w-0 w-full">
        <label
          htmlFor="week-shared-season"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-300"
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
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="min-h-[44px] text-left text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-300 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
          aria-expanded={advancedOpen}
          data-testid="week-planner-advanced-toggle"
        >
          {advancedOpen ? 'Hide advanced preferences' : 'Advanced preferences'}
        </button>
        {advancedOpen && (
          <p className="mt-2 text-xs text-slate-500" data-testid="week-planner-advanced">
            Per-day occasion, style, and wardrobe options are in the selected-day editor below.
          </p>
        )}
      </div>
    </section>
  );
};

export default PlannerSettings;
