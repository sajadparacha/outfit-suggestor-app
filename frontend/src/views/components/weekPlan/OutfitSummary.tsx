import React from 'react';
import { WeekPlanOutfit } from '../../../models/WeekPlanModels';
import { MAIN_FLOW_UX_COPY } from '../../../utils/mainFlowUxCopy';
import { reasoningToBullets } from '../../../utils/reasoningBullets';
import { statusLabel, statusPillClass } from './weekPlanStyles';
import type { WeekDayStatus } from '../../../models/WeekPlanModels';

export interface OutfitSummaryProps {
  outfit: WeekPlanOutfit;
  status: WeekDayStatus;
  testIdPrefix: string;
  fromWardrobe?: boolean;
}

const OutfitSummary: React.FC<OutfitSummaryProps> = ({
  outfit,
  status,
  testIdPrefix,
  fromWardrobe = true,
}) => {
  const reasoningBullets = reasoningToBullets(outfit.reasoning || '');

  return (
    <div className="space-y-3" data-testid={`${testIdPrefix}-summary-panel`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="text-base font-semibold text-white"
            data-testid={testIdPrefix}
          >
            {outfit.summary || 'Outfit details'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPillClass[status]}`}
            >
              {statusLabel[status]}
            </span>
            {fromWardrobe && (
              <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                From your wardrobe
              </span>
            )}
          </div>
        </div>
      </div>

      {reasoningBullets.length > 0 && (
        <details
          className="group rounded-xl border border-white/10 bg-white/[0.02]"
          data-testid={`${testIdPrefix}-details`}
        >
          <summary
            className="cursor-pointer list-none px-4 py-3 text-sm text-slate-300 [&::-webkit-details-marker]:hidden"
            data-testid={`${testIdPrefix}-why-toggle`}
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-slate-500 transition-transform group-open:rotate-180" aria-hidden>
                ▼
              </span>
              <span>Why this outfit works</span>
            </span>
          </summary>
          <div
            className="border-t border-white/5 px-4 pb-4 pt-2"
            data-testid={`${testIdPrefix}-expanded`}
          >
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
              {MAIN_FLOW_UX_COPY.whyThisWorks}
            </h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-200">
              {reasoningBullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
};

export default OutfitSummary;
