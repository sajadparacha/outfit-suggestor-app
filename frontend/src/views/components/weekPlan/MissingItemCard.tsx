import React from 'react';
import { MissingOutfitSlot } from '../../../models/WeekPlanModels';
import { primaryCtaClass, secondaryCtaClass } from './weekPlanStyles';

export interface MissingItemCardProps {
  slots: MissingOutfitSlot[];
  busy: boolean;
  onChooseFromWardrobe: () => void;
  onFindAlternative: () => void;
  onContinueWithout: () => void;
}

const MissingItemCard: React.FC<MissingItemCardProps> = ({
  slots,
  busy,
  onChooseFromWardrobe,
  onFindAlternative,
  onContinueWithout,
}) => {
  if (slots.length === 0) return null;

  const labels = slots.map((s) => s.label).join(', ');

  return (
    <div
      className="rounded-xl border border-dashed border-brand-purple/50 bg-brand-purple/10 p-4"
      data-testid="week-missing-item-card"
      role="region"
      aria-label="Missing items"
    >
      <p className="text-sm font-semibold text-purple-100">Missing items</p>
      <p className="mt-1 text-xs text-purple-200/80">
        Incomplete slots: {labels}. Choose how to continue.
      </p>

      {/* Phone: primary + overflow */}
      <div className="mt-3 flex flex-wrap items-center gap-2 min-[768px]:hidden">
        <button
          type="button"
          onClick={onChooseFromWardrobe}
          disabled={busy}
          className={`${primaryCtaClass} !min-h-[40px] !px-4 !py-2 text-sm`}
          data-testid="week-missing-choose-wardrobe"
        >
          Choose from wardrobe
        </button>
        <details className="relative">
          <summary
            className={`${secondaryCtaClass} !min-h-[40px] cursor-pointer list-none px-3 py-2 text-xs [&::-webkit-details-marker]:hidden`}
            data-testid="week-missing-more"
          >
            More
          </summary>
          <div className="absolute right-0 z-10 mt-1 min-w-[12rem] space-y-1 rounded-xl border border-white/10 bg-[#151B2D] p-2 shadow-xl">
            <button
              type="button"
              onClick={onFindAlternative}
              disabled={busy}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
              data-testid="week-missing-find-alternative"
            >
              Find an alternative
            </button>
            <button
              type="button"
              onClick={onContinueWithout}
              disabled={busy}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
              data-testid="week-missing-continue"
            >
              Continue without
            </button>
          </div>
        </details>
      </div>

      {/* Tablet / desktop: all actions visible */}
      <div className="mt-3 hidden flex-wrap gap-2 min-[768px]:flex">
        <button
          type="button"
          onClick={onChooseFromWardrobe}
          disabled={busy}
          className={`${primaryCtaClass} !min-h-[40px] !px-4 !py-2 text-sm`}
        >
          Choose from wardrobe
        </button>
        <button
          type="button"
          onClick={onFindAlternative}
          disabled={busy}
          className={`${secondaryCtaClass} !min-h-[40px] !px-4 !py-2 text-sm`}
        >
          Find an alternative
        </button>
        <button
          type="button"
          onClick={onContinueWithout}
          disabled={busy}
          className={`${secondaryCtaClass} !min-h-[40px] !px-4 !py-2 text-sm`}
        >
          Continue without
        </button>
      </div>
    </div>
  );
};

export default MissingItemCard;
