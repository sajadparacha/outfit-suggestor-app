import React from 'react';
import { WardrobeCategoryHealth } from '../../../models/WardrobeInsightResult';
import {
  buildShoppingListCsv,
  buildShoppingListRows,
  buildWhatsAppShoppingMessage,
  ShoppingListRow,
} from '../../../utils/buildShoppingListRows';

interface ShoppingListTableProps {
  categories: WardrobeCategoryHealth[];
}

const downloadCsv = (rows: ShoppingListRow[]): void => {
  const csv = buildShoppingListCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'shopping-list.csv';
  link.click();
  URL.revokeObjectURL(url);
};

const ShoppingListTable: React.FC<ShoppingListTableProps> = ({ categories }) => {
  const rows = React.useMemo(() => buildShoppingListRows(categories), [categories]);

  const handleExportCsv = () => {
    downloadCsv(rows);
  };

  const handleSendWhatsApp = () => {
    const text = buildWhatsAppShoppingMessage(rows);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="space-y-4" data-testid="shopping-list-table">
      <div>
        <h2 className="text-xl font-semibold text-white">Shopping list</h2>
        <p className="mt-1 text-sm text-slate-400">
          After analyzing your wardrobe, below is the list of items you need to buy.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-300">
          Your wardrobe looks complete for this analysis — nothing urgent to buy.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-4 py-3 font-semibold text-slate-200">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-200">Style</th>
                  <th className="px-4 py-3 font-semibold text-slate-200">Color</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-white/10 last:border-b-0"
                    data-testid={`shopping-list-row-${row.key}`}
                  >
                    <td className="px-4 py-3 text-white">{row.category}</td>
                    <td className="px-4 py-3 text-slate-300">{row.style}</td>
                    <td className="px-4 py-3 text-slate-300">{row.color}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              data-testid="shopping-list-export-csv"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="rounded-xl bg-gradient-to-r from-[#4facfe] to-[#c471ed] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              data-testid="shopping-list-send-whatsapp"
            >
              Send to WhatsApp
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default ShoppingListTable;
