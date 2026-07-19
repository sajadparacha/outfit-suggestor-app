import {
  createEmptyWeekPlan,
  normalizeWeekPlanDays,
  toUpsertPayload,
  getDeviceTimezone,
  DEFAULT_REMINDER_TIME,
  DEFAULT_SHARED_STYLE,
} from '../models/WeekPlanModels';

describe('WeekPlanModels helpers', () => {
  it('createEmptyWeekPlan builds seven disabled days with defaults', () => {
    const plan = createEmptyWeekPlan('America/New_York');
    expect(plan.reminder_time).toBe(DEFAULT_REMINDER_TIME);
    expect(plan.shared_style).toBe(DEFAULT_SHARED_STYLE);
    expect(plan.timezone).toBe('America/New_York');
    expect(plan.days).toHaveLength(7);
    expect(plan.days.every((d) => !d.enabled)).toBe(true);
    expect(plan.days.map((d) => d.day_of_week)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('normalizeWeekPlanDays fills missing days', () => {
    const plan = createEmptyWeekPlan('UTC');
    plan.days = [
      {
        day_of_week: 0,
        enabled: true,
        occasion: 'work',
        style: 'classic',
        use_wardrobe_only: true,
        outfit: null,
      },
      {
        day_of_week: 2,
        enabled: true,
        occasion: 'party',
        style: 'classic',
        use_wardrobe_only: true,
        outfit: null,
      },
    ];
    const normalized = normalizeWeekPlanDays(plan);
    expect(normalized.days).toHaveLength(7);
    expect(normalized.days[0].enabled).toBe(true);
    expect(normalized.days[0].occasion).toBe('work');
    expect(normalized.days[1].enabled).toBe(false);
    expect(normalized.days[2].occasion).toBe('party');
  });

  it('toUpsertPayload strips outfits from days', () => {
    const plan = createEmptyWeekPlan('UTC');
    plan.days[0] = {
      day_of_week: 0,
      enabled: true,
      occasion: 'work',
      style: 'minimal',
      use_wardrobe_only: false,
      outfit: {
        summary: 'Look',
        shirt: 's',
        trouser: 't',
        blazer: 'b',
        shoes: 'sh',
        belt: 'be',
        reasoning: 'r',
      },
    };
    const payload = toUpsertPayload(plan);
    expect(payload.days[0]).toEqual({
      day_of_week: 0,
      enabled: true,
      occasion: 'work',
      style: 'minimal',
      use_wardrobe_only: false,
    });
    expect('outfit' in payload.days[0]).toBe(false);
  });

  it('getDeviceTimezone returns a non-empty string', () => {
    expect(typeof getDeviceTimezone()).toBe('string');
    expect(getDeviceTimezone().length).toBeGreaterThan(0);
  });
});
