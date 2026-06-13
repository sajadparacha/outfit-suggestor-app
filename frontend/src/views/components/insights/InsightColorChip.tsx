import React from 'react';
import { getColorSwatchValue, openColorShoppingSearch, prettyLabel } from '../../../utils/insightsHelpers';

const LIGHT_SWATCHES = new Set(['#f8fafc', '#d6c6a8', '#d2b48c']);

interface InsightColorChipProps {
  color: string;
  category: string;
  stylesToTry: string[];
  fallbackStyle?: string;
  readOnly?: boolean;
}

const chipClassName =
  'inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900/50 px-2.5 py-1 text-xs text-slate-100';

const InsightColorChip: React.FC<InsightColorChipProps> = ({
  color,
  category,
  stylesToTry,
  fallbackStyle,
  readOnly = false,
}) => {
  const swatch = getColorSwatchValue(color);
  const needsBorder = LIGHT_SWATCHES.has(swatch);
  const label = prettyLabel(color);

  const content = (
    <>
      <span
        className={`h-3 w-3 rounded-full ${needsBorder ? 'border border-slate-500' : ''}`}
        style={{ backgroundColor: swatch }}
        aria-hidden
      />
      {label}
    </>
  );

  if (readOnly) {
    return (
      <span className={chipClassName} data-testid="insight-color-chip">
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openColorShoppingSearch(category, color, stylesToTry, fallbackStyle)}
      className={`${chipClassName} cursor-pointer transition hover:ring-2 hover:ring-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue`}
      aria-label={`Shop ${label} ${prettyLabel(category)}`}
      data-testid="insight-color-chip"
    >
      {content}
    </button>
  );
};

export default InsightColorChip;
