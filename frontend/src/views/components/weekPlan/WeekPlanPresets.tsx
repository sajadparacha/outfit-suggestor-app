import React, { useState } from 'react';
import {
  WeekPlan,
  WeekPlanPresetItem,
  WEEK_PLAN_PRESET_NAME_MAX,
  countEnabledDaysInPresetConfig,
  formatLocalizedDateTime,
  planHasGeneratedOutfits,
} from '../../../models/WeekPlanModels';
import { plannerSurface, secondaryCtaClass } from './weekPlanStyles';

const RECENT_LIMIT = 3;

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
  const [showAll, setShowAll] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const disabled = busy || presetBusy;
  const hasOutfits = planHasGeneratedOutfits(plan);
  const visible = showAll ? presets : presets.slice(0, RECENT_LIMIT);

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
        'Load this planning template? Generated outfits for the current week will be cleared. Generate outfits again when ready.'
      );
      if (!ok) return;
    }
    onLoad(presetId);
    setOpenMenuId(null);
  };

  const handleDelete = (preset: WeekPlanPresetItem) => {
    const ok = window.confirm(`Delete “${preset.name}”? This cannot be undone.`);
    if (ok) onDelete(preset.id);
    setOpenMenuId(null);
  };

  const handleRename = (preset: WeekPlanPresetItem) => {
    const next = window.prompt('Rename planning template', preset.name);
    if (next == null) return;
    onRename(preset.id, next);
    setOpenMenuId(null);
  };

  return (
    <section
      className={`${plannerSurface} p-4 min-[768px]:p-5`}
      aria-label="Planning templates"
      data-testid="week-plan-presets"
    >
      <details className="group" data-testid="week-plan-presets-disclosure">
        <summary className="flex min-h-[44px] cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">Planning templates</h2>
            <p className="mt-1 text-sm text-slate-400">
              Prefs only (days, occasions, styles)—not outfits.
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
          <span className="text-slate-500 transition group-open:rotate-180" aria-hidden>
            ▼
          </span>
        </summary>

        <div className="mt-4 border-t border-white/5 pt-4">
          {presetAtLimit && (
            <p
              className="mb-3 text-sm text-amber-200/90"
              data-testid="week-plan-presets-at-limit"
            >
              You have reached your planning template limit. Delete one to save a new setup.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {!showSaveAs ? (
              <button
                type="button"
                onClick={() => setShowSaveAs(true)}
                disabled={disabled || presetAtLimit}
                className={secondaryCtaClass}
                data-testid="week-plan-preset-save-as"
                title={presetAtLimit ? 'Delete a template to save a new one' : undefined}
              >
                Save as…
              </button>
            ) : (
              <div className="flex w-full flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={saveAsName}
                  onChange={(e) =>
                    setSaveAsName(e.target.value.slice(0, WEEK_PLAN_PRESET_NAME_MAX))
                  }
                  placeholder="Template name"
                  maxLength={WEEK_PLAN_PRESET_NAME_MAX}
                  disabled={disabled || presetAtLimit}
                  className="min-w-[12rem] flex-1 rounded-xl border border-white/10 bg-[#0A0E1A]/80 px-3 py-2 text-sm text-slate-100 focus:border-brand-blue/50 focus:outline-none focus:ring-1 focus:ring-brand-blue/40"
                  data-testid="week-plan-preset-save-as-input"
                />
                <button
                  type="button"
                  onClick={handleSaveAs}
                  disabled={disabled || presetAtLimit || !saveAsName.trim()}
                  className={secondaryCtaClass}
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
              No planning templates yet. Set up your week, then use Save as… to keep a reusable
              template.
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-2" data-testid="week-plan-presets-list">
                {visible.map((preset) => {
                  const enabledDays = countEnabledDaysInPresetConfig(preset.config);
                  const updated = formatLocalizedDateTime(preset.updated_at);
                  return (
                    <li
                      key={preset.id}
                      className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0A0E1A]/50 px-4 py-3"
                      data-testid={`week-plan-preset-item-${preset.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{preset.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {enabledDays} day{enabledDays === 1 ? '' : 's'}
                          {updated ? ` · ${updated}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoad(preset.id)}
                          disabled={disabled}
                          className="min-h-[44px] rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                          data-testid={`week-plan-preset-load-${preset.id}`}
                        >
                          Load
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId((id) => (id === preset.id ? null : preset.id))
                            }
                            disabled={disabled}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-50"
                            aria-label={`More actions for ${preset.name}`}
                            aria-expanded={openMenuId === preset.id}
                            data-testid={`week-plan-preset-menu-${preset.id}`}
                          >
                            ⋯
                          </button>
                          {openMenuId === preset.id && (
                            <div
                              className="absolute right-0 z-10 mt-1 min-w-[10rem] space-y-1 rounded-xl border border-white/10 bg-[#151B2D] p-2 shadow-xl"
                              role="menu"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  onUpdate(preset.id);
                                  setOpenMenuId(null);
                                }}
                                disabled={disabled}
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
                                data-testid={`week-plan-preset-update-${preset.id}`}
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleRename(preset)}
                                disabled={disabled}
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
                                data-testid={`week-plan-preset-rename-${preset.id}`}
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleDelete(preset)}
                                disabled={disabled}
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                                data-testid={`week-plan-preset-delete-${preset.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {presets.length > RECENT_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-3 min-h-[44px] text-sm font-medium text-slate-300 underline-offset-2 hover:underline"
                  data-testid="week-plan-presets-view-all"
                >
                  {showAll ? 'Show less' : 'View all'}
                </button>
              )}
            </>
          )}
        </div>
      </details>
    </section>
  );
};

export default WeekPlanPresets;
