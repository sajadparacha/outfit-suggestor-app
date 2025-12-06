/**
 * Data Models for Outfit Suggester Application
 * These models define the shape of data used throughout the application
 */

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

