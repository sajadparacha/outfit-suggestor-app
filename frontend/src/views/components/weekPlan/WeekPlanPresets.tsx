import React, { useState } from 'react';
import {
  WeekPlan,
  WeekPlanPresetItem,
  WEEK_PLAN_PRESET_NAME_MAX,
  countEnabledDaysInPresetConfig,
  planHasGeneratedOutfits,
} from '../../../models/WeekPlanModels';
import { plannerSurface, primaryCtaClass, secondaryCtaClass } from './weekPlanStyles';

export interface WeekPlanPresetsProps {
  plan: WeekPlan;
  presets: WeekPlanPresetItem[];
  presetCount: number;
  presetLimit: number;
  presetAtLimit: boolean;
  busy: boolean;
  presetBusy: boolean;
  onSaveAs: (name: string) => void | Promise<void>;
  onUpdate: (presetId: number) => void | Promise<void>;
  onRename: (presetId: number, name: string) => void | Promise<void>;
  onDelete: (presetId: number) => void | Promise<void>;
  onLoad: (presetId: number) => void | Promise<void>;
}

const WeekPlanPresets: React.FC<WeekPlanPresetsProps> = ({
  plan,
  presets,
  presetCount,
  presetLimit,
  presetAtLimit,
  busy,
  presetBusy,
  onSaveAs,
  onUpdate,
  onRename,
  onDelete,
  onLoad,
}) => {
  const [saveAsName, setSaveAsName] = useState('');
  const [showSaveAs, setShowSaveAs] = useState(false);
  const disabled = busy || presetBusy;
  const hasOutfits = planHasGeneratedOutfits(plan);

  const handleSaveAs = async () => {
    const trimmed = saveAsName.trim();
    if (!trimmed) return;
    try {
      await onSaveAs(trimmed);
      setSaveAsName('');
      setShowSaveAs(false);
    } catch {
      // Keep the save form open; parent surfaces the error.
    }
  };

  const handleLoad = (presetId: number) => {
    if (hasOutfits) {
      const ok = window.confirm(
        'Load this configuration? Generated outfits for the current week will be cleared. Generate week again when ready.'
      );
      if (!ok) return;
    }
    onLoad(presetId);
  };

  const handleDelete = (preset: WeekPlanPresetItem) => {
    const ok = window.confirm(`Delete “${preset.name}”? This cannot be undone.`);
    if (ok) onDelete(preset.id);
  };

  const handleRename = (preset: WeekPlanPresetItem) => {
    const next = window.prompt('Rename configuration', preset.name);
    if (next == null) return;
    onRename(preset.id, next);
  };

  return (
    <section
      className={`${plannerSurface} p-4 min-[768px]:p-5`}
      aria-label="Saved configurations"
      data-testid="week-plan-presets"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Saved configurations</h2>
          <p className="mt-1 text-sm text-slate-400">
            Reusable week setups (days, occasions, styles, reminder)—not outfits. Generate after
            loading.
          </p>
        </div>
        {presetLimit > 0 && (
          <p
            className="text-sm font-medium text-slate-300"
            data-testid="week-plan-presets-count"
          >
            {presetCount} of {presetLimit}
          </p>
        )}
      </div>

      {presetAtLimit && (
        <p
          className="mt-3 text-sm text-amber-200/90"
          data-testid="week-plan-presets-at-limit"
        >
          You have reached your saved configuration limit. Delete one to save a new setup.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!showSaveAs ? (
          <button
            type="button"
            onClick={() => setShowSaveAs(true)}
            disabled={disabled || presetAtLimit}
            className={primaryCtaClass}
            data-testid="week-plan-preset-save-as"
            title={presetAtLimit ? 'Delete a configuration to save a new one' : undefined}
          >
            Save as…
          </button>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-2">
            <input
              type="text"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value.slice(0, WEEK_PLAN_PRESET_NAME_MAX))}
              placeholder="Configuration name"
              maxLength={WEEK_PLAN_PRESET_NAME_MAX}
              disabled={disabled || presetAtLimit}
              className="min-w-[12rem] flex-1 rounded-xl border border-white/10 bg-[#0A0E1A]/80 px-3 py-2 text-sm text-slate-100 focus:border-brand-blue/50 focus:outline-none focus:ring-1 focus:ring-brand-blue/40"
              data-testid="week-plan-preset-save-as-input"
            />
            <button
              type="button"
              onClick={handleSaveAs}
              disabled={disabled || presetAtLimit || !saveAsName.trim()}
              className={primaryCtaClass}
              data-testid="week-plan-preset-save-as-confirm"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSaveAs(false);
                setSaveAsName('');
              }}
              disabled={disabled}
              className={secondaryCtaClass}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {presets.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400" data-testid="week-plan-presets-empty">
          No saved configurations yet. Set up your week, then use Save as… to keep a reusable
          template.
        </p>
      ) : (
        <ul className="mt-4 space-y-2" data-testid="week-plan-presets-list">
          {presets.map((preset) => {
            const enabledDays = countEnabledDaysInPresetConfig(preset.config);
            return (
              <li
                key={preset.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0A0E1A]/50 px-4 py-3"
                data-testid={`week-plan-preset-item-${preset.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{preset.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {enabledDays} day{enabledDays === 1 ? '' : 's'}
                    {preset.updated_at ? ` · updated ${preset.updated_at}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoad(preset.id)}
                    disabled={disabled}
                    className="min-h-[36px] rounded-full border border-brand-blue/40 px-3 py-1.5 text-xs font-medium text-brand-blue transition hover:bg-brand-blue/10 disabled:opacity-50"
                    data-testid={`week-plan-preset-load-${preset.id}`}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate(preset.id)}
                    disabled={disabled}
                    className="min-h-[36px] rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                    data-testid={`week-plan-preset-update-${preset.id}`}
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRename(preset)}
                    disabled={disabled}
                    className="min-h-[36px] rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                    data-testid={`week-plan-preset-rename-${preset.id}`}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(preset)}
                    disabled={disabled}
                    className="min-h-[36px] rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                    data-testid={`week-plan-preset-delete-${preset.id}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default WeekPlanPresets;
