/**
 * Shared main-flow UX labels — keep in sync with MainFlowUxCopy.swift and docs/main-flow-ux-contract.md
 */
export const MAIN_FLOW_UX_COPY = {
  primaryCta: 'Generate Outfit',
  primaryCtaAria: 'Get AI outfit suggestion',
  emptyPreviewHeadline: 'Your outfit appears here',
  emptyPreviewSubline: 'Upload a photo, set preferences, then tap Generate Outfit',
  resultTitle: 'Your Styled Look',
  whyThisWorks: 'Why this works',
  generateAnother: 'Generate Another Look',
  saveLook: 'Save Look',
  refine: 'Refine',
  refineMoreFormal: 'Make it more formal',
  refineMoreCasual: 'Make it more casual',
  refineWardrobeOnly: 'Use wardrobe items only',
  refineChangeOccasion: 'Change occasion',
  tagFromUpload: 'From your upload',
  tagFromWardrobe: 'From your wardrobe',
  fromHistory: 'From history',
  tagAiSuggested: 'AI Suggested',
  preferencesSection: 'Preferences',
  wardrobeSection: 'Wardrobe',
  randomPicksSection: 'Random picks',
  advancedOptionsSection: 'Advanced options',
  compactSummaryTitle: 'Your inputs',
  saveLookToast: 'Look saved!',
  saveLookAuthPrompt: 'Sign in to save looks',
  changeOccasionHint: 'Update occasion in Preferences, then tap Generate Another Look.',
  moreActions: 'More',
  uploadNewItem: 'Upload new item',
  compactUploadHint: 'Upload a new photo to start a fresh outfit',
} as const;

export type MainFlowUxCopyKey = keyof typeof MAIN_FLOW_UX_COPY;
