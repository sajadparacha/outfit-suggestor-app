import React from 'react';
import { WardrobeGapAnalysisResponse } from '../../models/WardrobeModels';

interface WardrobeGapAnalysisProps {
  result: WardrobeGapAnalysisResponse | null;
  loading: boolean;
  error: string | null;
}

const categoryOrder = ['shirt', 'trouser', 'blazer', 'shoes', 'belt'];

const prettyLabel = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const renderChips = (items: string[], emptyLabel: string, tone: 'neutral' | 'danger' | 'success' = 'neutral') => {
  if (items.length === 0) {
    return <span className="text-xs text-slate-400">{emptyLabel}</span>;
  }

  const toneClass =
    tone === 'danger'
      ? 'bg-rose-500/15 text-rose-200 border-rose-300/20'
      : tone === 'success'
        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-300/20'
        : 'bg-white/5 text-slate-200 border-white/15';

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-2.5 py-1 text-xs ${toneClass}`}>
          {prettyLabel(item)}
        </span>
      ))}
    </div>
  );
};

const WardrobeGapAnalysis: React.FC<WardrobeGapAnalysisProps> = ({ result, loading, error }) => {
  const orderedCategories = React.useMemo(() => {
    if (!result) {
      return [];
    }
    const fromResponse = Object.keys(result.analysis_by_category);
    const extras = fromResponse.filter((category) => !categoryOrder.includes(category));
    return [...categoryOrder, ...extras].filter((category) => result.analysis_by_category[category]);
  }, [result]);

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_40px_rgba(2,8,23,0.45)] backdrop-blur sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Wardrobe Gap Analysis</h3>
        <p className="mt-1 text-sm text-slate-400">
          See what you already own and what to buy next for your selected occasion, season, and style.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
          Analyzing your wardrobe inventory...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {!loading && !error && !result && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          Run analysis to get category-wise color and style coverage.
        </div>
      )}

      {!loading && !error && result && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-200">
              Context: <span className="font-medium text-white">{prettyLabel(result.occasion)}</span> •{' '}
              <span className="font-medium text-white">{prettyLabel(result.season)}</span> •{' '}
              <span className="font-medium text-white">{prettyLabel(result.style)}</span>
            </p>
            <p className="mt-2 text-sm text-slate-300">{result.overall_summary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {orderedCategories.map((category) => {
              const entry = result.analysis_by_category[category];
              return (
                <article key={category} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-100">
                      {prettyLabel(entry.category)}
                    </h4>
                    <span className="text-xs text-slate-400">{entry.item_count} item(s)</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Owned Colors</p>
                      {renderChips(entry.owned_colors, 'No colors detected yet.', 'success')}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Missing Colors</p>
                      {renderChips(entry.missing_colors, 'Color coverage looks good.', 'danger')}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Owned Styles</p>
                      {renderChips(entry.owned_styles, 'No style keywords detected yet.')}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Missing Styles</p>
                      {renderChips(entry.missing_styles, 'Style coverage looks good.', 'danger')}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Buy Next</p>
                      {entry.recommended_purchases.length > 0 ? (
                        <ul className="space-y-1 text-sm text-slate-200">
                          {entry.recommended_purchases.map((recommendation) => (
                            <li key={recommendation}>- {recommendation}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">No immediate purchases needed.</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default WardrobeGapAnalysis;
