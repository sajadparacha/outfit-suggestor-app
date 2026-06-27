import React from 'react';
import { OutfitHistoryEntry } from '../../models/OutfitModels';

interface RecentLooksSectionProps {
  history: OutfitHistoryEntry[];
  loading?: boolean;
  isAuthenticated?: boolean;
  onViewAll?: () => void;
  /** Tighter spacing when rendered inside the main-flow sidebar column (md+). */
  embedded?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function outfitTitle(entry: OutfitHistoryEntry): string {
  const parts = [entry.shirt, entry.trouser, entry.blazer].filter(Boolean);
  if (parts.length === 0) return 'Saved outfit';
  const label = parts[0];
  return label.length > 32 ? `${label.slice(0, 32)}…` : label;
}

const BookmarkIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </svg>
);

const RecentLooksSection: React.FC<RecentLooksSectionProps> = ({
  history,
  loading = false,
  isAuthenticated = false,
  onViewAll,
  embedded = false,
}) => {
  if (!isAuthenticated) return null;

  const recent = history.slice(0, 4);

  return (
    <section
      className={embedded ? 'mt-0' : 'mt-12 sm:mt-16'}
      aria-labelledby="recent-looks-heading"
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id="recent-looks-heading" className="text-xl font-bold text-white sm:text-2xl">
          Recent looks
        </h2>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-medium text-brand-blue transition hover:text-brand-purple touch-manipulation"
          >
            View all
          </button>
        )}
      </div>

      {loading && recent.length === 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 w-[200px] flex-shrink-0 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
          No saved looks yet. Generate your first outfit to see it here.
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {recent.map((entry) => {
            const imageSrc = entry.model_image
              ? `data:image/png;base64,${entry.model_image}`
              : entry.image_data
                ? `data:image/jpeg;base64,${entry.image_data}`
                : null;

            return (
              <article
                key={entry.id}
                className="flex w-[200px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-lg backdrop-blur sm:w-[220px]"
              >
                <div className="relative h-32 bg-gradient-to-br from-slate-800 to-slate-900">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (entry.model_image && target.src.includes('image/png')) {
                          target.src = `data:image/jpeg;base64,${entry.model_image}`;
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl opacity-50">👔</div>
                  )}
                  <span className="absolute right-2 top-2 text-brand-purple/80">
                    <BookmarkIcon />
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-semibold text-white">{outfitTitle(entry)}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{formatRelativeTime(entry.created_at)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RecentLooksSection;
