import React from 'react';
import type { WardrobeInsightContext, WardrobeMissingItem } from '../../../models/WardrobeInsightResult';
import { INSIGHTS_COPY } from '../../../utils/insightsCopy';
import {
  buildCopyListText,
  buildShoppingListRows,
  buildWhatsAppShoppingListUrl,
  formatStyleColorTuples,
  type ShoppingListRow,
} from '../../../utils/insightsHelpers';
import {
  buildShoppingListStorageKey,
  countBoughtItems,
  getChecklistItem,
  loadShoppingListChecklist,
  saveShoppingListChecklist,
  setChecklistItem,
  type ShoppingListChecklistState,
} from '../../../utils/shoppingListStorage';

interface ShoppingListPanelProps {
  items: WardrobeMissingItem[];
  context: WardrobeInsightContext;
}

const openExternal = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

const priorityBadgeClass = (priority: ShoppingListRow['priority']): string => {
  switch (priority) {
    case 'High':
      return 'border-rose-400/40 bg-rose-500/15 text-rose-100';
    case 'Medium':
      return 'border-amber-400/40 bg-amber-500/15 text-amber-100';
    default:
      return 'border-slate-400/30 bg-slate-500/15 text-slate-200';
  }
};

const ShoppingListRowView: React.FC<{
  row: ShoppingListRow;
  checklist: ShoppingListChecklistState;
  onChecklistChange: (itemId: string, update: { checked?: boolean; note?: string }) => void;
}> = ({ row, checklist, onChecklistChange }) => {
  const [showAllOptions, setShowAllOptions] = React.useState(false);
  const itemState = getChecklistItem(checklist, row.id);

  return (
    <tr key={row.id} className="align-top">
      <th scope="row" className="px-4 py-3 font-medium text-white">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={itemState.checked}
                onChange={(event) =>
                  onChecklistChange(row.id, { checked: event.target.checked })
                }
                className="h-4 w-4 rounded border-white/20 bg-slate-900 text-brand-blue focus:ring-brand-blue/40"
                aria-label={`Mark ${row.cleanLabel} as bought`}
                data-testid={`shopping-list-check-${row.id}`}
              />
              <span>{row.cleanLabel}</span>
            </label>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityBadgeClass(row.priority)}`}
              data-testid={`shopping-list-priority-${row.id}`}
            >
              {row.priority}
            </span>
          </div>
          <input
            type="text"
            value={itemState.note}
            onChange={(event) => onChecklistChange(row.id, { note: event.target.value })}
            placeholder={INSIGHTS_COPY.SHOPPING_LIST_NOTES_PLACEHOLDER}
            className="w-full rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-brand-blue/40 focus:outline-none"
            aria-label={`Notes for ${row.cleanLabel}`}
            data-testid={`shopping-list-note-${row.id}`}
          />
        </div>
      </th>
      <td className="px-4 py-3 text-slate-300">
        <div
          className="max-w-full whitespace-normal break-words [overflow-wrap:anywhere]"
          data-testid={`shopping-list-look-for-${row.id}`}
        >
          {row.lookForText}
        </div>
        {row.tuples.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAllOptions((open) => !open)}
            className="mt-2 text-xs font-semibold text-sky-300 hover:text-sky-200"
            aria-expanded={showAllOptions}
            data-testid={`shopping-list-toggle-options-${row.id}`}
          >
            {showAllOptions
              ? INSIGHTS_COPY.SHOPPING_LIST_HIDE_OPTIONS
              : INSIGHTS_COPY.SHOPPING_LIST_SEE_ALL_OPTIONS}
          </button>
        )}
        {showAllOptions && (
          <div
            className="mt-2 text-xs text-slate-400"
            data-testid={`shopping-list-tuple-${row.id}`}
          >
            {formatStyleColorTuples(row.tuples)}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {row.comboLinks.map((combo) => (
              <button
                key={`${row.id}-${combo.style}-${combo.color}`}
                type="button"
                onClick={() => openExternal(combo.url)}
                className="inline-flex rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-white/10"
                aria-label={`Search online for ${row.cleanLabel}: ${combo.label}`}
                data-testid={`shopping-list-combo-${row.id}-${combo.style}-${combo.color}`}
              >
                {combo.label}
              </button>
            ))}
          </div>
          {row.searchAllUrl && (
            <button
              type="button"
              onClick={() => openExternal(row.searchAllUrl)}
              className="inline-flex w-fit rounded-lg border border-brand-blue/40 bg-brand-blue/15 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-brand-blue/25"
              aria-label={`Search all options for ${row.cleanLabel}`}
              data-testid={`shopping-list-search-all-${row.id}`}
            >
              {INSIGHTS_COPY.SHOPPING_LIST_SEARCH_ALL}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const ShoppingListPanel: React.FC<ShoppingListPanelProps> = ({ items, context }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [copyFeedback, setCopyFeedback] = React.useState<string | null>(null);
  const rows = React.useMemo(() => buildShoppingListRows(items), [items]);
  const storageKey = React.useMemo(
    () => buildShoppingListStorageKey(context, items.map((item) => item.id)),
    [context, items]
  );
  const [checklist, setChecklist] = React.useState<ShoppingListChecklistState>(() =>
    loadShoppingListChecklist(storageKey)
  );

  React.useEffect(() => {
    setChecklist(loadShoppingListChecklist(storageKey));
  }, [storageKey]);

  React.useEffect(() => {
    saveShoppingListChecklist(storageKey, checklist);
  }, [checklist, storageKey]);

  const boughtCount = countBoughtItems(checklist);

  const handleChecklistChange = (
    itemId: string,
    update: { checked?: boolean; note?: string }
  ) => {
    setChecklist((current) => setChecklistItem(current, itemId, update));
  };

  const handleWhatsAppExport = () => {
    try {
      openExternal(buildWhatsAppShoppingListUrl(rows, context));
    } catch {
      window.alert(INSIGHTS_COPY.SHOPPING_LIST_EXPORT_ERROR);
    }
  };

  const handlePdfExport = () => {
    try {
      if (typeof window.print !== 'function') throw new Error('Print unavailable');
      window.print();
    } catch {
      window.alert(INSIGHTS_COPY.SHOPPING_LIST_EXPORT_ERROR);
    }
  };

  const handleCopyList = async () => {
    try {
      const text = buildCopyListText(rows, context);
      await navigator.clipboard.writeText(text);
      setCopyFeedback(INSIGHTS_COPY.SHOPPING_LIST_COPIED);
      window.setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      window.alert(INSIGHTS_COPY.SHOPPING_LIST_EXPORT_ERROR);
    }
  };

  return (
    <>
      <section
        className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-xl shadow-slate-950/20 print:hidden"
        data-testid="insights-shopping-list"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{INSIGHTS_COPY.SHOPPING_LIST_TITLE}</h2>
            <p className="mt-1 text-sm text-slate-400">{INSIGHTS_COPY.SHOPPING_LIST_SUBTITLE}</p>
          </div>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="insights-shopping-list-table"
            onClick={() => setIsOpen((open) => !open)}
            className="rounded-xl border border-brand-blue/40 bg-brand-blue/15 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-brand-blue hover:bg-brand-blue/25"
          >
            {INSIGHTS_COPY.SHOPPING_LIST_TITLE}
          </button>
        </div>

        {copyFeedback && (
          <p
            className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
            role="status"
            data-testid="shopping-list-copy-feedback"
          >
            {copyFeedback}
          </p>
        )}

        {isOpen && (
          <div id="insights-shopping-list-table" className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleWhatsAppExport}
                className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25"
              >
                {INSIGHTS_COPY.SHOPPING_LIST_EXPORT_WHATSAPP}
              </button>
              <button
                type="button"
                onClick={handleCopyList}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                data-testid="shopping-list-copy-button"
              >
                {INSIGHTS_COPY.SHOPPING_LIST_COPY}
              </button>
              <button
                type="button"
                onClick={handlePdfExport}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
              >
                {INSIGHTS_COPY.SHOPPING_LIST_EXPORT_PDF}
              </button>
            </div>

            {rows.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                {INSIGHTS_COPY.SHOPPING_LIST_EMPTY}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[48rem] table-fixed divide-y divide-white/10 text-left text-sm">
                    <colgroup>
                      <col className="w-[32%]" />
                      <col className="w-[38%]" />
                      <col className="w-[30%]" />
                    </colgroup>
                    <caption className="sr-only">
                      Wardrobe Insights shopping list for {context.occasion}, {context.season},{' '}
                      {context.style}
                    </caption>
                    <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          {INSIGHTS_COPY.SHOPPING_LIST_COLUMN_BUY}
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          {INSIGHTS_COPY.SHOPPING_LIST_COLUMN_LOOK_FOR}
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                          {INSIGHTS_COPY.SHOPPING_LIST_COLUMN_SEARCH_ONLINE}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-slate-950/20">
                      {rows.map((row) => (
                        <ShoppingListRowView
                          key={row.id}
                          row={row}
                          checklist={checklist}
                          onChecklistChange={handleChecklistChange}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <p
                  className="text-sm font-medium text-slate-300"
                  data-testid="shopping-list-progress"
                >
                  {INSIGHTS_COPY.SHOPPING_LIST_PROGRESS(boughtCount, rows.length)}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      <section
        className="hidden print:block print:p-8 print:text-black"
        data-testid="shopping-list-print"
        aria-hidden="true"
      >
        <h1 className="text-2xl font-bold">{INSIGHTS_COPY.SHOPPING_LIST_PRINT_TITLE}</h1>
        <p className="mt-2 text-sm text-gray-700">
          For: {context.occasion} · {context.season} · {context.style}
        </p>
        {rows.length === 0 ? (
          <p className="mt-6 text-sm">{INSIGHTS_COPY.SHOPPING_LIST_EMPTY}</p>
        ) : (
          <ol className="mt-6 space-y-4 text-sm">
            {rows.map((row, index) => {
              const itemState = getChecklistItem(checklist, row.id);
              return (
                <li key={row.id} className="break-inside-avoid">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-block h-4 w-4 border border-gray-600">
                      {itemState.checked ? '✓' : ''}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {index + 1}. {row.cleanLabel} ({row.priority})
                      </p>
                      <p className="mt-1 text-gray-700">→ {row.lookForText}</p>
                      {itemState.note ? (
                        <p className="mt-1 text-gray-600">Note: {itemState.note}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {rows.length > 0 && (
          <p className="mt-6 text-sm text-gray-700">
            {INSIGHTS_COPY.SHOPPING_LIST_PROGRESS(boughtCount, rows.length)}
          </p>
        )}
      </section>
    </>
  );
};

export default ShoppingListPanel;
