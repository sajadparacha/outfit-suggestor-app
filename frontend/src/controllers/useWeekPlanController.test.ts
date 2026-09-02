import { renderHook, act, waitFor } from '@testing-library/react';
import { useWeekPlanController } from './useWeekPlanController';
import apiService from '../services/ApiService';
import { WeekPlan, WeekPlanPresetItem, WeekPlanToday } from '../models/WeekPlanModels';
import { WardrobeItem } from '../models/WardrobeModels';

jest.mock('../services/ApiService', () => ({
  __esModule: true,
  default: {
    getWeekPlan: jest.fn(),
    getWeekPlanToday: jest.fn(),
    putWeekPlan: jest.fn(),
    generateWeekPlan: jest.fn(),
    deleteWeekPlan: jest.fn(),
    getWeekPlanHistory: jest.fn(),
    restoreWeekPlanHistory: jest.fn(),
    getWeekPlanPresets: jest.fn(),
    createWeekPlanPreset: jest.fn(),
    updateWeekPlanPreset: jest.fn(),
    deleteWeekPlanPreset: jest.fn(),
    applyWeekPlanPreset: jest.fn(),
  },
}));

const mockApi = apiService as jest.Mocked<typeof apiService>;

const emptyPlan: WeekPlan = {
  reminder_time: '07:30',
  timezone: 'UTC',
  shared_style: 'classic',
  shared_season: 'all-season',
  days: Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    enabled: false,
    occasion: 'everyday',
    style: 'classic',
    use_wardrobe_only: true,
    outfit: null,
  })),
};

const todayEmpty: WeekPlanToday = {
  day_of_week: 0,
  enabled: false,
  occasion: null,
  outfit: null,
  reminder_time: '07:30',
  timezone: 'UTC',
  has_plan: true,
};

