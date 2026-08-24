import React from 'react';
import { Filters } from '../../models/OutfitModels';
import {
  FILTER_OPTIONS,
  INSIGHTS_CLIMATE_OPTIONS,
  INSIGHTS_DRESS_CODE_OPTIONS,
  INSIGHTS_LIFESTYLE_OPTIONS,
  INSIGHTS_STYLE_ACCENT_OPTIONS,
  INSIGHTS_STYLE_PRIMARY_OPTIONS,
} from '../../utils/constants';
import { INSIGHTS_COPY } from '../../utils/insightsCopy';
import {
  InsightsClimate,
  InsightsDressCode,
  InsightsLifestyleState,
  InsightsLifestyleValue,
  InsightsStyleAccent,
  InsightsStylePrimary,
  loadInsightsLifestyle,
  resetInsightsLifestyle,
  saveInsightsLifestyle,
  toggleClimateChip,
  toggleDressCodeChip,
  toggleLifestyleChip,
  toggleStyleAccentChip,
  toggleStylePrimaryChip,
} from '../../utils/insightsLifestyle';
import { DEFAULT_FILTERS } from '../../utils/outfitPreferences';
import { MICRO_HELP } from '../../utils/microHelpCopy';

interface AnalysisPreferencesProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  preferenceText: string;
  setPreferenceText: (text: string) => void;
  onClear?: () => void;
  variant?: 'sidebar' | 'insights';
  showSharedHint?: boolean;
  useWardrobeOnly?: boolean;
  setUseWardrobeOnly?: (v: boolean) => void;
  showWardrobeOnly?: boolean;
}

const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}> = ({ label, value, onChange, ariaLabel, children }) => (
  <div className="rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2.5 transition hover:border-brand-blue/40">
    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[28px] cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium text-white focus:outline-none focus:ring-0"
        aria-label={ariaLabel}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
      >
        <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  </div>
);

