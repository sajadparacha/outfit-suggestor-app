import React from 'react';
import {
  AI_PROGRESS_TITLES,
  AiOperationType,
  formatDuration,
  useStagedAiProgress,
} from '../../utils/aiProgressSteps';

interface LoadingOverlayProps {
  isLoading: boolean;
  operationType?: AiOperationType;
  message?: string;
  onCancel?: () => void;
}

const OPERATION_TITLES = AI_PROGRESS_TITLES;

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  operationType = 'outfit-suggestion',
  message,
  onCancel,
}) => {
  const progress = useStagedAiProgress(isLoading, operationType, message);

  if (!isLoading) return null;

  const title = OPERATION_TITLES[operationType];

  return (
    <div
      className="fixed inset-0 z-[9999]"
      data-testid="loading-overlay"
      aria-modal="true"
    >
      {/* Full-screen dimmed backdrop — blocks all interaction underneath; does not dismiss */}
      <div
        className="absolute inset-0 bg-black/50"
        data-testid="loading-overlay-backdrop"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center p-4 sm:p-6"
        aria-hidden={false}
      >
        <div
          className="pointer-events-auto w-[min(100%,28rem)]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="rounded-2xl border border-white/15 bg-slate-950/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Elapsed {formatDuration(progress.elapsedSeconds)}
                  {' · '}
                  Usually ~{formatDuration(progress.estimatedTotalSeconds)} total
                </p>
              </div>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/30 hover:bg-white/5"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand-gradient transition-all duration-700 ease-out"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>

            <ol className="space-y-2.5">
              {progress.steps.map((step, index) => {
                const isComplete = index < progress.activeStepIndex;
                const isActive = index === progress.activeStepIndex;

                return (
                  <li key={step.id} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isComplete
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isActive
                            ? 'bg-brand-blue/20 text-brand-blue'
                            : 'bg-white/5 text-slate-500'
                      }`}
                      aria-hidden
                    >
                      {isComplete ? (
                        '✓'
                      ) : isActive ? (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-blue" />
                      ) : (
                        '·'
                      )}
                    </span>
                    <span
                      className={
                        isComplete
                          ? 'text-slate-400'
                          : isActive
                            ? 'font-medium text-white'
                            : 'text-slate-500'
                      }
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {message && (
              <p className="mt-3 text-xs text-slate-400">{message}</p>
            )}

            {progress.showSlowHint && (
              <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                Still working — complex outfits can take a bit longer. You can cancel anytime.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
