import React from 'react';

interface InsightStyleChipProps {
  label: string;
}

const InsightStyleChip: React.FC<InsightStyleChipProps> = ({ label }) => (
  <span
    className="rounded-lg border border-brand-blue/25 bg-brand-blue/10 px-2.5 py-1 text-xs text-brand-blue/90"
    data-testid="insight-style-chip"
  >
    {label}
  </span>
);

export default InsightStyleChip;
