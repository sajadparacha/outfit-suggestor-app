import React from 'react';
import { WardrobeMissingItem } from '../../../models/WardrobeInsightResult';
import { openShoppingSearch } from '../../../utils/insightsHelpers';
import InsightColorChip from './InsightColorChip';
import InsightStyleChip from './InsightStyleChip';

interface MissingItemCardProps {
  item: WardrobeMissingItem;
  styleContext: string;
}

const priorityBadgeClass = (priority: WardrobeMissingItem['priority']): string => {
  switch (priority) {
    case 'High':
      return 'border-rose-500/40 bg-rose-500/15 text-rose-200';
    case 'Medium':
      return 'border-amber-400/40 bg-amber-500/15 text-amber-100';
    default:
      return 'border-slate-500/40 bg-slate-700/40 text-slate-300';
  }
};

const MissingItemCard: React.FC<MissingItemCardProps> = ({ item, styleContext }) => (
  <article
    className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-brand-blue/30"
    data-testid={`missing-item-card-${item.id}`}
  >
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-base font-semibold text-white">{item.name}</h3>
      <span
        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(item.priority)}`}
        data-testid="priority-badge"
      >
        {item.priority}
      </span>
    </div>

    <p className="mt-2 text-sm text-slate-300" data-testid="missing-item-reason">{item.reason}</p>

    {item.bestColors.length > 0 && (
      <div className="mt-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Best colors</p>
        <div className="flex flex-wrap gap-2" data-testid="best-colors">
          {item.bestColors.map((color) => (
            <InsightColorChip
              key={color}
              color={color}
              category={item.category}
              stylesToTry={item.worksWith}
              fallbackStyle={styleContext}
            />
          ))}
        </div>
      </div>
    )}

    {item.worksWith.length > 0 && (
      <div className="mt-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Styles To Try</p>
        <div className="flex flex-wrap gap-2" data-testid="styles-to-try">
          {item.worksWith.map((style) => (
            <InsightStyleChip key={style} label={style} />
          ))}
        </div>
      </div>
    )}

    <div className="mt-4 flex flex-wrap gap-2 pt-2">
      <button
        type="button"
        onClick={() =>
          openShoppingSearch(
            item.category,
            item.worksWith.length > 0 ? item.worksWith.map((w) => w.toLowerCase()) : [styleContext],
            item.bestColors.length > 0 ? item.bestColors : ['neutral']
          )
        }
        className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
      >
        Shop similar
      </button>
    </div>
  </article>
);

export default MissingItemCard;
