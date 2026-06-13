import React from 'react';

interface InsightsHeaderProps {
  hasResult: boolean;
  onNewAnalysis?: () => void;
  onOpenWardrobe?: () => void;
}

const InsightsHeader: React.FC<InsightsHeaderProps> = ({
  hasResult,
  onNewAnalysis,
  onOpenWardrobe,
}) => (
  <header className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-xl backdrop-blur">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">Wardrobe Insights</h1>
        <p className="mt-1 text-slate-300">
          AI-powered analysis of your wardrobe to help you dress better.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {hasResult && onNewAnalysis && (
          <button
            type="button"
            onClick={onNewAnalysis}
            className="btn-brand rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
          >
            New Analysis
          </button>
        )}
        {onOpenWardrobe && (
          <button
            type="button"
            onClick={onOpenWardrobe}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/20"
          >
            Open Wardrobe
          </button>
        )}
      </div>
    </div>
  </header>
);

export default InsightsHeader;
