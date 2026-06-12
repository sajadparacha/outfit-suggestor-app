import { parseOutfitItemCardText } from './outfitItemCardText';

describe('parseOutfitItemCardText', () => {
  it('splits on em dash', () => {
    expect(parseOutfitItemCardText('Navy chinos — tailored fit for office')).toEqual({
      shortName: 'Navy chinos',
      oneLineReason: 'tailored fit for office',
    });
  });

  it('returns short name only for simple text', () => {
    expect(parseOutfitItemCardText('White linen shirt')).toEqual({
      shortName: 'White linen shirt',
      oneLineReason: null,
    });
  });

  it('truncates very long single-line text', () => {
    const long = 'A'.repeat(60);
    const result = parseOutfitItemCardText(long);
    expect(result.shortName.endsWith('…')).toBe(true);
    expect(result.oneLineReason).toBeNull();
  });
});
