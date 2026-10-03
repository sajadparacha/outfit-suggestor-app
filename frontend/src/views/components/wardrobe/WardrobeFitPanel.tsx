/**
 * Modal panel: evaluate how a wardrobe item fits owned pieces + lifestyle goal.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ApiService from '../../../services/ApiService';
import type {
  WardrobeFitEvaluateResponse,
  WardrobeItem,
} from '../../../models/WardrobeModels';
import {
  DEFAULT_FIT_GOAL,
  WARDROBE_FIT_COPY,
  loadInitialFitGoal,
  saveLastFitGoal,
  wardrobeFitGoalHint,
  wardrobeFitPairCountLabel,
  wardrobeFitVerdictLabel,
} from '../../../utils/wardrobeFitCopy';
import { INSIGHTS_DRESS_CODE_OPTIONS, INSIGHTS_LIFESTYLE_OPTIONS } from '../../../utils/constants';
import { wardrobeCategoryLabel } from '../../../utils/wardrobeCategory';

export interface FitGoalDraft {
  dress_code: string;
  lifestyle_mix: string[];
  primary_lifestyle: string;
  style_primary: string;
  text_input: string;
}

export interface WardrobeFitAttributeCandidate {
  category: string;
  color: string;
  description: string;
}

interface WardrobeFitPanelProps {
  /** Owned item to evaluate. Omit for attribute-only (check before you buy) mode. */
  item?: WardrobeItem;
  isOpen: boolean;
  onClose: () => void;
  onGetOutfit?: (item: WardrobeItem) => void;
  onOpenInsights?: () => void;
  /** Attribute-only mode: resolves the candidate (e.g. by analyzing an uploaded photo). */
  resolveAttributeCandidate?: () => Promise<WardrobeFitAttributeCandidate>;
  /** Local preview (object/data URL) shown as the candidate thumb in attribute-only mode. */
  localImageUrl?: string | null;
  onAddToWardrobe?: (candidate: WardrobeFitAttributeCandidate) => void;
}

function thumbSrc(imageData: string | null | undefined): string | null {
  if (!imageData) return null;
  if (imageData.startsWith('data:')) return imageData;
  return `data:image/jpeg;base64,${imageData}`;
}

