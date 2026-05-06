/**
 * Unit tests for historyUtils - history entry to suggestion conversion
 */
import { historyEntryToSuggestion } from './historyUtils';
import type { OutfitHistoryEntry } from '../models/OutfitModels';

describe('historyEntryToSuggestion', () => {
  const baseEntry: OutfitHistoryEntry = {
    id: 42,
    created_at: '2024-06-15T10:30:00Z',
    text_input: 'business casual',
    image_data: 'base64data123',
    model_image: 'base64model456',
    shirt: 'White linen shirt',
    trouser: 'Navy chinos',
    blazer: 'Gray blazer',
    shoes: 'Brown loafers',
    belt: 'Brown leather belt',
    reasoning: 'Classic combination for professional look.',
  };

  it('converts history entry to suggestion with all fields', () => {
    const suggestion = historyEntryToSuggestion(baseEntry);

    expect(suggestion.id).toBe('42');
    expect(suggestion.shirt).toBe('White linen shirt');
    expect(suggestion.trouser).toBe('Navy chinos');
    expect(suggestion.blazer).toBe('Gray blazer');
    expect(suggestion.shoes).toBe('Brown loafers');
    expect(suggestion.belt).toBe('Brown leather belt');
    expect(suggestion.reasoning).toBe('Classic combination for professional look.');
  });

  it('sets imageUrl when image_data is present', () => {
    const suggestion = historyEntryToSuggestion(baseEntry);

    expect(suggestion.imageUrl).toBe('data:image/jpeg;base64,base64data123');
  });

  it('omits imageUrl when image_data is null', () => {
    const entry = { ...baseEntry, image_data: null };
    const suggestion = historyEntryToSuggestion(entry);

    expect(suggestion.imageUrl).toBeUndefined();
  });

  it('copies model_image from entry', () => {
    const suggestion = historyEntryToSuggestion(baseEntry);

    expect(suggestion.model_image).toBe('base64model456');
  });

  it('sets meta.usedPrompt from text_input when present', () => {
    const suggestion = historyEntryToSuggestion(baseEntry);

    expect(suggestion.meta?.usedPrompt).toBe('From history: "business casual"');
  });

  it('sets default meta.usedPrompt when text_input is empty', () => {
    const entry = { ...baseEntry, text_input: '' };
    const suggestion = historyEntryToSuggestion(entry);

    expect(suggestion.meta?.usedPrompt).toBe('Random outfit from your history');
  });

  it('preserves wardrobe item ids and matching items from history', () => {
    const entry: OutfitHistoryEntry = {
      ...baseEntry,
      shirt_id: 11,
      trouser_id: 22,
      blazer_id: 33,
      shoes_id: 44,
      belt_id: 55,
      source_wardrobe_item_id: 11,
      matching_wardrobe_items: {
        shirt: [{ id: 11, category: 'shirt', color: 'White', description: 'Oxford', image_data: 'shirt-img' }],
        trouser: [{ id: 22, category: 'trouser', color: 'Navy', description: 'Chino', image_data: 'trouser-img' }],
        blazer: [],
        shoes: [],
        belt: [],
      },
    };

    const suggestion = historyEntryToSuggestion(entry);
    expect(suggestion.shirt_id).toBe(11);
    expect(suggestion.trouser_id).toBe(22);
    expect(suggestion.source_wardrobe_item_id).toBe(11);
    expect(suggestion.matching_wardrobe_items?.shirt[0]?.id).toBe(11);
  });
});
