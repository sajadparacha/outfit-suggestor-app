const OCCASION_DISPLAY: Record<string, string> = {
  everyday: 'Everyday',
  work: 'Work',
  'date-night': 'Date Night',
  'dinner-night-out': 'Dinner / Night Out',
  party: 'Party',
  'wedding-guest': 'Wedding Guest',
  'formal-event': 'Formal Event',
  travel: 'Travel',
  workout: 'Workout',
  errands: 'Errands',
  lounge: 'Lounge',
  outdoor: 'Outdoor',
};

const SEASON_DISPLAY: Record<string, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
  transitional: 'Transitional',
  'all-season': 'All Season',
};

const STYLE_DISPLAY: Record<string, string> = {
  classic: 'Classic',
  minimal: 'Minimal',
  'smart-casual': 'Smart Casual',
  streetwear: 'Streetwear',
  sporty: 'Sporty',
  preppy: 'Preppy',
  boho: 'Boho',
  edgy: 'Edgy',
  romantic: 'Romantic',
  trendy: 'Trendy',
  vintage: 'Vintage',
  elegant: 'Elegant',
};

export function formatOutfitContextLine(filters: {
  occasion?: string;
  season?: string;
  style?: string;
}): string {
  const style = filters.style
    ? STYLE_DISPLAY[filters.style] || filters.style
    : '';
  const season = filters.season && filters.season !== 'all-season'
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
