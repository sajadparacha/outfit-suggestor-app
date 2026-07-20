import React from 'react';
import {
  DayOfWeek,
  WeekPlanDay,
  WEEK_DAY_LABELS,
  WEEK_DAY_SHORT_LABELS,
  formatOccasionLabel,
  getWeekDayStatus,
} from '../../../models/WeekPlanModels';
import {
  dayCardSelectedClass,
  plannerSurfaceSoft,
  statusLabel,
  statusPillClass,
} from './weekPlanStyles';

function outfitPreviewThumbs(day: WeekPlanDay): string[] {
  const items = day.outfit?.matching_wardrobe_items;
  if (!items) return [];
  const thumbs: string[] = [];
  for (const slot of ['shirt', 'trouser', 'blazer', 'shoes', 'belt'] as const) {
    const list = items[slot];
    if (list?.[0]?.image_data) {
      thumbs.push(list[0].image_data);
    }
  }
  return thumbs.slice(0, 3);
}

export interface WeekDayCardProps {
  day: WeekPlanDay;
  selected: boolean;
  busy: boolean;
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
  onSelect,
  onUpdateDay,
}) => {
  const label = WEEK_DAY_LABELS[day.day_of_week as DayOfWeek] ?? `Day ${day.day_of_week}`;
  const short = WEEK_DAY_SHORT_LABELS[day.day_of_week as DayOfWeek] ?? label.slice(0, 3);
  const status = getWeekDayStatus(day);
  const thumbs = outfitPreviewThumbs(day);
  const occasion = formatOccasionLabel(day.occasion);

  return (
    <li
      className={`relative min-w-[7.5rem] max-w-[11rem] flex-shrink-0 overflow-hidden snap-start ${plannerSurfaceSoft} p-3 transition ${
        selected ? dayCardSelectedClass : 'hover:border-white/20'
      } min-[1200px]:min-w-0 min-[1200px]:max-w-none min-[1200px]:flex-1`}
      data-testid={`week-day-${day.day_of_week}`}
      data-status={status}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full min-w-0 flex-col text-left"
        aria-pressed={selected}
        aria-label={`${label}${selected ? ', selected' : ''}. Status: ${statusLabel[status]}`}
        data-testid={`week-day-select-${day.day_of_week}`}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            <span className="min-[768px]:hidden">{short}</span>
            <span className="hidden min-[768px]:inline">{label}</span>
          </p>
          {day.enabled && occasion ? (
            <p className="mt-0.5 truncate text-xs text-slate-400">{occasion}</p>
          ) : (
            <p className="mt-0.5 truncate text-xs text-slate-500">Off</p>
          )}
        </div>

        <div className="mt-2 flex h-10 min-w-0 items-center gap-1" aria-hidden={thumbs.length === 0}>
          {thumbs.length > 0 ? (
            thumbs.map((src, i) => (
              <img
                key={i}
                src={src.startsWith('data:') ? src : `data:image/jpeg;base64,${src}`}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-cover border border-white/10"
              />
            ))
          ) : day.outfit?.model_image ? (
            <img
              src={`data:image/png;base64,${day.outfit.model_image}`}
              alt=""
              className="h-10 w-8 shrink-0 rounded-lg object-cover border border-white/10"
            />
          ) : (
            <div className="flex h-10 w-full min-w-0 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[10px] text-slate-500">
              {status === 'rest' ? 'Rest' : 'No preview'}
            </div>
          )}
        </div>

        <span
          className={`mt-2 inline-flex max-w-full items-center justify-center rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold leading-tight ${statusPillClass[status]}`}
          data-testid={`week-day-status-${day.day_of_week}`}
        >
          <span className="truncate">{statusLabel[status]}</span>
        </span>
      </button>

      <label className="mt-2 flex min-w-0 cursor-pointer items-center gap-2 border-t border-white/5 pt-2">
        <input
          type="checkbox"
          checked={day.enabled}
          onChange={(e) => {
            onUpdateDay(day.day_of_week, { enabled: e.target.checked });
            onSelect();
          }}
          disabled={busy}
          aria-label={`Enable ${label}`}
          className="h-4 w-4 shrink-0 rounded border-white/20 bg-slate-800 text-brand-blue focus:ring-brand-blue"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="truncate text-xs text-slate-400">Plan this day</span>
      </label>
    </li>
  );
};

export default WeekDayCard;
