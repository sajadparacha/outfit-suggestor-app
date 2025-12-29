/**
 * Data Models for Outfit Suggester Application
 * These models define the shape of data used throughout the application
 */

export interface MatchingWardrobeItem {
  id: number;
  category: string;
  color: string | null;
  description: string | null;
  image_data: string | null;
}

export interface MatchingWardrobeItems {
  shirt: MatchingWardrobeItem[];
  trouser: MatchingWardrobeItem[];
  blazer: MatchingWardrobeItem[];
  shoes: MatchingWardrobeItem[];
  belt: MatchingWardrobeItem[];
}

export interface OutfitSuggestion {
  id: string;
  shirt: string;
  trouser: string;
  blazer: string;
  shoes: string;
  belt: string;
  reasoning: string;
  imageUrl?: string;
  model_image?: string | null; // Base64 encoded image of model wearing the outfit
  matching_wardrobe_items?: MatchingWardrobeItems; // Items from user's wardrobe that match the suggestion
  raw?: unknown;
  meta?: {
    usedPrompt: string;
  };
}

export interface Filters {
  occasion: string;
  season: string;
  style: string;
}

export interface OutfitRequest {
  image: File;
  text_input: string;
}

export interface OutfitResponse {
  shirt: string;
  trouser: string;
  blazer: string;
  shoes: string;
  belt: string;
  reasoning: string;
  model_image?: string | null; // Base64 encoded image of model wearing the outfit
}

export interface ApiError {
  detail: string;
  status?: number;
}

export interface OutfitHistoryEntry {
  id: number;
  created_at: string;
  text_input: string;
  image_data: string | null;
  model_image: string | null; // Generated model image if available
  shirt: string;
  trouser: string;
  blazer: string;
  shoes: string;
  belt: string;
  reasoning: string;
}

