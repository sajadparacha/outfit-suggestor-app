import React from 'react';
import {
  WardrobeCategoryGap,
  WardrobeCategoryInsight,
  WardrobeGapAnalysisResponse,
  WardrobePriorityShoppingItem,
} from '../../models/WardrobeModels';
import { getReviewTypeLabel, INSIGHTS_COPY } from '../../utils/insightsCopy';

interface WardrobeGapAnalysisProps {
  result: WardrobeGapAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  isAdmin?: boolean;
}

const categoryOrder = ['shirt', 'trouser', 'blazer', 'shoes', 'belt'];

const prettyLabel = (value: string): string =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getColorSwatchValue = (colorName: string): string => {
  const normalized = colorName.trim().toLowerCase();
  const map: Record<string, string> = {
    black: '#111827',
    white: '#f8fafc',
    brown: '#8b5a2b',
    tan: '#d2b48c',
    beige: '#d6c6a8',
    blue: '#2563eb',
    navy: '#1e3a8a',
    gray: '#6b7280',
    grey: '#6b7280',
    green: '#15803d',
    olive: '#556b2f',
    burgundy: '#7f1d1d',
    red: '#b91c1c',
    purple: '#6d28d9',
    pink: '#db2777',
    yellow: '#ca8a04',
  };
  return map[normalized] || '#334155';
};

const categoryForSearch = (rawCategory: string): string => {
  const normalized = rawCategory.trim().toLowerCase();
  if (normalized === 'shirt') return 'shirts';
  if (normalized === 'trouser') return 'trousers';
  if (normalized === 'shoe') return 'shoes';
  if (normalized === 'blazer' || normalized === 'belt') return `${normalized}s`;
  return normalized;
};

const formatSearchList = (items: string[]): string => {
  const labels = items.map((item) => prettyLabel(item)).filter(Boolean);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

const openShoppingSearch = (category: string, styles: string[], colors: string[]) => {
  const stylePhrase = formatSearchList(styles.length > 0 ? styles : ['classic']);
  const colorPhrase = formatSearchList(colors.length > 0 ? colors : ['neutral']);
  const query = `Show me men ${categoryForSearch(category)} in ${stylePhrase} style and ${colorPhrase} color`;
  const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const renderStyleChips = (category: string, items: string[], emptyLabel: string, missingColors: string[]) => {
  if (items.length === 0) return <p className="text-xs text-slate-400">{emptyLabel}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((style) => (
        <button
          key={style}
          type="button"
          onClick={() => openShoppingSearch(category, [style], [missingColors[0] || 'neutral'])}
          className="rounded-full border border-brand-blue/25 bg-brand-blue/10 px-2.5 py-1 text-xs text-brand-blue/90 transition-colors hover:bg-brand-blue/20"
          aria-label={`Find similar items for ${prettyLabel(style)}`}
        >
          {prettyLabel(style)}
        </button>
      ))}
    </div>
  );
};

const renderColorSwatches = (
  colors: string[],
  emptyLabel: string,
  options?: {
    onColorClick?: (color: string) => void;
    ariaPrefix?: string;
  }
) => {
  if (colors.length === 0) return <p className="text-xs text-slate-400">{emptyLabel}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => {
        const swatch = getColorSwatchValue(color);
        const needsBorder = ['#f8fafc', '#d6c6a8', '#d2b48c'].includes(swatch);
        const content = (
          <>
            <span
              className={`h-3.5 w-3.5 rounded-full ${needsBorder ? 'border border-slate-500' : 'border border-transparent'}`}
              style={{ backgroundColor: swatch }}
            />
            {prettyLabel(color)}
          </>
        );

        if (options?.onColorClick) {
          return (
            <button
              key={color}
              type="button"
              onClick={() => options.onColorClick?.(color)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/50 px-2.5 py-1 text-xs text-slate-100 hover:bg-slate-800/70"
              aria-label={`${options.ariaPrefix || 'Find similar items for'} ${prettyLabel(color)}`}
            >
              {content}
            </button>
          );
        }

        return (
          <span key={color} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/50 px-2.5 py-1 text-xs text-slate-100">
            {content}
          </span>
        );
      })}
    </div>
  );
};

