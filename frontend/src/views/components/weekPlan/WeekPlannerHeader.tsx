import React from 'react';
import {
  formatLocalizedTime,
  formatWeekDateRange,
} from '../../../models/WeekPlanModels';
import { primaryCtaClass, secondaryCtaClass } from './weekPlanStyles';

export type DocumentStateKind =
  | 'generating'
  | 'unsaved'
  | 'saved'
  | 'last_saved'
  | 'idle';

export interface WeekPlannerHeaderProps {
  timezone?: string;
  generating?: boolean;
  saving?: boolean;
  isDirty?: boolean;
  lastSavedAt?: Date | null;
  hasGeneratedOutfits?: boolean;
  enabledDayCount?: number;
  busy?: boolean;
  onPrimaryAction?: () => void;
  onSecondaryGenerate?: () => void;
}

function documentStateLabel(props: {
  generating: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
  timezone?: string;
}): { kind: DocumentStateKind; text: string } {
  if (props.generating) {
    return { kind: 'generating', text: 'Generating…' };
  }
  if (props.isDirty) {
    return { kind: 'unsaved', text: 'Unsaved changes' };
  }
  if (props.lastSavedAt) {
    const time = formatLocalizedTime(props.lastSavedAt, props.timezone);
    return {
      kind: 'last_saved',
      text: time ? `Last saved ${time}` : 'Saved',
    };
  }
  return { kind: 'saved', text: 'Saved' };
}

const WeekPlannerHeader: React.FC<WeekPlannerHeaderProps> = ({
  timezone,
  generating = false,
  saving = false,
  isDirty = false,
  lastSavedAt = null,
  hasGeneratedOutfits = false,
  enabledDayCount = 0,
  busy = false,
  onPrimaryAction,
  onSecondaryGenerate,
}) => {
  const weekRange = formatWeekDateRange(new Date(), timezone);
  const doc = documentStateLabel({ generating, isDirty, lastSavedAt, timezone });
  const showSaveAsPrimary = hasGeneratedOutfits && isDirty;
  const primaryLabel = saving
    ? 'Saving…'
    : generating
      ? 'Generating…'
      : showSaveAsPrimary
        ? 'Save plan'
        : 'Generate outfits';
  const primaryDisabled =
    busy ||
    (showSaveAsPrimary ? false : enabledDayCount === 0) ||
    (!showSaveAsPrimary && generating);

  return (
    <header className="space-y-4" data-testid="week-planner-header">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-xl font-bold text-white min-[768px]:text-2xl min-[1200px]:text-3xl">
            <span className="min-[768px]:hidden">Week Planner</span>
            <span className="hidden min-[768px]:inline">Week Outfit Planner</span>
          </h1>
          <p
            className="text-sm font-medium text-slate-300"
            data-testid="week-planner-date-range"
          >
            {weekRange}
          </p>
          <p className="text-sm text-slate-300">
            Select days, generate outfits, review each day, then save.
          </p>
          <p
            className={`text-xs font-semibold ${
              doc.kind === 'unsaved'
                ? 'text-amber-200'
                : doc.kind === 'generating'
                  ? 'text-sky-200'
                  : 'text-slate-400'
            }`}
            data-testid="week-planner-doc-state"
            role="status"
          >
            {doc.text}
          </p>
        </div>

        {onPrimaryAction && (
          <div className="flex w-full flex-col gap-2 min-[480px]:w-auto min-[480px]:items-end">
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={primaryDisabled}
              className={`${primaryCtaClass} w-full min-[480px]:w-auto`}
              data-testid={showSaveAsPrimary ? 'week-save-plan' : 'week-generate-week'}
              aria-busy={saving || generating}
            >
              {primaryLabel}
            </button>
            {showSaveAsPrimary && onSecondaryGenerate && (
              <button
                type="button"
                onClick={onSecondaryGenerate}
                disabled={busy || enabledDayCount === 0}
                className={`${secondaryCtaClass} w-full min-[480px]:w-auto`}
                data-testid="week-generate-week"
              >
                Generate outfits
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default WeekPlannerHeader;
