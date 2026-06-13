import React from 'react';
import { WardrobeMissingItem } from '../../../models/WardrobeInsightResult';
import MissingItemCard from './MissingItemCard';

interface TopMissingItemsSectionProps {
  items: WardrobeMissingItem[];
  styleContext: string;
}

const TopMissingItemsSection: React.FC<TopMissingItemsSectionProps> = ({ items, styleContext }) => (
  <section className="space-y-4" data-testid="top-missing-items-section">
    <div>
      <h2 className="text-xl font-semibold text-white">Top items to add</h2>
      <p className="mt-1 text-sm text-slate-400">
        High impact pieces that will level up your wardrobe.
      </p>
    </div>

    {items.length === 0 ? (
      <p className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-300">
        Your wardrobe has strong coverage for this context. No urgent purchases needed.
      </p>
    ) : (
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        data-testid="missing-items-grid"
      >
        {items.map((item) => (
          <MissingItemCard key={item.id} item={item} styleContext={styleContext} />
        ))}
      </div>
    )}
  </section>
);

export default TopMissingItemsSection;
