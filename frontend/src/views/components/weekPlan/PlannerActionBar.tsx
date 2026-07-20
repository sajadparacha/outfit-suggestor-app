import React from 'react';
import { primaryCtaClass, secondaryCtaClass } from './weekPlanStyles';

export interface PlannerActionBarProps {
  busy: boolean;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  onClearPlan?: () => void;
}

const PlannerActionBar: React.FC<PlannerActionBarProps> = ({
  busy,
  saving,
  onSave,
  onBack,
  onClearPlan,
}) => (
  <div
    className="sticky bottom-0 z-20 -mx-4 border-t border-white/10 bg-[#0A0E1A]/95 px-4 py-3 backdrop-blur min-[768px]:static min-[768px]:mx-0 min-[768px]:border-0 min-[768px]:bg-transparent min-[768px]:p-0 min-[768px]:backdrop-blur-none"
    data-testid="week-planner-action-bar"
  >
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className={secondaryCtaClass}
        data-testid="week-planner-back"
      >
        Back
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className={`${primaryCtaClass} flex-1 min-[480px]:flex-none`}
        data-testid="week-save-plan"
        aria-busy={saving}
      >
        {saving ? 'Saving…' : 'Save weekly plan'}
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
  </div>
);

export default PlannerActionBar;
