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
    meta: {
      usedPrompt: entry.text_input
        ? `From history: "${entry.text_input}"`
        : 'Random outfit from your history',
    },
  };
}
