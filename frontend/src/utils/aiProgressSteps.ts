import { useEffect, useMemo, useRef, useState } from 'react';

export type AiOperationType =
  | 'outfit-suggestion'
  | 'outfit-with-preview'
  | 'wardrobe-outfit'
  | 'wardrobe-analysis';

export interface AiProgressStep {
  id: string;
  label: string;
  /** Typical duration before advancing to the next simulated step. */
  durationMs: number;
}

export const AI_PROGRESS_STEPS: Record<AiOperationType, AiProgressStep[]> = {
  'outfit-suggestion': [
    { id: 'prepare', label: 'Preparing your image', durationMs: 2500 },
    { id: 'analyze', label: 'Analyzing your item', durationMs: 8000 },
    { id: 'match', label: 'Matching colors and style', durationMs: 10000 },
    { id: 'build', label: 'Building outfit recommendation', durationMs: 15000 },
  ],
  'outfit-with-preview': [
    { id: 'prepare', label: 'Preparing your image', durationMs: 2500 },
    { id: 'analyze', label: 'Analyzing your item', durationMs: 8000 },
    { id: 'match', label: 'Matching colors and style', durationMs: 10000 },
    { id: 'build', label: 'Building outfit recommendation', durationMs: 12000 },
    { id: 'preview', label: 'Generating preview', durationMs: 20000 },
  ],
  'wardrobe-outfit': [
    { id: 'scan', label: 'Scanning your wardrobe', durationMs: 4000 },
    { id: 'match', label: 'Matching colors and style', durationMs: 8000 },
    { id: 'build', label: 'Building outfit recommendation', durationMs: 12000 },
  ],
  'wardrobe-analysis': [
    { id: 'review', label: 'Reviewing your wardrobe', durationMs: 5000 },
    { id: 'gaps', label: 'Identifying gaps', durationMs: 10000 },
    { id: 'recommend', label: 'Preparing recommendations', durationMs: 15000 },
  ],
};

export function getEstimatedDurationMs(operationType: AiOperationType): number {
  return AI_PROGRESS_STEPS[operationType].reduce((sum, step) => sum + step.durationMs, 0);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function resolveStepFromMessage(message: string | null | undefined, steps: AiProgressStep[]): number {
  if (!message) return 0;
  const lower = message.toLowerCase();
  if (lower.includes('compress')) return 0;
  if (lower.includes('analyz')) return 1;
  if (lower.includes('match') || lower.includes('color')) return 2;
  if (lower.includes('different outfit') || lower.includes('generating ai')) return 3;
  if (lower.includes('preview') || lower.includes('model')) return steps.length - 1;
  if (lower.includes('premium') || lower.includes('chatgpt')) return 1;
  if (lower.includes('free rules')) return 1;
  return 0;
}

export interface StagedAiProgress {
  steps: AiProgressStep[];
  activeStepIndex: number;
  elapsedSeconds: number;
  estimatedTotalSeconds: number;
  estimatedRemainingSeconds: number;
  progressPercent: number;
  showSlowHint: boolean;
}

export function useStagedAiProgress(
  isActive: boolean,
  operationType: AiOperationType,
  loadingMessage?: string | null
): StagedAiProgress {
  const steps = AI_PROGRESS_STEPS[operationType];
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const stepStartedAtRef = useRef<number>(Date.now());
  const sessionStartedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isActive) {
      setActiveStepIndex(0);
      setElapsedSeconds(0);
      return;
    }

    const now = Date.now();
    sessionStartedAtRef.current = now;
    stepStartedAtRef.current = now;
    setActiveStepIndex(resolveStepFromMessage(loadingMessage, steps));
    setElapsedSeconds(0);
  }, [isActive, operationType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isActive) return;

    const messageIndex = resolveStepFromMessage(loadingMessage, steps);
    setActiveStepIndex((current) => Math.max(current, messageIndex));
  }, [isActive, loadingMessage, steps]);

  useEffect(() => {
    if (!isActive) return;

    const tick = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartedAtRef.current) / 1000);
      setElapsedSeconds(elapsed);

      const stepElapsed = Date.now() - stepStartedAtRef.current;
      const currentStep = steps[activeStepIndex];
      if (currentStep && stepElapsed >= currentStep.durationMs && activeStepIndex < steps.length - 1) {
        stepStartedAtRef.current = Date.now();
        setActiveStepIndex((index) => Math.min(index + 1, steps.length - 1));
      }
    }, 500);

    return () => window.clearInterval(tick);
  }, [isActive, activeStepIndex, steps]);

  return useMemo(() => {
    const estimatedTotalSeconds = Math.round(getEstimatedDurationMs(operationType) / 1000);
    const estimatedRemainingSeconds = Math.max(0, estimatedTotalSeconds - elapsedSeconds);
    const completedSteps = activeStepIndex;
    const progressPercent = Math.min(
      95,
      Math.round(((completedSteps + 0.35) / steps.length) * 100)
    );

    return {
      steps,
      activeStepIndex,
      elapsedSeconds,
      estimatedTotalSeconds,
      estimatedRemainingSeconds,
      progressPercent,
      showSlowHint: elapsedSeconds >= 45,
    };
  }, [operationType, steps, activeStepIndex, elapsedSeconds]);
}
