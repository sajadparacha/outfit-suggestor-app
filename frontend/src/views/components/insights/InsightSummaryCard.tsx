import React from 'react';
import { WardrobeInsightScore, WardrobeTopPriority } from '../../../models/WardrobeInsightResult';

interface InsightSummaryCardProps {
  score: WardrobeInsightScore;
  topPriorities: WardrobeTopPriority[];
  showShoppingList?: boolean;
  onViewShoppingList?: () => void;
}

const scoreRingColor = (label: WardrobeInsightScore['label']): string => {
  switch (label) {
    case 'Strong':
      return 'text-emerald-400';
    case 'Good':
      return 'text-green-400';
    case 'Fair':
      return 'text-amber-400';
    case 'Weak':
      return 'text-orange-400';
    default:
      return 'text-brand-blue';
  }
};

const InsightSummaryCard: React.FC<InsightSummaryCardProps> = ({
  score,
  topPriorities,
  showShoppingList = false,
  onViewShoppingList,
}) => (
  <section
    className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/95 p-6 shadow-[0_16px_48px_rgba(2,8,23,0.5)] sm:p-8"
    data-testid="insight-summary-card"
  >
    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
      <div className="flex items-center gap-6">
        <div
          className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-white/10 bg-slate-900/80"
          data-testid="score-ring"
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={scoreRingColor(score.label)}
              strokeDasharray={`${(score.value / 100) * 264} 264`}
            />
          </svg>
          <div className="text-center">
            <span className="text-3xl font-bold text-white" data-testid="score-value">{score.value}</span>
            <p className={`text-xs font-semibold uppercase tracking-wide ${scoreRingColor(score.label)}`} data-testid="score-label">
              {score.label}
            </p>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Wardrobe gap score</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300" data-testid="score-summary">
            {score.summary}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Top 3 priorities</h3>
        <ol className="mt-3 space-y-2" data-testid="top-priorities-list">
          {topPriorities.length === 0 ? (
            <li className="text-sm text-slate-400">Your wardrobe coverage looks strong for this context.</li>
          ) : (
            topPriorities.map((item) => (
              <li key={item.id} className="flex items-start gap-3 text-sm text-slate-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/20 text-xs font-bold text-brand-blue">
                  {item.rank}
                </span>
                <span>
                  <span className="font-medium text-white">{item.name}</span>
                  <span className="ml-2 text-xs text-slate-400">({item.priority})</span>
                </span>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>

    {onViewShoppingList && (
      <div className="mt-6 border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={onViewShoppingList}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          data-testid="view-shopping-list"
          aria-label="insights.viewShoppingList"
        >
          {showShoppingList ? 'Hide shopping list' : 'View shopping list'}
        </button>
      </div>
    )}
  </section>
);

export default InsightSummaryCard;
