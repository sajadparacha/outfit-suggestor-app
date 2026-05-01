import React from 'react';
import TagBadge from './TagBadge';

interface OutfitItemCardProps {
  title: string;
  description: string;
  imageSrc?: string | null;
  imageAlt: string;
  tag: string;
  tagTone?: 'wardrobe' | 'ai' | 'accent';
  onImageClick?: () => void;
  legacyHint?: string;
}

const OutfitItemCard: React.FC<OutfitItemCardProps> = ({
  title,
  description,
  imageSrc,
  imageAlt,
  tag,
  tagTone = 'accent',
  onImageClick,
  legacyHint,
}) => {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-teal-300/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.16)]">
      <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-slate-800/80">
        {imageSrc ? (
          <button
            type="button"
            onClick={onImageClick}
            className="block h-36 w-full focus:outline-none focus:ring-2 focus:ring-teal-400"
            aria-label={`View ${imageAlt} full size`}
            title="View full image"
          >
            <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
          </button>
        ) : (
          <div className="flex h-36 w-full items-center justify-center text-4xl text-slate-500">✦</div>
        )}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 min-h-[2.5rem] overflow-hidden text-sm leading-5 text-slate-300">{description}</p>
      {legacyHint && <p className="mt-1 text-[11px] text-slate-400">{legacyHint}</p>}
      <div className="mt-3">
        <TagBadge label={tag} tone={tagTone} />
      </div>
    </article>
  );
};

export default OutfitItemCard;
