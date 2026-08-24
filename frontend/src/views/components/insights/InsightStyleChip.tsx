import React from 'react';

interface InsightStyleChipProps {
  label: string;
  priority?: 'Essential' | 'Useful' | 'Skip';
  onClick?: () => void;
}

const chipClassName =
  'inline-flex items-center gap-1 rounded-lg border border-brand-blue/25 bg-brand-blue/10 px-2.5 py-1 text-xs text-brand-blue/90';

const InsightStyleChip: React.FC<InsightStyleChipProps> = ({ label, priority, onClick }) => {
  const content = (
    <>
      {label}
      {priority === 'Essential' ? (
        <span className="text-[9px] font-semibold uppercase tracking-wide text-brand-blue/60">
          Essential
        </span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${chipClassName} cursor-pointer transition hover:ring-2 hover:ring-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue`}
        aria-label={`Shop ${label}`}
        data-testid="insight-style-chip"
      >
        {content}
      </button>
    );
  }

  return (
    <span className={chipClassName} data-testid="insight-style-chip">
      {content}
    </span>
  );
};

export default InsightStyleChip;
