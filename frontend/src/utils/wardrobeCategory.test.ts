import {
  apiCategoryParamForFilter,
  COMPLETE_OUTFIT_MAX_ITEMS,
  formatCompleteOutfitSlotLabel,
  getCoreFilterCount,
  getExtendedFilterCount,
  getFilterChipCount,
  getOtherFilterCount,
  getVisibleFilterChips,
  hasCompleteOutfitUpperBodyConflict,
  isCompleteOutfitEligibleCategory,
  isUpperBodyExclusiveCompleteOutfitSlot,
  matchesWardrobeCategoryFilter,
  normalizeCompleteOutfitSlot,
  usesClientSideCategoryFilter,
  WARDROBE_FORM_CATEGORIES,
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
    coat: 1,
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
      expect(wardrobeCategoryLabel('coat')).toBe('Coat');
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

    it('keeps blazer filter separate from casual jackets and coats', () => {
      expect(matchesWardrobeCategoryFilter('blazer', 'blazer')).toBe(true);
      expect(matchesWardrobeCategoryFilter('sport_coat', 'blazer')).toBe(true);
      expect(matchesWardrobeCategoryFilter('jacket', 'blazer')).toBe(false);
      expect(matchesWardrobeCategoryFilter('jackets', 'blazer')).toBe(false);
      expect(matchesWardrobeCategoryFilter('coat', 'blazer')).toBe(false);
      expect(matchesWardrobeCategoryFilter('coats', 'blazer')).toBe(false);
      expect(matchesWardrobeCategoryFilter('jacket', 'shirt')).toBe(false);
      expect(matchesWardrobeCategoryFilter('coat', 'shirt')).toBe(false);
      expect(matchesWardrobeCategoryFilter('bomber jacket', 'blazer')).toBe(false);
    });

    it('matches jacket and coat extended filters only', () => {
      expect(matchesWardrobeCategoryFilter('jacket', 'jacket')).toBe(true);
      expect(matchesWardrobeCategoryFilter('jackets', 'jacket')).toBe(true);
      expect(matchesWardrobeCategoryFilter('coat', 'coat')).toBe(true);
      expect(matchesWardrobeCategoryFilter('coats', 'coat')).toBe(true);
      expect(matchesWardrobeCategoryFilter('jacket', 'coat')).toBe(false);
      expect(matchesWardrobeCategoryFilter('blazer', 'jacket')).toBe(false);
    });
    it('matches other bucket for unrecognized categories', () => {
      expect(matchesWardrobeCategoryFilter('watch', 'other')).toBe(true);
      expect(matchesWardrobeCategoryFilter('polo', 'other')).toBe(false);
    });
  });

  describe('count helpers', () => {
    it('groups core shirt counts and separates blazer from jacket', () => {
      expect(getCoreFilterCount(sampleSummary, 'shirt')).toBe(4);
      expect(getCoreFilterCount(sampleSummary, 'trouser')).toBe(3);
      expect(getCoreFilterCount(sampleSummary, 'blazer')).toBe(1);
      expect(getExtendedFilterCount(sampleSummary, 'jacket')).toBe(1);
      expect(getExtendedFilterCount(sampleSummary, 'coat')).toBe(1);
      expect(matchesWardrobeCategoryFilter('jacket', 'blazer')).toBe(false);
      expect(matchesWardrobeCategoryFilter('coat', 'blazer')).toBe(false);
      expect(matchesWardrobeCategoryFilter('jacket', 'jacket')).toBe(true);
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
      expect(labels).toContain('Coat');
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

  describe('form categories and complete-outfit slots', () => {
    it('includes jacket and coat in add/edit form categories', () => {
      expect(WARDROBE_FORM_CATEGORIES).toEqual(
        expect.arrayContaining(['blazer', 'jacket', 'coat'])
      );
    });

    it('maps jacket and coat to outerwear completion slot', () => {
      expect(normalizeCompleteOutfitSlot('jacket')).toBe('outerwear');
      expect(normalizeCompleteOutfitSlot('jackets')).toBe('outerwear');
      expect(normalizeCompleteOutfitSlot('coat')).toBe('outerwear');
      expect(normalizeCompleteOutfitSlot('coats')).toBe('outerwear');
      expect(formatCompleteOutfitSlotLabel('outerwear')).toBe('outerwear');
    });

    it('maps sweater to sweater completion slot with layer label', () => {
      expect(normalizeCompleteOutfitSlot('sweater')).toBe('sweater');
      expect(normalizeCompleteOutfitSlot('sweaters')).toBe('sweater');
      expect(formatCompleteOutfitSlotLabel('sweater')).toBe('layer');
    });

    it('maps core categories to their completion slots', () => {
      expect(normalizeCompleteOutfitSlot('shirt')).toBe('shirt');
      expect(normalizeCompleteOutfitSlot('polo')).toBe('shirt');
      expect(normalizeCompleteOutfitSlot('jeans')).toBe('trouser');
      expect(normalizeCompleteOutfitSlot('blazer')).toBe('blazer');
      expect(normalizeCompleteOutfitSlot('shoes')).toBe('shoes');
      expect(normalizeCompleteOutfitSlot('belt')).toBe('belt');
    });

    it('marks tie and unrecognized categories as ineligible', () => {
      expect(normalizeCompleteOutfitSlot('tie')).toBeNull();
      expect(normalizeCompleteOutfitSlot('watch')).toBeNull();
      expect(isCompleteOutfitEligibleCategory('jacket')).toBe(true);
      expect(isCompleteOutfitEligibleCategory('tie')).toBe(false);
    });

    it('identifies upper-body exclusive slots', () => {
      expect(isUpperBodyExclusiveCompleteOutfitSlot('blazer')).toBe(true);
      expect(isUpperBodyExclusiveCompleteOutfitSlot('outerwear')).toBe(true);
      expect(isUpperBodyExclusiveCompleteOutfitSlot('sweater')).toBe(true);
      expect(isUpperBodyExclusiveCompleteOutfitSlot('shirt')).toBe(false);
      expect(isUpperBodyExclusiveCompleteOutfitSlot('trouser')).toBe(false);
    });

    it('detects upper-body exclusivity conflicts', () => {
      expect(hasCompleteOutfitUpperBodyConflict(['blazer'], 'outerwear')).toBe(true);
      expect(hasCompleteOutfitUpperBodyConflict(['outerwear'], 'sweater')).toBe(true);
      expect(hasCompleteOutfitUpperBodyConflict(['sweater'], 'blazer')).toBe(true);
      expect(hasCompleteOutfitUpperBodyConflict(['shirt', 'blazer'], 'outerwear')).toBe(true);
      expect(hasCompleteOutfitUpperBodyConflict(['shirt', 'trouser'], 'blazer')).toBe(false);
      expect(hasCompleteOutfitUpperBodyConflict(['blazer'], 'shirt')).toBe(false);
    });

    it('caps complete-outfit selection at five items', () => {
      expect(COMPLETE_OUTFIT_MAX_ITEMS).toBe(5);
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
