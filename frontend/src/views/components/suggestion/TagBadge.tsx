import React from 'react';

interface TagBadgeProps {
  label: string;
  tone?: 'wardrobe' | 'ai' | 'accent';
}

const toneClassMap: Record<NonNullable<TagBadgeProps['tone']>, string> = {
  wardrobe: 'bg-brand-purple/15 text-brand-purple border-brand-purple/30',
  ai: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
  accent: 'bg-brand-gradient-soft text-slate-200 border-brand-blue/40',
};

const TagBadge: React.FC<TagBadgeProps> = ({ label, tone = 'accent' }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide ${toneClassMap[tone]}`}
    >
      {label}
    </span>
  );
};

export default TagBadge;
