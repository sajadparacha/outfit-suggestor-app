import { resolveWeekPlanItemThumbnail } from './OutfitItem';
import type { WeekPlanOutfit } from '../../../models/WeekPlanModels';

const outfitWithNullIds: WeekPlanOutfit = {
  summary: 'Test',
  shirt: 'Classic white dress shirt',
  trouser: 'Dark navy dress trousers',
  blazer: '',
  shoes: 'Black leather dress shoes',
  belt: 'Black leather belt',
  reasoning: 'Works',
  shirt_id: null,
  trouser_id: null,
  shoes_id: null,
  belt_id: null,
  matching_wardrobe_items: {
    shirt: [
      {
        id: 1,
        category: 'shirt',
        color: 'white',
        description: 'shirt',
        image_data: 'shirtimg',
      },
    ],
    trouser: [
      {
        id: 2,
        category: 'trouser',
        color: 'navy',
        description: 'trousers',
        image_data: 'trouserimg',
      },
    ],
    blazer: [],
    shoes: [
      {
        id: 3,
        category: 'shoes',
        color: 'black',
        description: 'shoes',
        image_data: 'shoesimg',
      },
    ],
    belt: [
      {
        id: 4,
        category: 'belt',
        color: 'black',
        description: 'belt',
        image_data: 'beltimg',
      },
    ],
  },
};

describe('resolveWeekPlanItemThumbnail', () => {
  it('shows wardrobe photos when slot ids are null but matches have image_data', () => {
    const shirt = resolveWeekPlanItemThumbnail(outfitWithNullIds, 'shirt');
    expect(shirt.tag).toBe('wardrobe');
    expect(shirt.imageSrc).toContain('shirtimg');

    const shoes = resolveWeekPlanItemThumbnail(outfitWithNullIds, 'shoes');
    expect(shoes.imageSrc).toContain('shoesimg');
  });
});
