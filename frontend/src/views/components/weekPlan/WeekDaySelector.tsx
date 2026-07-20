import React from 'react';
import {
  DayOfWeek,
  WeekPlanDay,
  WEEK_DAY_SHORT_LABELS,
  WeekDayStatus,
  getWeekDayStatus,
} from '../../../models/WeekPlanModels';
import WeekDayCard from './WeekDayCard';
import { plannerSurface } from './weekPlanStyles';

function statusDotClass(status: WeekDayStatus): string {
  switch (status) {
    case 'ready':
      return 'bg-emerald-400';
    case 'missing':
      return 'bg-brand-purple';
    case 'rest':
      return 'bg-slate-500';
    default:
      return 'bg-slate-400';
  }
}

export interface WeekDaySelectorProps {
  days: WeekPlanDay[];
  selectedDay: number;
  busy: boolean;
  enabledDayCount: number;
  onSelectDay: (dayOfWeek: number) => void;
  onUpdateDay: (
    dayOfWeek: number,
    patch: {
      enabled?: boolean;
      occasion?: string;
      style?: string;
      use_wardrobe_only?: boolean;
    }
  ) => void;
}

const WeekDaySelector: React.FC<WeekDaySelectorProps> = ({
  days,
  selectedDay,
  busy,
  enabledDayCount,
  onSelectDay,
  onUpdateDay,
}) => (
  <section
    className={`${plannerSurface} p-4 min-[768px]:p-5`}
    aria-label="Week overview"
    data-testid="week-day-selector"
  >
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold text-white">Week overview</h2>
      <p className="hidden text-xs text-slate-500 min-[768px]:block min-[1200px]:hidden">
        Swipe for more days →
      </p>
    </div>

    {enabledDayCount === 0 && (
      <p className="mb-3 text-sm text-slate-400" data-testid="week-empty-days">
        Turn on the days you want to plan.
      </p>
    )}

    {/* Compact status strip — phones */}
    <div
      className="mb-3 flex gap-1 overflow-x-auto pb-1 min-[768px]:hidden"
      role="tablist"
      aria-label="Day status strip"
      data-testid="week-day-strip"
    >
      {days.map((day) => {
        const status = getWeekDayStatus(day);
        const short =
          WEEK_DAY_SHORT_LABELS[day.day_of_week as DayOfWeek] ?? `D${day.day_of_week}`;
        const selected = selectedDay === day.day_of_week;
        return (
          <button
            key={day.day_of_week}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={`${short}, ${status.replace('_', ' ')}`}
            onClick={() => onSelectDay(day.day_of_week)}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium transition ${
              selected
                ? 'bg-brand-purple/20 text-white ring-2 ring-brand-purple'
                : 'bg-white/5 text-slate-300'
            }`}
            data-testid={`week-day-strip-${day.day_of_week}`}
          >
            <span>{short}</span>
            <span
              className={`mt-1 h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>

    {/* Day cards — horizontal scroll on tablet; full row on desktop (still in DOM on phone for a11y/tests) */}
    <ul
      className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 min-[1200px]:overflow-visible"
      data-testid="week-day-cards"
    >
      {days.map((day) => (
        <WeekDayCard
          key={day.day_of_week}
          day={day}
          selected={selectedDay === day.day_of_week}
          busy={busy}
          onSelect={() => onSelectDay(day.day_of_week)}
          onUpdateDay={onUpdateDay}
        />
      ))}
    </ul>
  </section>
);

export default WeekDaySelector;
