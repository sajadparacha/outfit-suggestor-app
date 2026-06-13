import React from 'react';
import { CoverageStatus } from '../../../models/WardrobeInsightResult';

interface CoverageStatusCardProps {
  category: string;
  status: CoverageStatus;
  summary: string;
  icon?: string;
}

const statusStyles: Record<CoverageStatus, { border: string; text: string; bg: string }> = {
  Good: { border: 'border-emerald-500/30', text: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  Medium: { border: 'border-amber-400/30', text: 'text-amber-200', bg: 'bg-amber-500/10' },
  Weak: { border: 'border-orange-500/30', text: 'text-orange-200', bg: 'bg-orange-500/10' },
  Missing: { border: 'border-rose-500/30', text: 'text-rose-200', bg: 'bg-rose-500/10' },
  'Needs neutrals': { border: 'border-violet-400/30', text: 'text-violet-200', bg: 'bg-violet-500/10' },
  'Too casual': { border: 'border-sky-400/30', text: 'text-sky-200', bg: 'bg-sky-500/10' },
};

const categoryIcons: Record<string, string> = {
  Shirts: '👔',
  Trousers: '👖',
  Shoes: '👟',
  Blazers: '🧥',
  Belts: '🪢',
  Colors: '🎨',
  Styles: '👔',
};

const CoverageStatusCard: React.FC<CoverageStatusCardProps> = ({ category, status, summary, icon }) => {
  const styles = statusStyles[status];
  const displayIcon = icon || categoryIcons[category] || '📦';

  return (
    <article
      className={`rounded-xl border p-3 ${styles.border} ${styles.bg}`}
      data-testid={`coverage-card-${category.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg" aria-hidden>{displayIcon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{category}</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles.border} ${styles.text}`}
              data-testid="coverage-status"
            >
              {status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-300">{summary}</p>
        </div>
      </div>
    </article>
  );
};

export default CoverageStatusCard;
