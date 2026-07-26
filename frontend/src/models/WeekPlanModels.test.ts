import {
  createEmptyWeekPlan,
  normalizeWeekPlanDays,
  toUpsertPayload,
  getDeviceTimezone,
  getMissingOutfitSlots,
  getWeekDayPreviewThumbSources,
  getWeekDayStatus,
  DEFAULT_REMINDER_TIME,
  DEFAULT_SHARED_STYLE,
  WeekPlanDay,
  WeekPlanOutfit,
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

  it('getWeekDayPreviewThumbSources skips matching images for empty/missing slots', () => {
    const outfit: WeekPlanOutfit = {
      summary: 'Everyday look',
      shirt: 'Navy shirt',
      trouser: 'Tan chinos',
      blazer: '',
      shoes: 'Brown brogues',
      belt: 'Consider adding a belt',
      reasoning: 'Test',
      matching_wardrobe_items: {
        shirt: [
          {
            id: 1,
            category: 'shirt',
            color: 'navy',
            description: 'Navy shirt',
            image_data: 'shirt_img',
          },
        ],
        trouser: [
          {
            id: 2,
            category: 'trouser',
            color: 'tan',
            description: 'Tan chinos',
            image_data: 'trouser_img',
          },
        ],
        blazer: [
          {
            id: 3,
            category: 'blazer',
            color: 'navy',
            description: 'Navy blazer candidate',
            image_data: 'blazer_img',
          },
        ],
        shoes: [
          {
            id: 4,
            category: 'shoes',
            color: 'brown',
            description: 'Brown brogues',
            image_data: 'shoes_img',
          },
        ],
        belt: [],
      },
    };
    const day: WeekPlanDay = {
      day_of_week: 3,
      enabled: true,
      occasion: 'everyday',
      style: 'trendy',
      use_wardrobe_only: true,
      outfit,
    };

    expect(getMissingOutfitSlots(outfit).map((s) => s.key)).toEqual([]);
    expect(getWeekDayStatus(day)).toBe('ready');
    expect(getWeekDayPreviewThumbSources(day)).toEqual([
      'shirt_img',
      'trouser_img',
      'shoes_img',
    ]);
    expect(getWeekDayPreviewThumbSources(day)).not.toContain('blazer_img');
  });

  it('getMissingOutfitSlots flags empty required slots, not empty blazer or accessory', () => {
    const outfit: WeekPlanOutfit = {
      summary: 'Incomplete',
      shirt: 'Navy shirt',
      trouser: '',
      blazer: '',
      shoes: 'Brown brogues',
      belt: '',
      reasoning: 'Test',
    };
    expect(getMissingOutfitSlots(outfit).map((s) => s.key)).toEqual(['trouser']);
  });
});
