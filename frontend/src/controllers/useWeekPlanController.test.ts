import { renderHook, act, waitFor } from '@testing-library/react';
import { useWeekPlanController } from './useWeekPlanController';
import apiService from '../services/ApiService';
import { WeekPlan, WeekPlanToday } from '../models/WeekPlanModels';

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
});
