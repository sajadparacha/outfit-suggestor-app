import React from 'react';
import type { WardrobeInsightContext, WardrobeMissingItem } from '../../../models/WardrobeInsightResult';
import {
  buildShoppingListRows,
  buildWhatsAppShoppingListUrl,
  formatStyleColorTuplePreview,
} from '../../../utils/insightsHelpers';

interface ShoppingListPanelProps {
  items: WardrobeMissingItem[];
  context: WardrobeInsightContext;
}

const openExternal = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

const ShoppingListPanel: React.FC<ShoppingListPanelProps> = ({ items, context }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const rows = React.useMemo(() => buildShoppingListRows(items), [items]);

  const handleWhatsAppExport = () => {
    try {
      openExternal(buildWhatsAppShoppingListUrl(rows, context));
    } catch {
      window.alert('Could not export shopping list.');
    }
  };

  const handlePdfExport = () => {
    try {
      if (typeof window.print !== 'function') throw new Error('Print unavailable');
      window.print();
    } catch {
      window.alert('Could not export shopping list.');
    }
  };

  return (
    <section
      className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-xl shadow-slate-950/20"
      data-testid="insights-shopping-list"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Shopping list</h2>
          <p className="mt-1 text-sm text-slate-400">
            Turn your highest-impact wardrobe gaps into focused shopping searches.
          </p>
        </div>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="insights-shopping-list-table"
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-xl border border-brand-blue/40 bg-brand-blue/15 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-brand-blue hover:bg-brand-blue/25"
        >
          Shopping list
        </button>
      </div>

      {isOpen && (
        <div id="insights-shopping-list-table" className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleWhatsAppExport}
              className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25"
            >
              Export to WhatsApp
            </button>
            <button
              type="button"
              onClick={handlePdfExport}
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
            >
              Export as PDF
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              No shopping list items for this analysis.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[42rem] table-fixed divide-y divide-white/10 text-left text-sm">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[47%]" />
                  <col className="w-[25%]" />
                </colgroup>
                <caption className="sr-only">
                  Wardrobe Insights shopping list for {context.occasion}, {context.season}, {context.style}
                </caption>
                <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Style &amp; color tuples</th>
                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Google Shopping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-slate-950/20">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row" className="px-4 py-3 align-top font-medium text-white">
                        {row.itemLabel}
                      </th>
                      <td className="px-4 py-3 align-top text-slate-300">
                        <div
                          className="max-w-full overflow-hidden whitespace-normal break-words [overflow-wrap:anywhere]"
                          data-testid={`shopping-list-tuple-${row.id}`}
                          title={row.tupleText}
                          aria-label={`Full style and color tuples: ${row.tupleText}`}
                        >
                          {formatStyleColorTuplePreview(row.tuples)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => openExternal(row.googleShoppingUrl)}
                          className="inline-flex whitespace-nowrap rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                          aria-label={`Open Google Shopping for ${row.itemLabel}`}
                        >
                          Google Shopping
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ShoppingListPanel;
