/**
 * Utilities for converting outfit history entries to suggestions
 */
import { OutfitHistoryEntry, OutfitSuggestion } from '../models/OutfitModels';

/**
 * Convert an OutfitHistoryEntry to OutfitSuggestion format for display
 */
export function historyEntryToSuggestion(entry: OutfitHistoryEntry): OutfitSuggestion {
  return {
    id: String(entry.id),
    shirt: entry.shirt,
    trouser: entry.trouser,
    blazer: entry.blazer,
    shoes: entry.shoes,
    belt: entry.belt,
    reasoning: entry.reasoning,
    imageUrl: entry.image_data
      ? `data:image/jpeg;base64,${entry.image_data}`
      : undefined,
    model_image: entry.model_image,
    shirt_id: entry.shirt_id ?? null,
    trouser_id: entry.trouser_id ?? null,
    blazer_id: entry.blazer_id ?? null,
    shoes_id: entry.shoes_id ?? null,
    belt_id: entry.belt_id ?? null,
    source_wardrobe_item_id: entry.source_wardrobe_item_id ?? null,
    matching_wardrobe_items: entry.matching_wardrobe_items,
    meta: {
      usedPrompt: entry.text_input
        ? `From history: "${entry.text_input}"`
        : 'Random outfit from your history',
    },
  };
}
