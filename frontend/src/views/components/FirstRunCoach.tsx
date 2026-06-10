import React from 'react';
import {
  dismissFirstRunCoach,
  getActiveCoachStep,
  isFirstRunCoachDismissed,
  type FirstRunCoachStep,
} from '../../utils/firstRunCoach';

const STEPS = [
  { number: 1 as const, title: 'Upload', subtitle: 'Add any clothing photo' },
  { number: 2 as const, title: 'Generate', subtitle: 'AI builds a full outfit' },
  { number: 3 as const, title: 'Explore', subtitle: 'Try another look or save' },
];

interface FirstRunCoachProps {
  hasImage: boolean;
  hasSuggestion: boolean;
  onDismiss?: () => void;
}

function isStepComplete(step: number, activeStep: FirstRunCoachStep): boolean {
  return step < activeStep;
}

const CheckIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const FirstRunCoach: React.FC<FirstRunCoachProps> = ({ hasImage, hasSuggestion, onDismiss }) => {
  const [dismissed, setDismissed] = React.useState(() => isFirstRunCoachDismissed());

  React.useEffect(() => {
    if (hasSuggestion && !dismissed) {
      dismissFirstRunCoach();
      setDismissed(true);
      onDismiss?.();
    }
  }, [hasSuggestion, dismissed, onDismiss]);

  if (dismissed) {
    return null;
  }

  const activeStep = getActiveCoachStep(hasImage, hasSuggestion);

  const handleDismiss = () => {
    dismissFirstRunCoach();
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <section
      className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      aria-label="Getting started"
      data-testid="first-run-coach"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">First run</p>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
          aria-label="Dismiss getting started guide"
          data-testid="first-run-coach-dismiss"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {STEPS.map((step) => {
          const complete = isStepComplete(step.number, activeStep);
          const active = step.number === activeStep;

          return (
            <div
              key={step.number}
              data-testid={`first-run-coach-step-${step.number}`}
              data-active={active ? 'true' : 'false'}
              data-complete={complete ? 'true' : 'false'}
              className={`rounded-xl border p-3 transition ${
                active
                  ? 'border-transparent bg-brand-gradient-soft ring-2 ring-brand-blue/60 ring-offset-1 ring-offset-slate-900'
                  : complete
                    ? 'border-white/10 bg-white/[0.02]'
                    : 'border-white/10 bg-white/[0.02] opacity-80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    complete
                      ? 'bg-brand-gradient text-white'
                      : active
                        ? 'bg-brand-gradient text-white'
                        : 'bg-white/10 text-slate-400'
                  }`}
                  aria-hidden
                >
                  {complete ? <CheckIcon /> : step.number}
                </span>
                <span className="text-sm font-semibold text-white">{step.title}</span>
              </div>
              <p className="mt-1.5 pl-8 text-xs leading-relaxed text-slate-400">{step.subtitle}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FirstRunCoach;