const WardrobeFitPanel: React.FC<WardrobeFitPanelProps> = ({
  item,
  isOpen,
  onClose,
  onGetOutfit,
  onOpenInsights,
  resolveAttributeCandidate,
  localImageUrl = null,
  onAddToWardrobe,
}) => {
  const isAttributeMode = !item && !!resolveAttributeCandidate;
  const [goal, setGoal] = useState<FitGoalDraft>({ ...DEFAULT_FIT_GOAL });
  const [draftGoal, setDraftGoal] = useState<FitGoalDraft>({ ...DEFAULT_FIT_GOAL });
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WardrobeFitEvaluateResponse | null>(null);
  const [attributeCandidate, setAttributeCandidate] =
    useState<WardrobeFitAttributeCandidate | null>(null);
  const attributeCandidateRef = useRef<WardrobeFitAttributeCandidate | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const runEvaluate = useCallback(
    async (goalOverride?: FitGoalDraft) => {
      const active = goalOverride ?? goal;
      setLoading(true);
      setError(null);
      try {
        const goalFields = {
          dress_code: active.dress_code,
          lifestyle_mix: active.lifestyle_mix,
          primary_lifestyle: active.primary_lifestyle,
          style_primary: active.style_primary,
          text_input: active.text_input,
        };
        let data: WardrobeFitEvaluateResponse;
        if (item) {
          data = await ApiService.evaluateWardrobeFit({ wardrobe_item_id: item.id, ...goalFields });
        } else if (resolveAttributeCandidate) {
          let candidate = attributeCandidateRef.current;
          if (!candidate) {
            candidate = await resolveAttributeCandidate();
            attributeCandidateRef.current = candidate;
            setAttributeCandidate(candidate);
          }
          data = await ApiService.evaluateWardrobeFit({
            category: candidate.category,
            color: candidate.color || null,
            description: candidate.description,
            ...goalFields,
          });
        } else {
          throw new Error(WARDROBE_FIT_COPY.error);
        }
        setResult(data);
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : WARDROBE_FIT_COPY.error);
      } finally {
        setLoading(false);
      }
    },
    [item, resolveAttributeCandidate, goal]
  );

  useEffect(() => {
    if (!isOpen) return;
    const initial = isAttributeMode
      ? { ...DEFAULT_FIT_GOAL, lifestyle_mix: [...DEFAULT_FIT_GOAL.lifestyle_mix] }
      : loadInitialFitGoal();
    setGoal(initial);
    setDraftGoal(initial);
    setShowGoalEditor(false);
    setResult(null);
    setError(null);
    setExpandedCategories(new Set());
    attributeCandidateRef.current = null;
    setAttributeCandidate(null);
    void runEvaluate(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evaluate once per open/item
  }, [isOpen, item?.id]);

  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const viewingImageRef = useRef<string | null>(null);
  viewingImageRef.current = viewingImage;

  useEffect(() => {
    if (!isOpen) setViewingImage(null);
  }, [isOpen]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (viewingImageRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setViewingImage(null);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = !!active && !!dialogRef.current?.contains(active);
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const candidateThumb = isAttributeMode
    ? localImageUrl ?? thumbSrc(result?.candidate.image_data)
    : thumbSrc(result?.candidate.image_data ?? item?.image_data);
  const pairs = result?.pairs_with ?? [];
  const hasPairs = pairs.some((p) => p.count > 0);

  const verdictChipClass = (verdict: string) => {
    if (verdict === 'strong_fit') return 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200';
    if (verdict === 'weak_fit') return 'border-amber-400/40 bg-amber-500/15 text-amber-100';
    return 'border-slate-400/40 bg-white/10 text-slate-200';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="wardrobe-fit-panel">
      <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={onClose} aria-hidden />
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wardrobe-fit-title"
          className="relative w-full max-w-lg rounded-t-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl backdrop-blur sm:rounded-2xl sm:p-6"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="wardrobe-fit-title" className="text-lg font-semibold text-white">
                {isAttributeMode ? WARDROBE_FIT_COPY.checkBeforeBuyAction : WARDROBE_FIT_COPY.action}
              </h2>
              <p className="mt-1 text-xs text-slate-400" data-testid="wardrobe-fit-goal-hint">
                {wardrobeFitGoalHint(goal)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-xl border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/10"
              aria-label={WARDROBE_FIT_COPY.close}
            >
              ✕
            </button>
          </div>

          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftGoal(goal);
                setShowGoalEditor((v) => !v);
              }}
              className="min-h-[40px] rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/10"
              data-testid="wardrobe-fit-change-goal"
            >
              {WARDROBE_FIT_COPY.changeGoal}
            </button>
          </div>

          {showGoalEditor && (
            <div
              className="mb-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-3"
              data-testid="wardrobe-fit-goal-editor"
            >
              <label className="block text-xs font-medium text-slate-300">
                Dress code
                <select
                  className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  value={draftGoal.dress_code}
                  onChange={(e) =>
                    setDraftGoal((g) => ({ ...g, dress_code: e.target.value }))
                  }
                  data-testid="wardrobe-fit-dress-code"
                >
                  {INSIGHTS_DRESS_CODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Primary lifestyle
                <select
                  className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  value={draftGoal.primary_lifestyle}
                  onChange={(e) => {
                    const primary = e.target.value;
                    setDraftGoal((g) => {
                      const mix = g.lifestyle_mix.includes(primary)
                        ? g.lifestyle_mix
                        : [...g.lifestyle_mix, primary];
                      return { ...g, primary_lifestyle: primary, lifestyle_mix: mix };
                    });
                  }}
                  data-testid="wardrobe-fit-primary-lifestyle"
                >
                  {INSIGHTS_LIFESTYLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-300">
                Notes
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  value={draftGoal.text_input}
                  onChange={(e) =>
                    setDraftGoal((g) => ({ ...g, text_input: e.target.value }))
                  }
                  placeholder="Optional notes"
                  data-testid="wardrobe-fit-notes"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setGoal(draftGoal);
                  saveLastFitGoal(draftGoal);
                  setShowGoalEditor(false);
                  void runEvaluate(draftGoal);
                }}
                className="min-h-[40px] w-full rounded-lg border border-brand-blue/40 bg-brand-blue/15 text-sm font-semibold text-white transition hover:bg-brand-blue/25"
                data-testid="wardrobe-fit-apply-goal"
              >
                Apply goal
              </button>
            </div>
          )}

          {loading && (
            <div
              className="flex flex-col items-center gap-3 py-10 text-center"
              data-testid="wardrobe-fit-loading"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
              <p className="text-sm text-slate-300">
                {isAttributeMode ? WARDROBE_FIT_COPY.checkBeforeBuyLoading : WARDROBE_FIT_COPY.loading}
              </p>
            </div>
          )}

          {!loading && error && (
            <div
              className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-center"
              data-testid="wardrobe-fit-error"
            >
              <p className="text-sm text-red-200">{WARDROBE_FIT_COPY.error}</p>
              <button
                type="button"
                onClick={() => void runEvaluate()}
                className="mt-3 min-h-[44px] rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"
                data-testid="wardrobe-fit-retry"
              >
                {WARDROBE_FIT_COPY.retry}
              </button>
            </div>
          )}

          {!loading && !error && result && (
            <div className="space-y-4" data-testid="wardrobe-fit-result">
              <div className="flex items-start gap-3">
                {candidateThumb ? (
                  <button
                    type="button"
                    onClick={() => setViewingImage(candidateThumb)}
                    className="flex-shrink-0 cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                    aria-label="View full image"
                    data-testid="wardrobe-fit-candidate-thumb-button"
                  >
                    <img
                      src={candidateThumb}
                      alt=""
                      className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/15"
                      data-testid="wardrobe-fit-candidate-thumb"
                    />
                  </button>
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl ring-1 ring-white/15">
                    👔
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white" data-testid="wardrobe-fit-summary">
                    {result.summary_text}
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verdictChipClass(result.verdict)}`}
                    data-testid="wardrobe-fit-verdict"
                  >
                    {wardrobeFitVerdictLabel(result.verdict)}
                  </span>
                </div>
              </div>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {WARDROBE_FIT_COPY.sectionPairs}
                </h3>
                {!hasPairs ? (
                  <p className="text-sm text-slate-400" data-testid="wardrobe-fit-empty-pairs">
                    {WARDROBE_FIT_COPY.emptyPairs}
                  </p>
                ) : (
                  <ul className="space-y-2" data-testid="wardrobe-fit-pairs">
                    {pairs.map((row) => {
                      const isExpanded = expandedCategories.has(row.category);
                      const canExpand = row.count > 3;
                      const visibleItems = isExpanded ? row.items : row.items.slice(0, 3);
                      return (
                      <li
                        key={row.category}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                        data-testid={`wardrobe-fit-pair-${row.category}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-medium capitalize text-slate-100">
                            {wardrobeCategoryLabel(row.category)}
                          </span>
                          <span
                            className="text-xs font-semibold text-brand-blue"
                            data-testid={`wardrobe-fit-pair-count-${row.category}`}
                          >
                            {wardrobeFitPairCountLabel(row.count)}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-2 ${isExpanded ? 'flex-wrap' : 'overflow-x-auto'}`}
                          data-testid={`wardrobe-fit-pair-thumbs-${row.category}`}
                        >
                          {visibleItems.map((thumb) => {
                            const src = thumbSrc(thumb.image_data);
                            return src ? (
                              <button
                                key={thumb.id}
                                type="button"
                                onClick={() => setViewingImage(src)}
                                className="flex-shrink-0 cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                aria-label={`View full image of ${thumb.label}`}
                                title={thumb.label}
                              >
                                <img
                                  src={src}
                                  alt={thumb.label}
                                  className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10"
                                />
                              </button>
                            ) : (
                              <div
                                key={thumb.id}
                                title={thumb.label}
                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-[10px] text-slate-300 ring-1 ring-white/10"
                              >
                                {(thumb.color || thumb.label).slice(0, 3)}
                              </div>
                            );
                          })}
                          {canExpand && (
                            <button
                              type="button"
                              onClick={() => toggleCategory(row.category)}
                              aria-expanded={isExpanded}
                              className="min-h-[40px] flex-shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                              data-testid={`wardrobe-fit-pair-toggle-${row.category}`}
                            >
                              {isExpanded ? 'Show less' : `View all (${row.count})`}
                            </button>
                          )}
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section
                className="rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-4"
                data-testid="wardrobe-fit-missing"
              >
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
                  {WARDROBE_FIT_COPY.sectionGap}
                </h3>
                <p className="text-sm font-medium text-white capitalize">
                  {result.missing_for_goal.label}
                </p>
                <p className="mt-1 text-sm text-slate-300">{result.missing_for_goal.reason}</p>
                {onOpenInsights && (
                  <button
                    type="button"
                    onClick={onOpenInsights}
                    className="mt-3 min-h-[40px] text-sm font-semibold text-brand-blue underline-offset-2 hover:underline"
                    data-testid="wardrobe-fit-open-insights"
                  >
                    Open Insights
                  </button>
                )}
              </section>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {isAttributeMode && onAddToWardrobe && attributeCandidate && (
                  <button
                    type="button"
                    onClick={() => onAddToWardrobe(attributeCandidate)}
                    className="min-h-[44px] rounded-xl border border-brand-blue/40 bg-brand-blue/15 px-4 text-sm font-semibold text-white transition hover:bg-brand-blue/25"
                    data-testid="wardrobe-fit-add-to-wardrobe"
                  >
                    {WARDROBE_FIT_COPY.addToWardrobe}
                  </button>
                )}
                {onGetOutfit && item && (
                  <button
                    type="button"
                    onClick={() => onGetOutfit(item)}
                    className="min-h-[44px] rounded-xl border border-brand-blue/40 bg-brand-blue/15 px-4 text-sm font-semibold text-white transition hover:bg-brand-blue/25"
                    data-testid="wardrobe-fit-get-outfit"
                  >
                    {WARDROBE_FIT_COPY.getOutfit}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
                  data-testid="wardrobe-fit-close"
                >
                  {WARDROBE_FIT_COPY.close}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewingImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setViewingImage(null)}
          data-testid="wardrobe-fit-image-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Full size image"
        >
          <div className="relative flex h-full max-h-[90vh] w-full max-w-7xl items-center justify-center">
            <img
              src={viewingImage}
              alt="Full size view"
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewingImage(null);
              }}
              className="absolute right-4 top-4 rounded-full bg-black bg-opacity-50 p-3 text-2xl text-white transition-all hover:bg-opacity-70"
              title="Close"
              aria-label="Close"
              data-testid="wardrobe-fit-image-viewer-close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardrobeFitPanel;
