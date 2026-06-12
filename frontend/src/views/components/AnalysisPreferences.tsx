import React from 'react';
import { Filters } from '../../models/OutfitModels';
import { FILTER_OPTIONS } from '../../utils/constants';
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
    <div className="space-y-4">
      {sharedHint}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Occasion</label>
          <select
            value={resolved.occasion}
            onChange={(e) => handleFilterChange('occasion', e.target.value)}
            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
            aria-label="Select occasion for wardrobe insights"
          >
            {FILTER_OPTIONS.occasions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Season</label>
          <select
            value={resolved.season}
            onChange={(e) => handleFilterChange('season', e.target.value)}
            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
            aria-label="Select season for wardrobe insights"
          >
            {FILTER_OPTIONS.seasons.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Style</label>
          <select
            value={resolved.style}
            onChange={(e) => handleFilterChange('style', e.target.value)}
            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
            aria-label="Select style for wardrobe insights"
          >
            {FILTER_OPTIONS.styles.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">Extra Notes</label>
        <textarea
          value={preferenceText}
          onChange={(e) => setPreferenceText(e.target.value)}
          placeholder="e.g., Smart casual, navy and brown, no sneakers."
          className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all resize-none"
          rows={3}
          aria-label="Extra notes for wardrobe insights"
        />
      </div>

      {onClear && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2.5 rounded-xl font-medium bg-white/10 text-slate-200 hover:bg-white/20 border border-white/15 transition-colors"
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
