/**
 * @deprecated Use WardrobeInsightsPage and components under views/components/insights/.
 * This module remains for backward-compatible test imports only.
 */
import React from 'react';
import { WardrobeGapAnalysisResponse } from '../../models/WardrobeModels';
import WardrobeInsightsPage from './insights/WardrobeInsightsPage';
import { DEFAULT_FILTERS } from '../../utils/outfitPreferences';

interface WardrobeGapAnalysisProps {
  result: WardrobeGapAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  isAdmin?: boolean;
}

const noop = () => undefined;

/** @deprecated Use WardrobeInsightsPage */
const WardrobeGapAnalysis: React.FC<WardrobeGapAnalysisProps> = ({
  result,
  loading,
  error,
  isAdmin = false,
}) => (
  <WardrobeInsightsPage
    result={result}
    loading={loading}
    error={error}
    isAdmin={isAdmin}
    filters={DEFAULT_FILTERS}
    setFilters={noop}
    preferenceText=""
    setPreferenceText={noop}
    onAnalyze={noop}
    onNavigateToGuide={noop}
    onNavigateToWardrobe={noop}
  />
);

export default WardrobeGapAnalysis;
