import {
  DEFAULT_FILTERS,
  buildSuggestionPrompt,
  loadStoredFilters,
  resolveFilters,
} from './outfitPreferences';

describe('outfitPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses spec default filter API values', () => {
    expect(DEFAULT_FILTERS).toEqual({
      occasion: 'everyday',
      season: 'all-season',
      style: 'classic',
    });
    expect(buildSuggestionPrompt(DEFAULT_FILTERS, '')).toBe(
      'Occasion: everyday, Season: all-season, Style: classic'
    );
  });

  it('falls back to spec defaults for old stored filter values', () => {
    localStorage.setItem(
      'outfit_filters',
      JSON.stringify({ occasion: 'casual', season: 'all', style: 'modern' })
    );

    expect(loadStoredFilters()).toEqual(DEFAULT_FILTERS);
    expect(resolveFilters({ occasion: 'business', season: 'all', style: 'Businees Casual' })).toEqual(
      DEFAULT_FILTERS
    );
  });
});
