/**
 * Utilities for converting outfit history entries to suggestions
 */
import {
  Filters,
  OutfitHistoryEntry,
  OutfitSuggestion,
  SourceWardrobeItem,
} from '../models/OutfitModels';
import { DEFAULT_FILTERS } from './outfitPreferences';

const SOURCE_WARDROBE_CATEGORIES = ['shirt', 'trouser', 'blazer', 'shoes', 'belt'] as const;

/** Restore sidebar wardrobe chip from a loaded suggestion when source_wardrobe_item_id is set. */
export function resolveSourceWardrobeItemFromSuggestion(
  suggestion: OutfitSuggestion
): SourceWardrobeItem | null {
  const sourceId = suggestion.source_wardrobe_item_id;
  if (!sourceId || !suggestion.matching_wardrobe_items) return null;

  for (const category of SOURCE_WARDROBE_CATEGORIES) {
    const match = suggestion.matching_wardrobe_items[category]?.find((item) => item.id === sourceId);
    if (match) {
      return { id: match.id, category: match.category, color: match.color };
    }
  }
  return null;
}

/** Filters for compact summary when viewing a loaded history entry. */
export function historyEntrySummaryFilters(
  entry: OutfitHistoryEntry,
  fallback: Filters = DEFAULT_FILTERS
): Filters {
  return {
    occasion: entry.occasion?.trim() || fallback.occasion,
    season: entry.season?.trim() || fallback.season,
    style: entry.style?.trim() || fallback.style,
  };
}

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
    shirt_id: entry.shirt_id,
    trouser_id: entry.trouser_id,
    blazer_id: entry.blazer_id,
    shoes_id: entry.shoes_id,
    belt_id: entry.belt_id,
    source_wardrobe_item_id: entry.source_wardrobe_item_id ?? null,
    matching_wardrobe_items: entry.matching_wardrobe_items,
    meta: {
      usedPrompt: entry.text_input
        ? `From history: "${entry.text_input}"`
        : 'Random outfit from your history',
    },
  };
}
