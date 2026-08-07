import React from 'react';
import {
  DayOfWeek,
  WeekPlanDay,
  WEEK_DAY_LABELS,
  WEEK_DAY_SHORT_LABELS,
  formatDayOccasionStyleLine,
  getExceptionalStatusLabel,
  getWeekDayPreviewThumbSources,
  getWeekDayStatus,
} from '../../../models/WeekPlanModels';
import {
  dayCardSelectedClass,
  plannerSurfaceSoft,
  statusPillClass,
} from './weekPlanStyles';

export interface WeekDayCardProps {
  day: WeekPlanDay;
  selected: boolean;
  busy: boolean;
  generating?: boolean;
  calendarDate?: string;
  onSelect: () => void;
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

const WeekDayCard: React.FC<WeekDayCardProps> = ({
  day,
  selected,
  busy,
  generating = false,
  calendarDate,
  onSelect,
  onUpdateDay,
}) => {
  const label = WEEK_DAY_LABELS[day.day_of_week as DayOfWeek] ?? `Day ${day.day_of_week}`;
  const short = WEEK_DAY_SHORT_LABELS[day.day_of_week as DayOfWeek] ?? label.slice(0, 3);
  const status = getWeekDayStatus(day, { generating });
  const exceptionalLabel = getExceptionalStatusLabel(status);
  const thumbs = getWeekDayPreviewThumbSources(day);
  const occasionStyleLine = formatDayOccasionStyleLine(day.occasion, day.style);

  const togglePlanned = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const nextEnabled = !day.enabled;
    onUpdateDay(day.day_of_week, { enabled: nextEnabled });
    // Selecting when planning a day; unplanning leaves current selection alone.
    if (nextEnabled) onSelect();
  };

  return (
    <li
      className={`relative min-w-[8rem] max-w-[12rem] flex-shrink-0 overflow-hidden snap-start ${plannerSurfaceSoft} p-3 transition ${
        selected ? dayCardSelectedClass : 'hover:border-white/20'
      } min-[1200px]:min-w-0 min-[1200px]:max-w-none min-[1200px]:flex-1`}
      data-testid={`week-day-${day.day_of_week}`}
      data-status={status}
    >
      {selected && (
        <span
          className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-purple"
          aria-hidden
          data-testid={`week-day-selected-marker-${day.day_of_week}`}
        />
      )}
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full min-w-0 flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
        aria-pressed={selected}
        aria-label={`${label}${selected ? ', selected' : ''}${
          exceptionalLabel ? `. Status: ${exceptionalLabel}` : ''
        }${
          day.enabled ? `, planned, ${occasionStyleLine}` : ', not planned'
        }`}
        data-testid={`week-day-select-${day.day_of_week}`}
      >
        <div className="min-w-0 pl-1">
          <p className="truncate text-sm font-semibold text-white">
            <span className="min-[768px]:hidden">{short}</span>
            <span className="hidden min-[768px]:inline">{label}</span>
          </p>
          {calendarDate && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{calendarDate}</p>
          )}
          {day.enabled ? (
            <p className="mt-0.5 truncate text-xs text-slate-300">
              {occasionStyleLine}
            </p>
          ) : (
            <p className="mt-0.5 truncate text-xs text-slate-400">Off</p>
          )}
        </div>

        <div
          className="mt-2 flex h-12 min-w-0 items-center gap-1 pl-1"
          aria-hidden={thumbs.length === 0 && !day.outfit?.model_image}
        >
          {thumbs.length > 0 ? (
            thumbs.map((src, i) => (
              <img
                key={i}
                src={src.startsWith('data:') ? src : `data:image/jpeg;base64,${src}`}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover border border-white/10"
              />
            ))
          ) : day.outfit?.model_image ? (
            <img
              src={`data:image/png;base64,${day.outfit.model_image}`}
              alt=""
              className="h-12 w-9 shrink-0 rounded-lg object-cover border border-white/10"
            />
          ) : (
            <div className="flex h-12 w-full min-w-0 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-[10px] text-slate-400">
              {day.enabled ? 'No preview' : '—'}
            </div>
          )}
        </div>

        {exceptionalLabel && exceptionalLabel !== 'Not planned' && (
          <span
            className={`mt-2 ml-1 inline-flex max-w-full items-center justify-center rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold leading-tight ${statusPillClass[status]}`}
            data-testid={`week-day-status-${day.day_of_week}`}
          >
            <span className="truncate">{exceptionalLabel}</span>
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={togglePlanned}
        disabled={busy}
        aria-pressed={day.enabled}
        aria-label={day.enabled ? `Mark ${label} as not planned` : `Mark ${label} as planned`}
        className={`mt-2 flex min-h-[44px] w-full items-center justify-center rounded-lg border px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50 ${
          day.enabled
            ? 'border-brand-blue/40 bg-brand-blue/10 text-sky-200'
            : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5'
        }`}
        data-testid={`week-day-planned-${day.day_of_week}`}
      >
        {day.enabled ? 'Planned' : 'Include day'}
      </button>
    </li>
  );
};

export default WeekDayCard;
