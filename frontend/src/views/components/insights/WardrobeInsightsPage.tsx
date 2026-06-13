import React from 'react';
import { Filters } from '../../../models/OutfitModels';
import { WardrobeGapAnalysisResponse } from '../../../models/WardrobeModels';
import { WardrobeInsightResult } from '../../../models/WardrobeInsightResult';
import { normalizeWardrobeInsight } from '../../../utils/normalizeWardrobeInsight';
import AdminDebugPanel from './AdminDebugPanel';
import AnalysisContextBar from './AnalysisContextBar';
import AnalysisPreferencesCard from './AnalysisPreferencesCard';
import CategoryDetailAccordion from './CategoryDetailAccordion';
import InsightSummaryCard from './InsightSummaryCard';
import InsightsHeader from './InsightsHeader';
import QuickTipCard from './QuickTipCard';
import TopMissingItemsSection from './TopMissingItemsSection';
import WardrobeCoverageDashboard from './WardrobeCoverageDashboard';

export interface WardrobeInsightsPageProps {
  result: WardrobeGapAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  isAdmin?: boolean;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  preferenceText: string;
  setPreferenceText: (text: string) => void;
  onClearPreferences?: () => void;
  onAnalyze: () => void;
  onNavigateToGuide: () => void;
  onNavigateToWardrobe: () => void;
  onNewAnalysis?: () => void;
}

const WardrobeInsightsPage: React.FC<WardrobeInsightsPageProps> = ({
  result,
  loading,
  error,
  isAdmin = false,
  filters,
  setFilters,
  preferenceText,
  setPreferenceText,
  onClearPreferences,
  onAnalyze,
  onNavigateToGuide,
  onNavigateToWardrobe,
  onNewAnalysis,
}) => {
  const [preferencesExpanded, setPreferencesExpanded] = React.useState(!result);

  React.useEffect(() => {
    setPreferencesExpanded(!result);
  }, [result]);

  const insight: WardrobeInsightResult | null = React.useMemo(
    () => (result ? normalizeWardrobeInsight(result) : null),
    [result]
  );

  const handleNewAnalysis = () => {
    onNewAnalysis?.();
    setPreferencesExpanded(true);
  };

  const handleChangePreferences = () => {
    setPreferencesExpanded(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="wardrobe-insights-page">
      <InsightsHeader
        hasResult={!!insight}
        onNewAnalysis={insight ? handleNewAnalysis : undefined}
        onOpenWardrobe={onNavigateToWardrobe}
      />

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
          Analyzing your wardrobe inventory...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {!loading && !error && !insight && (
        <AnalysisPreferencesCard
          filters={filters}
          setFilters={setFilters}
          preferenceText={preferenceText}
          setPreferenceText={setPreferenceText}
          onClear={onClearPreferences}
          onAnalyze={onAnalyze}
          loading={loading}
        />
      )}

      {!loading && !error && insight && (
        <div className="space-y-8">
          {preferencesExpanded ? (
            <AnalysisPreferencesCard
              filters={filters}
              setFilters={setFilters}
              preferenceText={preferenceText}
              setPreferenceText={setPreferenceText}
              onClear={onClearPreferences}
              onAnalyze={onAnalyze}
              loading={loading}
            />
          ) : (
            <AnalysisContextBar context={insight.context} onChangePreferences={handleChangePreferences} />
          )}

          <InsightSummaryCard score={insight.score} topPriorities={insight.topPriorities} />

          <TopMissingItemsSection
            items={insight.missingItems}
            styleContext={insight.context.style}
          />

          <WardrobeCoverageDashboard categories={insight.categoryHealth} />

          <CategoryDetailAccordion
            categories={insight.categoryHealth}
            styleContext={insight.context.style}
          />

          <QuickTipCard onViewStyleGuide={onNavigateToGuide} />

          {isAdmin && insight.admin && <AdminDebugPanel admin={insight.admin} />}
        </div>
      )}
    </div>
  );
};

export default WardrobeInsightsPage;
