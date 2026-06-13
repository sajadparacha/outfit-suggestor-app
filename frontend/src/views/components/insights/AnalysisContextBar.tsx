import React from 'react';
import { WardrobeInsightContext } from '../../../models/WardrobeInsightResult';
import { prettyLabel } from '../../../utils/insightsHelpers';

interface AnalysisContextBarProps {
  context: WardrobeInsightContext;
  onChangePreferences: () => void;
}

const AnalysisContextBar: React.FC<AnalysisContextBarProps> = ({ context, onChangePreferences }) => (
  <div
    className="rounded-2xl border border-white/10 bg-slate-900/50 p-4"
    data-testid="analysis-context-bar"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Analyzed for</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-brand-blue/30 bg-brand-blue/10 px-3 py-1 text-sm text-slate-100">
            {prettyLabel(context.occasion)}
          </span>
          <span className="rounded-full border border-brand-blue/30 bg-brand-blue/10 px-3 py-1 text-sm text-slate-100">
            {prettyLabel(context.season)}
          </span>
          <span className="rounded-full border border-brand-blue/30 bg-brand-blue/10 px-3 py-1 text-sm text-slate-100">
            {prettyLabel(context.style)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onChangePreferences}
        className="rounded-xl border border-brand-blue/40 bg-brand-blue/10 px-4 py-2 text-sm font-medium text-brand-blue transition-colors hover:bg-brand-blue/20"
      >
        Change preferences
      </button>
    </div>
  </div>
);

export default AnalysisContextBar;
