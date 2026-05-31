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

export interface WardrobeGapAnalysisRequest {
  occasion: string;
  season: string;
  style: string;
  text_input: string;
  analysis_mode?: 'free' | 'premium';
}

export interface WardrobeAnalysisCost {
  gpt4_cost: number;
  model_image_cost?: number;
  total_cost: number;
  input_tokens?: number;
  output_tokens?: number;
}

export interface WardrobeCategoryGap {
  category: string;
  owned_colors: string[];
  owned_styles: string[];
  missing_colors: string[];
  missing_styles: string[];
  recommended_purchases: string[];
  item_count: number;
}

export interface WardrobePriorityShoppingItem {
  rank: number;
  itemName: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  recommendedColors: string[];
  recommendedStyles: string[];
  reason: string;
  outfitImpact: string;
  actions: string[];
}

export interface WardrobeCategoryInsight {
  category: string;
  missingColors: string[];
  missingStyles: string[];
  priority: 'High' | 'Medium' | 'Low';
  whyThisMatters: string;
  recommendation: string;
  suggestedActions: string[];
}

export interface WardrobeGapAnalysisResponse {
  occasion: string;
  season: string;
  style: string;
  analysis_mode?: 'free' | 'premium' | string;
  analysis_by_category: Record<string, WardrobeCategoryGap>;
  overall_summary: string;
  summaryText?: string;
  analysisDepth?: 'Basic' | 'Advanced' | 'Premium' | string;
  priorityShoppingList?: WardrobePriorityShoppingItem[];
  categoryInsights?: WardrobeCategoryInsight[];
  ai_prompt?: string | null;
  ai_raw_response?: string | null;
  cost?: WardrobeAnalysisCost;
}

