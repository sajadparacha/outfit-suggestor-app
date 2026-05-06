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

export interface OutfitCost {
  gpt4_cost: number;
  model_image_cost?: number;
  total_cost: number;
  input_tokens?: number;
  output_tokens?: number;
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
  cost?: OutfitCost; // Cost breakdown for the AI suggestion in USD
  /** Category of the wardrobe item that matched the upload (e.g. 'shirt', 'trouser'). Use upload image for that category only. */
  upload_matched_category?: string | null;
  source_slot?: string | null;
  shirt_id?: number | null;
  trouser_id?: number | null;
  blazer_id?: number | null;
  shoes_id?: number | null;
  belt_id?: number | null;
  source_wardrobe_item_id?: number | null;
  ai_prompt?: string | null;
  ai_raw_response?: string | null;
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
  cost?: OutfitCost; // Cost breakdown for the AI suggestion in USD
  matching_wardrobe_items?: MatchingWardrobeItems;
  upload_matched_category?: string | null;
  source_slot?: string | null;
  shirt_id?: number | null;
  trouser_id?: number | null;
  blazer_id?: number | null;
  shoes_id?: number | null;
  belt_id?: number | null;
  source_wardrobe_item_id?: number | null;
  ai_prompt?: string | null;
  ai_raw_response?: string | null;
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
  shirt_id?: number | null;
  trouser_id?: number | null;
  blazer_id?: number | null;
  shoes_id?: number | null;
  belt_id?: number | null;
  source_wardrobe_item_id?: number | null;
  matching_wardrobe_items?: MatchingWardrobeItems;
}

