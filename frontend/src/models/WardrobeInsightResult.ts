import { WardrobeAnalysisCost } from './WardrobeModels';

export type ScoreLabel = 'Weak' | 'Fair' | 'Good' | 'Strong';
export type CoverageStatus =
  | 'Good'
  | 'Medium'
  | 'Weak'
  | 'Missing'
  | 'Needs neutrals'
  | 'Too casual';
export type ItemPriority = 'High' | 'Medium' | 'Low';

export interface WardrobeInsightContext {
  occasion: string;
  season: string;
  style: string;
}

export interface WardrobeInsightScore {
  value: number;
  label: ScoreLabel;
  summary: string;
}

export interface WardrobeTopPriority {
  id: string;
  rank: number;
  name: string;
  category: string;
  priority: ItemPriority;
}

export interface WardrobeMissingItem {
  id: string;
  name: string;
  category: string;
  priority: ItemPriority;
  reason: string;
  bestColors: string[];
  worksWith: string[];
}

export interface WardrobeCategoryHealth {
  id: string;
  category: string;
  status: CoverageStatus;
  summary: string;
  details: string;
  ownedColors: string[];
  ownedStyles: string[];
  missingColors: string[];
  missingStyles: string[];
  recommendedStep: string;
}

export interface WardrobeInsightDiagnostics {
  missingCategories: string[];
  colorsToAdd: string[];
  stylesToTry: string[];
}

export interface WardrobeInsightAdmin {
  aiPrompt?: string | null;
  aiRawResponse?: string | null;
  cost?: WardrobeAnalysisCost;
}

export interface WardrobeInsightResult {
  context: WardrobeInsightContext;
  score: WardrobeInsightScore;
  topPriorities: WardrobeTopPriority[];
  missingItems: WardrobeMissingItem[];
  categoryHealth: WardrobeCategoryHealth[];
  diagnostics?: WardrobeInsightDiagnostics;
  admin?: WardrobeInsightAdmin;
}
