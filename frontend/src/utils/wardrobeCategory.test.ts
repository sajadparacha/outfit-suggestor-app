import {
  apiCategoryParamForFilter,
  getCoreFilterCount,
  getExtendedFilterCount,
  getFilterChipCount,
  getOtherFilterCount,
  getVisibleFilterChips,
  matchesWardrobeCategoryFilter,
  usesClientSideCategoryFilter,
  wardrobeCategoryLabel,
} from './wardrobeCategory';

const sampleSummary = {
  total_items: 12,
  by_category: {
    shirt: 2,
    polo: 1,
    t_shirt: 1,
    jeans: 2,
    shorts: 1,
    blazer: 1,
    jacket: 1,
    shoes: 1,
    belt: 1,
    sweater: 1,
    tie: 1,
    watch: 1,
  },
};

describe('wardrobeCategory helpers', () => {
  describe('wardrobeCategoryLabel', () => {
    it('returns human-readable labels for stored categories', () => {
      expect(wardrobeCategoryLabel('t_shirt')).toBe('T-shirt');
      expect(wardrobeCategoryLabel('t-shirt')).toBe('T-shirt');
      expect(wardrobeCategoryLabel('polo')).toBe('Polo');
      expect(wardrobeCategoryLabel('jeans')).toBe('Jeans');
      expect(wardrobeCategoryLabel('trouser')).toBe('Trousers');
      expect(wardrobeCategoryLabel('jacket')).toBe('Jacket');
    });

    it('returns Other for unrecognized categories', () => {
      expect(wardrobeCategoryLabel('watch')).toBe('Other');
    });
  });

  describe('matchesWardrobeCategoryFilter', () => {
    it('matches grouped core shirt categories', () => {
      expect(matchesWardrobeCategoryFilter('shirt', 'shirt')).toBe(true);
      expect(matchesWardrobeCategoryFilter('polo', 'shirt')).toBe(true);
      expect(matchesWardrobeCategoryFilter('t_shirt', 'shirt')).toBe(true);
      expect(matchesWardrobeCategoryFilter('jeans', 'shirt')).toBe(false);
    });

    it('matches grouped core trouser categories', () => {
      expect(matchesWardrobeCategoryFilter('jeans', 'trouser')).toBe(true);
      expect(matchesWardrobeCategoryFilter('shorts', 'trouser')).toBe(true);
      expect(matchesWardrobeCategoryFilter('pants', 'trouser')).toBe(true);
    });

    it('matches exact extended categories only', () => {
      expect(matchesWardrobeCategoryFilter('polo', 'polo')).toBe(true);
      expect(matchesWardrobeCategoryFilter('shirt', 'polo')).toBe(false);
      expect(matchesWardrobeCategoryFilter('t-shirt', 't_shirt')).toBe(true);
      expect(matchesWardrobeCategoryFilter('shirt', 't_shirt')).toBe(false);
    });

    it('matches other bucket for unrecognized categories', () => {
      expect(matchesWardrobeCategoryFilter('watch', 'other')).toBe(true);
      expect(matchesWardrobeCategoryFilter('polo', 'other')).toBe(false);
    });
  });

  describe('count helpers', () => {
    it('groups core shirt counts', () => {
      expect(getCoreFilterCount(sampleSummary, 'shirt')).toBe(4);
      expect(getCoreFilterCount(sampleSummary, 'trouser')).toBe(3);
      expect(getCoreFilterCount(sampleSummary, 'blazer')).toBe(2);
    });

    it('counts exact extended categories', () => {
      expect(getExtendedFilterCount(sampleSummary, 'polo')).toBe(1);
      expect(getExtendedFilterCount(sampleSummary, 't_shirt')).toBe(1);
      expect(getExtendedFilterCount(sampleSummary, 'jeans')).toBe(2);
    });

    it('counts other bucket separately', () => {
      expect(getOtherFilterCount(sampleSummary)).toBe(1);
      expect(getFilterChipCount(sampleSummary, 'other')).toBe(1);
    });
  });

  describe('getVisibleFilterChips', () => {
    it('always includes core chips and hides zero-count extended chips', () => {
      const chips = getVisibleFilterChips(sampleSummary);
      const labels = chips.map((chip) => chip.label);

      expect(labels).toContain('Shirt');
      expect(labels).toContain('Trousers');
      expect(labels).toContain('Blazer');
      expect(labels).toContain('Shoes');
      expect(labels).toContain('Belt');
      expect(labels).toContain('Polo');
      expect(labels).toContain('T-shirt');
      expect(labels).toContain('Jeans');
      expect(labels).toContain('Shorts');
      expect(labels).toContain('Sweater');
      expect(labels).toContain('Jacket');
      expect(labels).toContain('Tie');
      expect(labels).toContain('Other');
    });

    it('hides extended chips when count is zero', () => {
      const chips = getVisibleFilterChips({
        total_items: 2,
        by_category: { shirt: 1, trouser: 1 },
      });
      const labels = chips.map((chip) => chip.label);

      expect(labels).toEqual(['Shirt', 'Trousers', 'Blazer', 'Shoes', 'Belt']);
    });
  });

  describe('apiCategoryParamForFilter', () => {
    it('uses client-side filtering for grouped core filters', () => {
      expect(usesClientSideCategoryFilter('shirt')).toBe(true);
      expect(apiCategoryParamForFilter('shirt')).toBeUndefined();
      expect(apiCategoryParamForFilter('trouser')).toBeUndefined();
    });

    it('allows API category param for single-alias extended filters', () => {
      expect(apiCategoryParamForFilter('polo')).toBe('polo');
      expect(apiCategoryParamForFilter('jeans')).toBe('jeans');
      expect(apiCategoryParamForFilter('t_shirt')).toBeUndefined();
    });
  });
});
