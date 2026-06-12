const OCCASION_DISPLAY: Record<string, string> = {
  casual: 'Casual',
  business: 'Business',
  formal: 'Formal',
  party: 'Party',
  date: 'Date Night',
  sports: 'Sports/Active',
};

const SEASON_DISPLAY: Record<string, string> = {
  all: 'All Seasons',
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

const STYLE_DISPLAY: Record<string, string> = {
  modern: 'Modern',
  classic: 'Classic',
  trendy: 'Trendy',
  minimalist: 'Minimalist',
  bold: 'Bold',
  vintage: 'Vintage',
  casual: 'Casual',
  'business casual': 'Business Casual',
};

export function formatOutfitContextLine(filters: {
  occasion?: string;
  season?: string;
  style?: string;
}): string {
  const style = filters.style
    ? STYLE_DISPLAY[filters.style] || filters.style
    : '';
  const season = filters.season && filters.season !== 'all'
    ? SEASON_DISPLAY[filters.season] || filters.season
    : '';
  const occasion = filters.occasion
    ? OCCASION_DISPLAY[filters.occasion] || filters.occasion
    : '';

  if (style && season) return `${style} · ${season}`;
  if (style) return style;
  if (season) return season;
  if (occasion) return occasion;
  return 'Styled for you';
}
