import React from 'react';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';

const EmptyOutfitPreview: React.FC = () => (
  <div className="overflow-hidden rounded-3xl border border-dashed border-white/15 bg-white/[0.03] shadow-xl backdrop-blur">
    <div className="relative flex min-h-[280px] flex-col items-center justify-center bg-hero-flatlay p-6 sm:min-h-[320px] sm:p-8 lg:min-h-[360px] lg:p-12">
      <div className="absolute inset-0 bg-brand-gradient-soft opacity-30" aria-hidden />
      <div className="relative flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        <span className="text-5xl drop-shadow-lg sm:text-6xl" role="img" aria-label="Shirt">
          👔
        </span>
        <span className="text-4xl drop-shadow-lg sm:text-5xl" role="img" aria-label="Shoes">
          👞
        </span>
        <span className="text-4xl drop-shadow-lg sm:text-5xl" role="img" aria-label="Jacket">
          🧥
        </span>
        <span className="text-4xl drop-shadow-lg sm:text-5xl" role="img" aria-label="Jeans">
          👖
        </span>
      </div>
      <h3 className="relative mt-8 text-center text-lg font-semibold text-white sm:text-xl">
        {MAIN_FLOW_UX_COPY.emptyPreviewHeadline}
      </h3>
      <p className="relative mt-2 max-w-sm text-center text-sm text-slate-400 sm:text-base">
        {MAIN_FLOW_UX_COPY.emptyPreviewSubline}
      </p>
    </div>
  </div>
);

export default EmptyOutfitPreview;
