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
  shirt: string;
  trouser: string;
  blazer: string;
  shoes: string;
  belt: string;
  reasoning: string;
}

