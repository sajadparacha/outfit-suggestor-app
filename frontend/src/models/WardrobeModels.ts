/**
 * Data Models for Wardrobe Management
 */

export interface WardrobeItem {
  id: number;
  category: string;
  name: string | null;
  description: string | null;
  color: string | null;
  brand: string | null;
  size: string | null;
  image_data: string | null;
  tags: string | null;
  condition: string | null;
  wear_count: number;
  created_at: string;
  updated_at: string;
}

export interface WardrobeItemCreate {
  category: string;
  color: string;
  description: string;
}

export interface WardrobeItemUpdate {
  category?: string | null;
  name?: string | null;
  description?: string | null;
  color?: string | null;
  brand?: string | null;
  size?: string | null;
  tags?: string | null;
  condition?: string | null;
}

export interface WardrobeSummary {
  total_items: number;
  by_category: Record<string, number>;
  by_color: Record<string, number>;
  categories: string[];
}