const derivePriorityList = (result: WardrobeGapAnalysisResponse, orderedCategories: string[]): WardrobePriorityShoppingItem[] => {
  if (result.priorityShoppingList?.length) return result.priorityShoppingList;
  type RankedPriority = WardrobePriorityShoppingItem & { score: number };
  const ranked: RankedPriority[] = orderedCategories
    .map<RankedPriority>((category) => {
      const entry = result.analysis_by_category[category];
      const score = (entry.missing_colors.length * 2) + (entry.missing_styles.length * 2) + (entry.item_count === 0 ? 2 : 0);
      const priority: WardrobePriorityShoppingItem['priority'] = score >= 8 ? 'High' : score >= 4 ? 'Medium' : 'Low';
      return {
        score,
        rank: 0,
        itemName: `${entry.missing_colors[0] || 'core'} ${entry.missing_styles[0] || category} ${category}`,
        category,
        priority,
        recommendedColors: entry.missing_colors,
        recommendedStyles: entry.missing_styles,
        reason: `Improves your ${result.style} ${result.occasion} options for ${result.season}.`,
        outfitImpact: `Unlocks more complete looks in ${prettyLabel(category)}.`,
        actions: ['Show outfit examples'],
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked.map(({ score: _score, ...item }, idx): WardrobePriorityShoppingItem => ({ ...item, rank: idx + 1 }));
};

const deriveCategoryInsights = (result: WardrobeGapAnalysisResponse, orderedCategories: string[]): WardrobeCategoryInsight[] => {
  if (result.categoryInsights?.length) return result.categoryInsights;
  return orderedCategories.map((category) => {
    const entry = result.analysis_by_category[category];
    const score = (entry.missing_colors.length * 2) + (entry.missing_styles.length * 2) + (entry.item_count === 0 ? 2 : 0);
    const priority = score >= 8 ? 'High' : score >= 4 ? 'Medium' : 'Low';
    return {
      category,
      missingColors: entry.missing_colors,
      missingStyles: entry.missing_styles,
      priority,
      whyThisMatters: `Adding these ${prettyLabel(category)} options makes more ${prettyLabel(result.style)} ${prettyLabel(result.occasion)} combinations possible.`,
      recommendation: entry.recommended_purchases[0] || `Add one versatile ${prettyLabel(category)} option first.`,
      suggestedActions: ['Show outfit examples', 'Find similar items'],
    };
  });
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

      const weightedBuyScore = entry.recommended_purchases.length * 3 + entry.missing_colors.length + entry.missing_styles.length * 2;
      if (weightedBuyScore > topBuyNextCount) {
        topBuyNextCategory = entry.category;
        topBuyNextCount = weightedBuyScore;
      }
    }

    return {
      categoriesAnalyzed: orderedCategories.length,
      missingColors,
      missingStyles,
      topBuyNextCategory: topBuyNextCount > 0 ? prettyLabel(topBuyNextCategory) : 'None',
    };
  }, [result, orderedCategories]);

  const priorityShoppingList = React.useMemo(
    () => (result ? derivePriorityList(result, orderedCategories) : []),
    [result, orderedCategories]
  );

  const categoryInsights = React.useMemo(
    () => (result ? deriveCategoryInsights(result, orderedCategories) : []),
    [result, orderedCategories]
  );

  const reviewTypeLabel = React.useMemo(() => {
    if (!result) return '';
    return getReviewTypeLabel(result.analysis_mode, result.analysisDepth);
  }, [result]);

  const topSummary = result?.summaryText || result?.overall_summary || '';

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_40px_rgba(2,8,23,0.45)] backdrop-blur sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{INSIGHTS_COPY.WHATS_MISSING_TITLE}</h3>
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
          {INSIGHTS_COPY.EMPTY_STATE}
        </div>
      )}

      {!loading && !error && result && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-200 mb-2">
              Context: <span className="font-medium text-white">{prettyLabel(result.occasion)}</span> •{' '}
              <span className="font-medium text-white">{prettyLabel(result.season)}</span> •{' '}
              <span className="font-medium text-white">{prettyLabel(result.style)}</span>
            </p>
            <p className="text-xs text-slate-400">
              {INSIGHTS_COPY.REVIEW_TYPE_PREFIX}{' '}
              <span className="font-medium text-slate-200">{reviewTypeLabel}</span>
            </p>
            <p className="mt-3 text-sm text-slate-200">{topSummary}</p>
          </div>

          <div className="rounded-2xl border border-brand-blue/25 bg-brand-blue/10 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-white">{INSIGHTS_COPY.WHAT_TO_BUY_NEXT}</h4>
              <p className="text-xs text-slate-200/90">Buy these first to unlock the most outfit combinations.</p>
            </div>
            <div className="space-y-3">
              {priorityShoppingList.length === 0 ? (
                <p className="text-sm text-slate-200">
                  Your wardrobe has strong coverage for this style. No urgent purchase is needed, but optional additions can increase flexibility.
                </p>
              ) : (
                priorityShoppingList.map((item) => (
                  <article key={`${item.rank}-${item.category}`} className="rounded-xl border border-white/15 bg-slate-900/45 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">#{item.rank}</span>
                      <h5 className="text-sm font-semibold text-white">{prettyLabel(item.itemName)}</h5>
                      <span className="rounded-full border border-brand-blue/30 bg-brand-purple/15 px-2 py-0.5 text-xs text-brand-purple/90">
                        {item.priority} Priority
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-200">{item.reason}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.outfitImpact}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openShoppingSearch(
                            item.category,
                            item.recommendedStyles.length > 0 ? item.recommendedStyles : [result.style],
                            item.recommendedColors.length > 0 ? item.recommendedColors : ['neutral']
                          )
                        }
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/10"
                      >
                        Show outfit examples
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          {snapshot && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">{INSIGHTS_COPY.CATEGORIES_CHECKED}</p>
                <p className="mt-1 text-xl font-semibold text-white">{snapshot.categoriesAnalyzed}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-200/80">{INSIGHTS_COPY.COLORS_TO_ADD}</p>
                <p className="mt-1 text-xl font-semibold text-amber-100">{snapshot.missingColors}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-200/80">{INSIGHTS_COPY.STYLES_TO_TRY}</p>
                <p className="mt-1 text-xl font-semibold text-amber-100">{snapshot.missingStyles}</p>
              </div>
              <div className="rounded-xl border border-brand-purple/20 bg-brand-purple/10 p-3">
                <p className="text-xs uppercase tracking-wide text-brand-purple/80">{INSIGHTS_COPY.BEST_CATEGORY_TO_SHOP_NEXT}</p>
                <p className="mt-1 text-sm font-semibold text-brand-purple/90">{snapshot.topBuyNextCategory}</p>
              </div>
            </div>
          )}

          {isAdmin && (
            <details open className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5" data-testid="admin-diagnostics">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
                Admin diagnostics
              </summary>
              <p className="mt-3 text-xs text-slate-400">
                Prompt, response, and cost details appear for Premium analysis runs. Basic analysis shows placeholders below.
              </p>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/10 p-4" data-testid="analysis-cost">
                  {result.cost ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-brand-blue mb-1">Analysis Cost</h3>
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
                        <div className="text-xs text-brand-blue">Total</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold text-brand-blue mb-1">Analysis Cost</h3>
                      <p className="text-sm text-slate-200">
                        Cost details are unavailable for this run (likely free-mode or premium fallback).
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                  <h3 className="mb-4 font-semibold text-white">AI Prompt & Response (Admin)</h3>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3" data-testid="input-prompt">
                      <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Input Prompt</div>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-200">
                        {result.ai_prompt || 'Prompt is unavailable for this run (likely free-mode or premium fallback).'}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3" data-testid="ai-response">
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoryInsights.map((insight) => {
              const entry: WardrobeCategoryGap = result.analysis_by_category[insight.category];
              const isExpanded = !!expandedCategories[insight.category];

              return (
                <article key={insight.category} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-100">
                      {prettyLabel(insight.category)}
                    </h4>
                    <span className="rounded-full border border-brand-blue/30 bg-brand-purple/15 px-2 py-0.5 text-xs text-brand-purple/90">
                      {insight.priority}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        {INSIGHTS_COPY.COLORS_TO_ADD}
                      </p>
                      {renderColorSwatches(
                        insight.missingColors,
                        'You already have enough core colors in this category.',
                        {
                          onColorClick: (color) =>
                            openShoppingSearch(
                              insight.category,
                              insight.missingStyles.length > 0 ? [insight.missingStyles[0]] : [result.style],
                              [color]
                            ),
                          ariaPrefix: 'Find similar items for',
                        }
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{INSIGHTS_COPY.STYLES_TO_TRY}</p>
                      {renderStyleChips(insight.category, insight.missingStyles, 'Your style coverage looks balanced for this category.', insight.missingColors)}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Why this matters</p>
                      <p className="text-xs text-slate-200">{insight.whyThisMatters}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Recommended next step</p>
                      <p className="text-xs text-slate-300">{insight.recommendation}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openShoppingSearch(
                            insight.category,
                            insight.missingStyles.length > 0 ? insight.missingStyles : [result.style],
                            insight.missingColors.length > 0 ? insight.missingColors : ['neutral']
                          )
                        }
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/10"
                      >
                        Show outfit examples
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCategory(insight.category)}
                        className="rounded-lg border border-brand-blue/30 bg-brand-purple/10 px-3 py-1.5 text-xs font-medium text-brand-purple/90 hover:bg-brand-purple/20"
                      >
                        {isExpanded ? 'Why this matters' : 'Find similar items'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/35 p-3">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Owned Colors</p>
                          {renderColorSwatches(entry.owned_colors, 'No colors detected yet.')}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{INSIGHTS_COPY.COLORS_TO_ADD}</p>
                          {renderColorSwatches(
                            entry.missing_colors,
                            'You already have enough core colors in this category.',
                            {
                              onColorClick: (color) =>
                                openShoppingSearch(
                                  entry.category,
                                  entry.missing_styles.length > 0 ? [entry.missing_styles[0]] : [result.style],
                                  [color]
                                ),
                              ariaPrefix: 'Find similar items for',
                            }
                          )}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Owned Styles</p>
                          {renderStyleChips(entry.category, entry.owned_styles, 'No style keywords detected yet.', entry.missing_colors)}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{INSIGHTS_COPY.STYLES_TO_TRY}</p>
                          {renderStyleChips(entry.category, entry.missing_styles, 'Your style coverage looks balanced for this category.', entry.missing_colors)}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Buy-next guidance</p>
                          {entry.recommended_purchases.length === 0 ? (
                            <p className="text-xs text-slate-400">No urgent purchase is needed in this category.</p>
                          ) : (
                            <ul className="space-y-1 text-xs text-slate-200">
                              {entry.recommended_purchases.map((line) => (
                                <li key={line}>- {line}</li>
                              ))}
                            </ul>
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