describe('useWeekPlanController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getWeekPlan.mockResolvedValue(emptyPlan);
    mockApi.getWeekPlanToday.mockResolvedValue(todayEmpty);
    mockApi.getWeekPlanHistory.mockResolvedValue({ items: [] });
    mockApi.getWeekPlanPresets.mockResolvedValue({ items: [], count: 0, limit: 2 });
    mockApi.putWeekPlan.mockImplementation(async (body) => ({
      ...emptyPlan,
      ...body,
      days: body.days.map((d) => ({ ...d, outfit: null })),
    }));
  });

  it('loads plan and today when authenticated', async () => {
    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.plan).not.toBeNull();
    });

    expect(mockApi.getWeekPlan).toHaveBeenCalled();
    expect(mockApi.getWeekPlanToday).toHaveBeenCalled();
    expect(result.current.plan?.days).toHaveLength(7);
  });

  it('updateDay toggles enabled and occasion locally', async () => {
    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    act(() => {
      result.current.updateDay(0, { enabled: true, occasion: 'work' });
    });

    expect(result.current.plan?.days[0].enabled).toBe(true);
    expect(result.current.plan?.days[0].occasion).toBe('work');
    expect(result.current.enabledDayCount).toBe(1);
  });

  it('generateWeek saves then generates and refreshes today', async () => {
    const generated: WeekPlan = {
      ...emptyPlan,
      days: emptyPlan.days.map((d, i) =>
        i === 0
          ? {
              ...d,
              enabled: true,
              occasion: 'work',
              outfit: {
                summary: 'Monday work look',
                shirt: 'White shirt',
                trouser: 'Navy trousers',
                blazer: 'Gray blazer',
                shoes: 'Brown shoes',
                belt: 'Brown belt',
                reasoning: 'Clean',
              },
            }
          : d
      ),
    };
    mockApi.generateWeekPlan.mockResolvedValue(generated);
    mockApi.getWeekPlanToday.mockResolvedValue({
      ...todayEmpty,
      enabled: true,
      occasion: 'work',
      outfit: generated.days[0].outfit!,
    });

    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    act(() => {
      result.current.updateDay(0, { enabled: true, occasion: 'work' });
    });

    await act(async () => {
      await result.current.generateWeek();
    });

    expect(mockApi.putWeekPlan).toHaveBeenCalled();
    expect(mockApi.generateWeekPlan).toHaveBeenCalledWith();
    expect(result.current.plan?.days[0].outfit?.summary).toBe('Monday work look');
    expect(result.current.today?.outfit?.summary).toBe('Monday work look');
  });

  it('regenerateDay persists the latest day style even via a stale callback', async () => {
    mockApi.generateWeekPlan.mockImplementation(async () => {
      const body = mockApi.putWeekPlan.mock.calls.at(-1)?.[0];
      const days =
        body?.days.map((d) => ({
          ...d,
          outfit: d.day_of_week === 3 ? {
            summary: 'Thu look',
            shirt: 'Shirt',
            trouser: 'Trousers',
            blazer: 'Blazer',
            shoes: 'Shoes',
            belt: 'Belt',
            reasoning: 'ok',
          } : null,
        })) ?? emptyPlan.days;
      return {
        ...emptyPlan,
        shared_season: body?.shared_season ?? emptyPlan.shared_season,
        reminder_time: body?.reminder_time ?? emptyPlan.reminder_time,
        days,
      };
    });

    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    act(() => {
      result.current.updateDay(3, { enabled: true, occasion: 'work' });
    });

    // Capture callback before style change (simulates regenerate wired to a prior render).
    const staleRegenerate = result.current.regenerateDay;

    act(() => {
      result.current.updateDay(3, { style: 'smart-casual' });
    });

    await act(async () => {
      await staleRegenerate(3);
    });

    const putBody = mockApi.putWeekPlan.mock.calls.at(-1)?.[0];
    expect(putBody?.days.find((d) => d.day_of_week === 3)?.style).toBe('smart-casual');
    expect(putBody?.days.find((d) => d.day_of_week === 3)?.occasion).toBe('work');
    expect(result.current.plan?.days[3].style).toBe('smart-casual');
  });

  it('loads presets with count and limit from API', async () => {
    const items: WeekPlanPresetItem[] = [
      {
        id: 1,
        name: 'Work week',
        config: {
          reminder_time: '07:30',
          shared_season: 'all-season',
          days: emptyPlan.days.map((d, i) => ({ ...d, enabled: i < 5 })),
        },
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];
    mockApi.getWeekPlanPresets.mockResolvedValue({
      items,
      count: 1,
      limit: 3,
      limit_source: 'tier',
    });

    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.presets).toHaveLength(1);
    });

    expect(result.current.presetCount).toBe(1);
    expect(result.current.presetLimit).toBe(3);
    expect(result.current.presetAtLimit).toBe(false);
  });

  it('savePresetAs creates preset and refreshes list', async () => {
    mockApi.createWeekPlanPreset.mockResolvedValue({
      id: 2,
      name: 'Casual',
      config: {
        reminder_time: '07:30',
        shared_season: 'all-season',
        days: emptyPlan.days,
      },
      created_at: '2026-01-02',
      updated_at: '2026-01-02',
    });
    mockApi.getWeekPlanPresets
      .mockResolvedValueOnce({ items: [], count: 0, limit: 2 })
      .mockResolvedValueOnce({
        items: [
          {
            id: 2,
            name: 'Casual',
            config: {
              reminder_time: '07:30',
              shared_season: 'all-season',
              days: emptyPlan.days,
            },
            created_at: '2026-01-02',
            updated_at: '2026-01-02',
          },
        ],
        count: 1,
        limit: 2,
      });

    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    await act(async () => {
      await result.current.savePresetAs('Casual');
    });

    expect(mockApi.createWeekPlanPreset).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Casual' })
    );
    expect(result.current.presetCount).toBe(1);
    expect(result.current.presetLimit).toBe(2);
  });

  it('applyPreset loads configuration without generating', async () => {
    const applied: WeekPlan = {
      ...emptyPlan,
      days: emptyPlan.days.map((d, i) => ({
        ...d,
        enabled: i === 1,
        occasion: 'work',
        outfit: null,
      })),
    };
    mockApi.applyWeekPlanPreset.mockResolvedValue(applied);

    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    await act(async () => {
      await result.current.applyPreset(5);
    });

    expect(mockApi.applyWeekPlanPreset).toHaveBeenCalledWith(5);
    expect(mockApi.generateWeekPlan).not.toHaveBeenCalled();
    expect(result.current.plan?.days[1].enabled).toBe(true);
    expect(result.current.plan?.days[1].outfit).toBeNull();
  });

  it('deletePreset removes preset and refreshes count', async () => {
    mockApi.getWeekPlanPresets
      .mockResolvedValueOnce({
        items: [
          {
            id: 9,
            name: 'Old',
            config: {
              reminder_time: '07:30',
              shared_season: 'all-season',
              days: emptyPlan.days,
            },
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
        ],
        count: 1,
        limit: 1,
      })
      .mockResolvedValueOnce({ items: [], count: 0, limit: 1 });

    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );
    await waitFor(() => expect(result.current.presetCount).toBe(1));
    expect(result.current.presetAtLimit).toBe(true);

    await act(async () => {
      await result.current.deletePreset(9);
    });

    expect(mockApi.deleteWeekPlanPreset).toHaveBeenCalledWith(9);
    expect(result.current.presetCount).toBe(0);
    expect(result.current.presetAtLimit).toBe(false);
  });

  const sampleWardrobeItem: WardrobeItem = {
    id: 42,
    category: 'shirt',
    color: 'Blue',
    description: 'Oxford shirt',
    image_data: 'data:image/jpeg;base64,abc',
    name: 'Oxford',
    brand: null,
    size: null,
    tags: null,
    condition: null,
    wear_count: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  it('applyWardrobeItemToDaySlot sets pinned_items on the day', async () => {
    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    act(() => {
      result.current.updateDay(0, { enabled: true });
    });

    act(() => {
      result.current.applyWardrobeItemToDaySlot(0, 'shirt', sampleWardrobeItem);
    });

    const monday = result.current.plan?.days[0];
    expect(monday?.pinned_items?.shirt).toBe(42);
    expect(monday?.outfit?.shirt_id).toBe(42);
    expect(monday?.outfit?.shirt).toContain('Oxford');
  });

  it('unpinDaySlot clears pin and outfit slot', async () => {
    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    act(() => {
      result.current.updateDay(0, { enabled: true });
    });

    act(() => {
      result.current.applyWardrobeItemToDaySlot(0, 'shirt', sampleWardrobeItem);
    });

    act(() => {
      result.current.unpinDaySlot(0, 'shirt');
    });

    const monday = result.current.plan?.days[0];
    expect(monday?.pinned_items?.shirt).toBeUndefined();
    expect(monday?.pinned_items).toBeUndefined();
    expect(monday?.outfit?.shirt_id).toBeNull();
    expect(monday?.outfit?.shirt).toBe('');
  });

  it('savePlan sends pinned_items in upsert payload', async () => {
    const { result } = renderHook(() =>
      useWeekPlanController({ isAuthenticated: true, userId: 1 })
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    act(() => {
      result.current.updateDay(0, { enabled: true });
      result.current.applyWardrobeItemToDaySlot(0, 'trouser', {
        ...sampleWardrobeItem,
        id: 7,
        category: 'trouser',
        description: 'Chinos',
      });
    });

    await act(async () => {
      await result.current.savePlan();
    });

    const putBody = mockApi.putWeekPlan.mock.calls.at(-1)?.[0];
    const monday = putBody?.days.find((d) => d.day_of_week === 0);
    expect(monday?.pinned_items).toEqual({ trouser: 7 });
  });
});
