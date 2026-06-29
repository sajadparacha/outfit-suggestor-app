import {
  AI_PROGRESS_STEPS,
  formatDuration,
  getEstimatedDurationMs,
  resolveStepFromMessage,
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

  describe('random-history', () => {
    const steps = AI_PROGRESS_STEPS['random-history'];

    it('defines three staged steps with expected labels and durations', () => {
      expect(steps).toHaveLength(3);
      expect(steps[0]).toMatchObject({ id: 'fetch', label: 'Loading your saved looks', durationMs: 2500 });
      expect(steps[1]).toMatchObject({ id: 'pick', label: 'Finding a varied outfit', durationMs: 2000 });
      expect(steps[2]).toMatchObject({ id: 'prepare', label: 'Preparing your look', durationMs: 2000 });
    });

    it('computes estimated duration from step timings', () => {
      expect(getEstimatedDurationMs('random-history')).toBe(6500);
    });

    it('resolves step index from loading messages', () => {
      expect(resolveStepFromMessage('Picking a random look from your history...', steps)).toBe(0);
      expect(resolveStepFromMessage('Finding a varied outfit...', steps)).toBe(1);
      expect(resolveStepFromMessage('Preparing your look...', steps)).toBe(2);
      expect(resolveStepFromMessage('Scanning entries...', steps)).toBe(2);
    });
  });

  describe('past-suggestions', () => {
    const steps = AI_PROGRESS_STEPS['past-suggestions'];

    it('defines three staged steps with expected labels and durations', () => {
      expect(steps).toHaveLength(3);
      expect(steps[0]).toMatchObject({ id: 'fetch', label: 'Loading your saved looks', durationMs: 2500 });
      expect(steps[1]).toMatchObject({ id: 'filter', label: 'Finding outfits for this item', durationMs: 2000 });
      expect(steps[2]).toMatchObject({ id: 'prepare', label: 'Preparing suggestions', durationMs: 2000 });
    });

    it('computes estimated duration from step timings', () => {
      expect(getEstimatedDurationMs('past-suggestions')).toBe(6500);
    });

    it('resolves step index from loading messages', () => {
      expect(resolveStepFromMessage('Loading past suggestions for this item…', steps)).toBe(0);
      expect(resolveStepFromMessage('Loading your saved looks…', steps)).toBe(0);
      expect(resolveStepFromMessage('Finding outfits for this item…', steps)).toBe(1);
      expect(resolveStepFromMessage('Preparing suggestions…', steps)).toBe(2);
    });
  });
});
