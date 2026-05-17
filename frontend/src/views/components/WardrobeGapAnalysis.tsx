import React from 'react';
import { WardrobeGapAnalysisResponse } from '../../models/WardrobeModels';

interface WardrobeGapAnalysisProps {
  result: WardrobeGapAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  isAdmin?: boolean;
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
      ? 'bg-amber-500/15 text-amber-200 border-amber-300/25'
      : tone === 'success'
        ? 'bg-emerald-500/20 text-emerald-100 border-emerald-300/30'
        : 'bg-slate-700/30 text-slate-200 border-white/15';

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

const renderMissingSearchChips = (
  category: string,
  items: string[],
  emptyLabel: string,
  itemType: 'color' | 'style'
) => {
  if (items.length === 0) {
    return <span className="text-xs text-slate-400">{emptyLabel}</span>;
  }

  const toneClass = 'bg-amber-500/15 text-amber-200 border-amber-300/25 hover:bg-amber-500/25';

  const handleClick = (value: string) => {
    const query = `men ${value} ${prettyLabel(category)} outfit menswear`;
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleClick(value)}
          className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${toneClass}`}
          title="Click to search Google Images"
          aria-label={`Click to search images for ${prettyLabel(value)} ${prettyLabel(category)} ${itemType}`}
        >
          {prettyLabel(value)}
        </button>
      ))}
    </div>
  );
};

const WardrobeGapAnalysis: React.FC<WardrobeGapAnalysisProps> = ({
  result,
  loading,
  error,
  isAdmin = false,
}) => {
  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});

  const formatCost = (cost: number): string => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 0.1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  const orderedCategories = React.useMemo(() => {
    if (!result) {
      return [];
    }
    const fromResponse = Object.keys(result.analysis_by_category);
    const extras = fromResponse.filter((category) => !categoryOrder.includes(category));
    return [...categoryOrder, ...extras].filter((category) => result.analysis_by_category[category]);
  }, [result]);

  const snapshot = React.useMemo(() => {
    if (!result) {
      return null;
    }

    let missingColors = 0;
    let missingStyles = 0;
    let topBuyNextCategory = '';
    let topBuyNextCount = -1;

    for (const category of orderedCategories) {
      const entry = result.analysis_by_category[category];
      missingColors += entry.missing_colors.length;
      missingStyles += entry.missing_styles.length;

      if (entry.recommended_purchases.length > topBuyNextCount) {
        topBuyNextCategory = entry.category;
        topBuyNextCount = entry.recommended_purchases.length;
      }
    }

    return {
      categoriesAnalyzed: orderedCategories.length,
      missingColors,
      missingStyles,
      topBuyNextCategory: topBuyNextCount > 0 ? prettyLabel(topBuyNextCategory) : 'None',
    };
  }, [result, orderedCategories]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

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
            <p className="mt-2 text-xs text-slate-400">
              Mode used: <span className="font-medium text-slate-200">{prettyLabel(result.analysis_mode || 'free')}</span>
            </p>
            <p className="mt-2 text-sm text-slate-300">{result.overall_summary}</p>
          </div>

          {snapshot && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Categories analyzed</p>
                <p className="mt-1 text-xl font-semibold text-white">{snapshot.categoriesAnalyzed}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-200/80">Missing colors</p>
                <p className="mt-1 text-xl font-semibold text-amber-100">{snapshot.missingColors}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-200/80">Missing styles</p>
                <p className="mt-1 text-xl font-semibold text-amber-100">{snapshot.missingStyles}</p>
              </div>
              <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3">
                <p className="text-xs uppercase tracking-wide text-indigo-200/80">Top buy-next category</p>
                <p className="mt-1 text-sm font-semibold text-indigo-100">{snapshot.topBuyNextCategory}</p>
              </div>
            </div>
          )}

          {isAdmin && (
            <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
                Admin diagnostics
              </summary>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-teal-400/20 bg-teal-500/10 p-4">
                  {result.cost ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-teal-200 mb-1">Analysis Cost</h3>
                        <div className="text-sm text-slate-200 space-y-1">
                          <div>ChatGPT: {formatCost(result.cost.gpt4_cost)}</div>
                          {result.cost.input_tokens !== undefined && (
                            <div>Input tokens: {result.cost.input_tokens}</div>
                          )}
                          {result.cost.output_tokens !== undefined && (
                            <div>Output tokens: {result.cost.output_tokens}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{formatCost(result.cost.total_cost)}</div>
                        <div className="text-xs text-teal-300">Total</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold text-teal-200 mb-1">Analysis Cost</h3>
                      <p className="text-sm text-slate-200">
                        Cost details are unavailable for this run (likely free-mode or premium fallback).
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                  <h3 className="mb-4 font-semibold text-white">AI Prompt & Response (Admin)</h3>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                      <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Input Prompt</div>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-200">
                        {result.ai_prompt || 'Prompt is unavailable for this run (likely free-mode or premium fallback).'}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                      <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">AI Response</div>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-200">
                        {result.ai_raw_response || 'Response is unavailable for this run (likely free-mode or premium fallback).'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {orderedCategories.map((category) => {
              const entry = result.analysis_by_category[category];
              const topMissingColors = entry.missing_colors.slice(0, 2);
              const topMissingStyles = entry.missing_styles.slice(0, 2);
              const topBuyNext = entry.recommended_purchases.slice(0, 2);
              const isExpanded = !!expandedCategories[category];

              return (
                <article key={category} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-100">
                      {prettyLabel(entry.category)}
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        Top missing colors
                      </p>
                      {renderMissingSearchChips(entry.category, topMissingColors, 'Color coverage looks good.', 'color')}
                      {topMissingColors.length > 0 && (
                        <p className="mt-1 text-[11px] text-amber-300/80">Click a color chip to open image search.</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        Top missing styles
                      </p>
                      {renderMissingSearchChips(entry.category, topMissingStyles, 'Style coverage looks good.', 'style')}
                      {topMissingStyles.length > 0 && (
                        <p className="mt-1 text-[11px] text-amber-300/80">Click a style chip to open image search.</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Buy next</p>
                      {topBuyNext.length > 0 ? (
                        <ul className="space-y-1 text-sm text-slate-200">
                          {topBuyNext.map((recommendation) => (
                            <li key={recommendation}>- {recommendation}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">No immediate purchases needed.</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/35 p-3">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Owned Colors</p>
                          {renderChips(entry.owned_colors, 'No colors detected yet.', 'success')}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Missing Colors</p>
                          {renderMissingSearchChips(entry.category, entry.missing_colors, 'Color coverage looks good.', 'color')}
                          {entry.missing_colors.length > 0 && (
                            <p className="mt-1 text-[11px] text-amber-300/80">Click a color chip to open image search.</p>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Owned Styles</p>
                          {renderChips(entry.owned_styles, 'No style keywords detected yet.')}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Missing Styles</p>
                          {renderMissingSearchChips(entry.category, entry.missing_styles, 'Style coverage looks good.', 'style')}
                          {entry.missing_styles.length > 0 && (
                            <p className="mt-1 text-[11px] text-amber-300/80">Click a style chip to open image search.</p>
                          )}
                        </div>
                      </div>
                    )}
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
