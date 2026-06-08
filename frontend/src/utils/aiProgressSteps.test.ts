import {
  AI_PROGRESS_STEPS,
  formatDuration,
  getEstimatedDurationMs,
} from './aiProgressSteps';

describe('aiProgressSteps', () => {
  it('defines steps for each operation type', () => {
    expect(AI_PROGRESS_STEPS['outfit-suggestion'].length).toBeGreaterThanOrEqual(4);
    expect(AI_PROGRESS_STEPS['outfit-with-preview'].some((s) => s.label.includes('preview'))).toBe(true);
    expect(AI_PROGRESS_STEPS['wardrobe-analysis'].length).toBeGreaterThanOrEqual(3);
  });

  it('computes estimated duration from step timings', () => {
    const total = getEstimatedDurationMs('outfit-suggestion');
    const sum = AI_PROGRESS_STEPS['outfit-suggestion'].reduce((acc, step) => acc + step.durationMs, 0);
    expect(total).toBe(sum);
  });

  it('formats durations for display', () => {
    expect(formatDuration(12)).toBe('12s');
    expect(formatDuration(75)).toBe('1m 15s');
    expect(formatDuration(120)).toBe('2m');
  });
});
