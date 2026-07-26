import React from 'react';
import { secondaryCtaClass } from './weekPlanStyles';

export interface PlannerActionBarProps {
  busy: boolean;
  saving?: boolean;
  /** Neutral Save when primary CTA is Generate (prefs-only / not yet generated). */
  showSave?: boolean;
  onSave?: () => void;
  onBack: () => void;
  onClearPlan?: () => void;
}

const PlannerActionBar: React.FC<PlannerActionBarProps> = ({
  busy,
  saving = false,
  showSave = false,
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
      {showSave && onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className={secondaryCtaClass}
          data-testid="week-save-plan"
          aria-busy={saving}
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
      )}
      {onClearPlan && (
        <button
          type="button"
          onClick={() => {
            const ok = window.confirm(
              'Clear this week’s plan? A copy is kept under Plan history so you can load it later.'
            );
            if (ok) onClearPlan();
          }}
          disabled={busy}
          className="min-h-[44px] rounded-full border border-white/10 px-4 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:opacity-50"
          data-testid="week-clear-plan"
        >
          Clear plan
        </button>
      )}
    </div>
  </div>
);

export default PlannerActionBar;
