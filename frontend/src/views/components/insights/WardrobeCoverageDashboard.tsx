import React from 'react';
import { WardrobeCategoryHealth } from '../../../models/WardrobeInsightResult';
import CoverageStatusCard from './CoverageStatusCard';

interface WardrobeCoverageDashboardProps {
  categories: WardrobeCategoryHealth[];
}

const WardrobeCoverageDashboard: React.FC<WardrobeCoverageDashboardProps> = ({ categories }) => (
  <section className="space-y-4" data-testid="wardrobe-coverage-dashboard">
    <div>
      <h2 className="text-xl font-semibold text-white">Wardrobe coverage</h2>
      <p className="mt-1 text-sm text-slate-400">
        How your wardrobe looks across essential categories.
      </p>
    </div>

    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
      data-testid="coverage-grid"
    >
      {categories.map((item) => (
        <CoverageStatusCard
          key={item.id}
          category={item.category}
          status={item.status}
          summary={item.summary}
        />
      ))}
    </div>
  </section>
);

export default WardrobeCoverageDashboard;
