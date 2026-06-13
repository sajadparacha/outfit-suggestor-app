import React from 'react';
import { Filters } from '../../../models/OutfitModels';
import AnalysisPreferences from '../AnalysisPreferences';

interface AnalysisPreferencesCardProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  preferenceText: string;
  setPreferenceText: (text: string) => void;
  onClear?: () => void;
  onAnalyze: () => void;
  loading: boolean;
}

const AnalysisPreferencesCard: React.FC<AnalysisPreferencesCardProps> = ({
  filters,
  setFilters,
  preferenceText,
  setPreferenceText,
  onClear,
  onAnalyze,
  loading,
}) => (
  <section
    className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-xl backdrop-blur"
    data-testid="analysis-preferences-card"
  >
    <h2 className="text-lg font-semibold text-white">Analysis Preferences</h2>
    <p className="mt-1 mb-4 text-sm text-slate-300">
      Tell us your context so the analysis matches your event, season, and style needs.
    </p>

    <AnalysisPreferences
      filters={filters}
      setFilters={setFilters}
      preferenceText={preferenceText}
      setPreferenceText={setPreferenceText}
      onClear={onClear}
      variant="insights"
    />

    <div className="mt-4 flex justify-end">
      <button
        type="button"
        onClick={onAnalyze}
        disabled={loading}
        className={`rounded-xl px-4 py-2.5 font-semibold transition-all ${
          loading
            ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
            : 'btn-brand'
        }`}
      >
        {loading ? 'Analyzing...' : 'Analyze My Wardrobe'}
      </button>
    </div>
  </section>
);

export default AnalysisPreferencesCard;
