import React from 'react';
import { WardrobeItem } from '../../models/WardrobeModels';
import { wardrobeImageDataUrl } from '../../utils/wardrobeImageUrl';

interface MainWardrobeBarProps {
  items: WardrobeItem[];
  totalCount: number;
  isAuthenticated: boolean;
  loading?: boolean;
  onViewWardrobe: () => void;
  onSignIn?: () => void;
}

const WardrobeIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const MainWardrobeBar: React.FC<MainWardrobeBarProps> = ({
  items,
  totalCount,
  isAuthenticated,
  loading = false,
  onViewWardrobe,
  onSignIn,
}) => {
  const previewItems = items.slice(0, 4);
  const overflow = Math.max(0, totalCount - previewItems.length);

  return (
    <section
      className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg backdrop-blur sm:p-5"
      aria-labelledby="main-wardrobe-bar-heading"
      data-testid="main-wardrobe-bar"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <WardrobeIcon />
          </div>
          <div className="min-w-0">
            <h2 id="main-wardrobe-bar-heading" className="text-base font-semibold text-white sm:text-lg">
              Your Wardrobe
            </h2>
            <p className="text-xs text-slate-400 sm:text-sm">
              Manage your saved clothes and get better recommendations.
            </p>
          </div>
        </div>

        {isAuthenticated && previewItems.length > 0 && (
          <div className="flex items-center gap-2 sm:mx-4">
            {previewItems.map((item) => {
              const imageSrc = wardrobeImageDataUrl(item.image_data);
              return (
              <div
                key={item.id}
                className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/5"
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={item.category}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 capitalize">
                    {item.category.slice(0, 1)}
                  </div>
                )}
              </div>
              );
            })}
            {overflow > 0 && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-xs font-semibold text-slate-300">
                +{overflow}
              </span>
            )}
          </div>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={onViewWardrobe}
            disabled={loading}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition hover:border-brand-purple/40 hover:bg-brand-purple/10 touch-manipulation"
          >
            View Wardrobe
            <span aria-hidden>→</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition hover:border-brand-purple/40 hover:bg-brand-purple/10 touch-manipulation"
          >
            Sign in to manage wardrobe
            <span aria-hidden>→</span>
          </button>
        )}
      </div>
    </section>
  );
};

export default MainWardrobeBar;
