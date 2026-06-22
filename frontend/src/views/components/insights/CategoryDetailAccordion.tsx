import React from 'react';
import { WardrobeCategoryHealth } from '../../../models/WardrobeInsightResult';
import { openShoppingSearch, prettyLabel } from '../../../utils/insightsHelpers';
import InsightColorChip from './InsightColorChip';
import InsightStyleChip from './InsightStyleChip';
import { categoryIcons } from './CoverageStatusCard';

interface CategoryDetailAccordionProps {
  categories: WardrobeCategoryHealth[];
  styleContext: string;
}

const statusBadgeClass = (status: WardrobeCategoryHealth['status']): string => {
  switch (status) {
    case 'Good':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    case 'Medium':
      return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
    case 'Weak':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-200';
    case 'Missing':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'Needs neutrals':
      return 'border-violet-400/30 bg-violet-500/10 text-violet-200';
    case 'Too casual':
      return 'border-sky-400/30 bg-sky-500/10 text-sky-200';
    default:
      return 'border-white/20 bg-white/5 text-slate-300';
  }
};

interface InventorySubsectionProps {
  label: string;
  testId: string;
  emptyCopy: string;
  isEmpty: boolean;
  children: React.ReactNode;
}

const InventorySubsection: React.FC<InventorySubsectionProps> = ({
  label,
  testId,
  emptyCopy,
  isEmpty,
  children,
}) => (
  <div className="mt-3" data-testid={testId}>
    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    {isEmpty ? (
      <p className="text-sm text-slate-400" data-testid={`${testId}-empty`}>
        {emptyCopy}
      </p>
    ) : (
      <div className="flex flex-wrap gap-2">{children}</div>
    )}
  </div>
);

const CategoryExpandedBody: React.FC<{
  item: WardrobeCategoryHealth;
  styleContext: string;
}> = ({ item, styleContext }) => {
  const isColorsAggregate = item.id === 'colors';
  const isStylesAggregate = item.id === 'styles';
  const showColorSections = !isStylesAggregate;
  const showStyleSections = !isColorsAggregate;

  return (
    <>
      <p data-testid={`category-owned-missing-${item.id}`}>{item.details}</p>

      {showColorSections && (
        <>
          <InventorySubsection
            label="Owned colors"
            testId={`category-owned-colors-${item.id}`}
            emptyCopy="No colors detected yet."
            isEmpty={item.ownedColors.length === 0}
          >
            {item.ownedColors.map((color) => (
              <InsightColorChip
                key={color}
                color={color}
                category={item.id}
                stylesToTry={[]}
                fallbackStyle={styleContext}
                readOnly
              />
            ))}
          </InventorySubsection>

          <InventorySubsection
            label="Missing colors"
            testId={`category-missing-colors-${item.id}`}
            emptyCopy="You already have enough core colors in this category."
            isEmpty={item.missingColors.length === 0}
          >
            {item.missingColors.map((color) => (
              <InsightColorChip
                key={color}
                color={color}
                category={item.id}
                stylesToTry={item.missingStyles}
                fallbackStyle={styleContext}
              />
            ))}
          </InventorySubsection>
        </>
      )}

      {showStyleSections && (
        <>
          <InventorySubsection
            label="Owned styles"
            testId={`category-owned-styles-${item.id}`}
            emptyCopy="No style keywords detected yet."
            isEmpty={item.ownedStyles.length === 0}
          >
            {item.ownedStyles.map((style) => (
              <InsightStyleChip key={style} label={prettyLabel(style)} />
            ))}
          </InventorySubsection>

          <InventorySubsection
            label="Missing styles"
            testId={`category-missing-styles-${item.id}`}
            emptyCopy="Your style coverage looks balanced for this category."
            isEmpty={item.missingStyles.length === 0}
          >
            {item.missingStyles.map((style) => (
              <InsightStyleChip key={style} label={prettyLabel(style)} />
            ))}
          </InventorySubsection>
        </>
      )}

      <p className="mt-3">
        <span className="font-medium text-slate-200">Recommended next step: </span>
        {item.recommendedStep}
      </p>
      {item.id !== 'colors' && item.id !== 'styles' && (
        <button
          type="button"
          onClick={() => openShoppingSearch(item.id, [styleContext], ['neutral'])}
          className="mt-3 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
        >
          Shop similar
        </button>
      )}
    </>
  );
};

const CategoryDetailAccordion: React.FC<CategoryDetailAccordionProps> = ({ categories, styleContext }) => {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="space-y-4" data-testid="category-detail-accordion">
      <div>
        <h2 className="text-xl font-semibold text-white">Detailed category analysis</h2>
        <p className="mt-1 text-sm text-slate-400">
          Tap a category to see details and recommendations.
        </p>
      </div>

      <div className="space-y-2">
        {categories.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 bg-slate-900/50"
              data-testid={`category-row-${item.id}`}
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                aria-expanded={isExpanded}
              >
                <span className="text-lg" aria-hidden>
                  {categoryIcons[item.category] ?? '📦'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{item.category}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-400">{item.summary}</p>
                </div>
                <svg
                  className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isExpanded && (
                <div
                  className="border-t border-white/10 px-4 py-3 text-sm text-slate-300"
                  data-testid={`category-details-${item.id}`}
                >
                  <CategoryExpandedBody item={item} styleContext={styleContext} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryDetailAccordion;
