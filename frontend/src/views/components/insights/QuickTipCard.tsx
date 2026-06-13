import React from 'react';

interface QuickTipCardProps {
  onViewStyleGuide: () => void;
}

const QuickTipCard: React.FC<QuickTipCardProps> = ({ onViewStyleGuide }) => (
  <section
    className="rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-5"
    data-testid="quick-tip-card"
  >
    <p className="text-sm leading-relaxed text-slate-200">
      Focus on versatile, neutral pieces. They will work with most of your existing clothes and help you
      create more outfits with fewer items.
    </p>
    <button
      type="button"
      onClick={onViewStyleGuide}
      className="mt-4 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
    >
      View style guide
    </button>
  </section>
);

export default QuickTipCard;