const AnalysisPreferences: React.FC<AnalysisPreferencesProps> = ({
  filters,
  setFilters,
  preferenceText,
  setPreferenceText,
  onClear,
  variant = 'insights',
  showSharedHint = true,
  useWardrobeOnly = false,
  setUseWardrobeOnly,
  showWardrobeOnly = false,
}) => {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    setFilters({ ...DEFAULT_FILTERS });
    setPreferenceText('');
  };

  const resolved = {
    occasion: filters.occasion || DEFAULT_FILTERS.occasion,
    season: filters.season || DEFAULT_FILTERS.season,
    style: filters.style || DEFAULT_FILTERS.style,
  };

  const sharedHint = showSharedHint ? (
    <p className="text-xs text-brand-blue/90 rounded-xl border border-brand-blue/20 bg-brand-blue/10 px-3 py-2">
      Shared with Suggest — occasion, season, style, and notes stay in sync across outfit suggestions and wardrobe insights.
    </p>
  ) : null;

  if (variant === 'sidebar') {
    return (
      <div id="outfit-preferences" className="mt-5 space-y-3">
        {sharedHint}
        <div
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
          role="group"
          aria-label="Outfit preferences"
        >
          <FilterSelect
            label="Occasion"
            value={resolved.occasion}
            onChange={(value) => handleFilterChange('occasion', value)}
            ariaLabel="Select occasion"
          >
            {FILTER_OPTIONS.occasions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Season"
            value={resolved.season}
            onChange={(value) => handleFilterChange('season', value)}
            ariaLabel="Select season"
          >
            {FILTER_OPTIONS.seasons.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Style"
            value={resolved.style}
            onChange={(value) => handleFilterChange('style', value)}
            ariaLabel="Select style preference"
          >
            {FILTER_OPTIONS.styles.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>

          <NotesCell preferenceText={preferenceText} setPreferenceText={setPreferenceText} />
        </div>

        {showWardrobeOnly && setUseWardrobeOnly && (
          <label
            htmlFor="wardrobe-mode"
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <input
              type="checkbox"
              id="wardrobe-mode"
              checked={useWardrobeOnly}
              onChange={(event) => setUseWardrobeOnly(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-slate-800 text-brand-blue focus:ring-brand-blue focus:ring-offset-slate-900"
              aria-label="Use my wardrobe only"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-100">Use my wardrobe only</span>
              <span className="mt-1 block text-xs text-slate-400">{MICRO_HELP.WARDROBE_ONLY}</span>
            </span>
          </label>
        )}
      </div>
    );
  }

  return (
    <InsightsLifestyleForm
      preferenceText={preferenceText}
      setPreferenceText={setPreferenceText}
      onClear={onClear}
    />
  );
};

const chipClass = (selected: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors touch-manipulation ${
    selected
      ? 'border-brand-blue/50 bg-brand-blue/20 text-white'
      : 'border-white/15 bg-white/[0.04] text-slate-300 hover:border-brand-blue/40'
  }`;

const InsightsLifestyleForm: React.FC<{
  preferenceText: string;
  setPreferenceText: (text: string) => void;
  onClear?: () => void;
}> = ({ preferenceText, setPreferenceText, onClear }) => {
  const [lifestyle, setLifestyle] = React.useState<InsightsLifestyleState>(() => loadInsightsLifestyle());
  const [eventOpen, setEventOpen] = React.useState(Boolean(lifestyle.eventFocus));

  const updateLifestyle = (patch: Partial<InsightsLifestyleState>) => {
    setLifestyle((prev) => {
      const next = { ...prev, ...patch };
      saveInsightsLifestyle(next);
      return next;
    });
  };

  const handleMixTap = (value: InsightsLifestyleValue) => {
    const next = toggleLifestyleChip(lifestyle.lifestyleMix, lifestyle.primaryLifestyle, value);
    updateLifestyle({ lifestyleMix: next.mix, primaryLifestyle: next.primary });
  };

  const handleDressCodeTap = (value: InsightsDressCode) => {
    updateLifestyle({ dressCodes: toggleDressCodeChip(lifestyle.dressCodes, value) });
  };

  const handleClimateTap = (value: InsightsClimate) => {
    updateLifestyle({ climates: toggleClimateChip(lifestyle.climates, value) });
  };

  const handleStylePrimaryTap = (value: InsightsStylePrimary) => {
    updateLifestyle({ stylePrimaries: toggleStylePrimaryChip(lifestyle.stylePrimaries, value) });
  };

  const handleStyleAccentTap = (value: InsightsStyleAccent) => {
    updateLifestyle({ styleAccents: toggleStyleAccentChip(lifestyle.styleAccents, value) });
  };

  const handleClear = () => {
    setLifestyle(resetInsightsLifestyle());
    setEventOpen(false);
    if (onClear) {
      onClear();
      return;
    }
    setPreferenceText('');
  };

  return (
    <div id="insights.preferencesForm" className="space-y-5">
      <p className="text-xs text-brand-blue/90 rounded-xl border border-brand-blue/20 bg-brand-blue/10 px-3 py-2">
        {INSIGHTS_COPY.LIFESTYLE_ONLY_HINT}
      </p>

      <div
        id="insights.lifestyleMix"
        data-testid="insights.lifestyleMix"
        role="group"
        aria-label={INSIGHTS_COPY.LIFESTYLE_MIX_LABEL}
      >
        <p className="mb-2 block text-sm font-medium text-slate-200">{INSIGHTS_COPY.LIFESTYLE_MIX_LABEL}</p>
        <div className="flex flex-wrap gap-2">
          {INSIGHTS_LIFESTYLE_OPTIONS.map((opt) => {
            const selected = lifestyle.lifestyleMix.includes(opt.value);
            const isPrimary = selected && lifestyle.primaryLifestyle === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                aria-label={isPrimary ? `${opt.label}, ${INSIGHTS_COPY.PRIMARY_BADGE}` : opt.label}
                onClick={() => handleMixTap(opt.value)}
                className={chipClass(selected)}
              >
                {opt.label}
                {isPrimary && (
                  <span className="rounded-full bg-brand-blue/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-blue">
                    {INSIGHTS_COPY.PRIMARY_BADGE}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div id="insights.dressCode" data-testid="insights.dressCode">
        <p className="mb-2 block text-sm font-medium text-slate-200">{INSIGHTS_COPY.DRESS_CODE_LABEL}</p>
        <div role="group" aria-label={INSIGHTS_COPY.DRESS_CODE_LABEL} className="flex flex-wrap gap-2">
          {INSIGHTS_DRESS_CODE_OPTIONS.map((opt) => {
            const selected = lifestyle.dressCodes.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => handleDressCodeTap(opt.value as InsightsDressCode)}
                className={chipClass(selected)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div id="insights.seasonCore" data-testid="insights.seasonCore">
        <p className="mb-2 block text-sm font-medium text-slate-200">{INSIGHTS_COPY.SEASON_LABEL}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={INSIGHTS_COPY.SEASON_LABEL}>
          <button
            type="button"
            aria-pressed="true"
            aria-label={INSIGHTS_COPY.YEAR_ROUND_LABEL}
            className={chipClass(true)}
          >
            {INSIGHTS_COPY.YEAR_ROUND_LABEL}
          </button>
          {INSIGHTS_CLIMATE_OPTIONS.map((opt) => {
            const selected = lifestyle.climates.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                aria-label={opt.label}
                onClick={() => handleClimateTap(opt.value as InsightsClimate)}
                className={chipClass(selected)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div id="insights.stylePrimary" data-testid="insights.stylePrimary">
        <p className="mb-2 block text-sm font-medium text-slate-200">{INSIGHTS_COPY.STYLE_PRIMARY_LABEL}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={INSIGHTS_COPY.STYLE_PRIMARY_LABEL}>
          {INSIGHTS_STYLE_PRIMARY_OPTIONS.map((opt) => {
            const selected = lifestyle.stylePrimaries.includes(opt.value);
            const isPrimary = selected && lifestyle.stylePrimaries[0] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                aria-label={isPrimary ? `${opt.label}, ${INSIGHTS_COPY.PRIMARY_BADGE}` : opt.label}
                onClick={() => handleStylePrimaryTap(opt.value as InsightsStylePrimary)}
                className={chipClass(selected)}
              >
                {opt.label}
                {isPrimary && (
                  <span className="rounded-full bg-brand-blue/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-blue">
                    {INSIGHTS_COPY.PRIMARY_BADGE}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div id="insights.styleAccent" data-testid="insights.styleAccent">
        <p className="mb-2 block text-sm font-medium text-slate-200">{INSIGHTS_COPY.STYLE_ACCENT_LABEL}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={INSIGHTS_COPY.STYLE_ACCENT_LABEL}>
          <button
            type="button"
            aria-pressed={lifestyle.styleAccents.length === 0}
            onClick={() => updateLifestyle({ styleAccents: [] })}
            className={chipClass(lifestyle.styleAccents.length === 0)}
          >
            {INSIGHTS_COPY.ACCENT_NONE}
          </button>
          {INSIGHTS_STYLE_ACCENT_OPTIONS.map((opt) => {
            const selected = lifestyle.styleAccents.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => handleStyleAccentTap(opt.value as InsightsStyleAccent)}
                className={chipClass(selected)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div id="insights.eventFocus" data-testid="insights.eventFocus">
        <button
          type="button"
          onClick={() => setEventOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-left text-sm font-medium text-slate-200 hover:border-brand-blue/40"
          aria-expanded={eventOpen}
        >
          <span>{INSIGHTS_COPY.EVENT_FOCUS_LABEL}</span>
          <span className="text-xs text-slate-400">{eventOpen ? 'Hide' : 'Optional'}</span>
        </button>
        {eventOpen && (
          <select
            value={lifestyle.eventFocus || ''}
            onChange={(e) => updateLifestyle({ eventFocus: e.target.value || null })}
            className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue"
            aria-label={INSIGHTS_COPY.EVENT_FOCUS_LABEL}
          >
            <option value="">{INSIGHTS_COPY.EVENT_FOCUS_NONE}</option>
            {FILTER_OPTIONS.occasions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">Extra Notes</label>
        <textarea
          value={preferenceText}
          onChange={(e) => setPreferenceText(e.target.value)}
          placeholder={INSIGHTS_COPY.NOTES_PLACEHOLDER}
          className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue"
          rows={3}
          aria-label="Extra notes for wardrobe insights"
        />
        <p className="mt-1.5 text-xs text-slate-400">{INSIGHTS_COPY.NOTES_HELPER}</p>
      </div>

      {onClear && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 font-medium text-slate-200 transition-colors hover:bg-white/20"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

const NotesCell: React.FC<{
  preferenceText: string;
  setPreferenceText: (text: string) => void;
}> = ({ preferenceText, setPreferenceText }) => {
  const [showNotesModal, setShowNotesModal] = React.useState(false);
  const [notesDraft, setNotesDraft] = React.useState(preferenceText);

  React.useEffect(() => {
    setNotesDraft(preferenceText);
  }, [preferenceText]);

  const notesLabel = preferenceText.trim() ? 'Has notes' : 'Add notes';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNotesDraft(preferenceText);
          setShowNotesModal(true);
        }}
        className="rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-brand-blue/40 touch-manipulation"
      >
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
        <span className="block text-sm font-medium text-white">{notesLabel}</span>
      </button>

      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl backdrop-blur">
            <h3 className="text-lg font-semibold text-white">Extra Notes</h3>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="e.g., Smart casual, navy and brown, no sneakers."
              className="mt-3 w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-brand-blue focus:outline-none"
              rows={4}
              aria-label="Preference text"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreferenceText(notesDraft);
                  setShowNotesModal(false);
                }}
                className="btn-brand flex-1 rounded-xl py-2.5 text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnalysisPreferences;
