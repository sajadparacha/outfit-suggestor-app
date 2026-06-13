# Feature Spec: Wardrobe Insights Redesign

**Branch:** `feature/wardrobe-insights-ui-ux`  
**Slug:** `wardrobe-insights-redesign`  
**Status:** done

---

## User story

As a user, I want a clean, premium Wardrobe Insights screen that immediately tells me what to buy next and what action to take — so I can improve my wardrobe without wading through a long AI debug report.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe Insights page | `frontend/src/views/components/insights/*` + `App.tsx` route | `ios-client/OutfitSuggestor/Views/Insights/*` | Replace monolithic `WardrobeGapAnalysis.tsx` / `InsightsView.swift` result UI |
| Shared normalizer | `frontend/src/models/WardrobeInsightResult.ts` + `frontend/src/utils/normalizeWardrobeInsight.ts` | `ios-client/OutfitSuggestor/Models/WardrobeInsightResult.swift` + `Utils/NormalizeWardrobeInsight.swift` | Map existing `WardrobeGapAnalysisResponse` → `WardrobeInsightResult` |

### Flow

1. **Before analysis** — show full preferences form (occasion, season, style, notes); primary CTA **Analyze My Wardrobe** / **New Analysis** when no result yet.
2. **During analysis** — existing loading/progress behavior (web: loading state; iOS: `AiProgressPanelView`).
3. **After analysis** — collapse preferences into **Analysis Context Bar** showing Occasion, Season, Style + **Change preferences** action. Do NOT keep full form expanded.
4. **Change preferences** — expands form again; user can re-run analysis.
5. **New Analysis** — resets or reopens preferences for a fresh run.
6. **Generate outfits using these gaps** — navigate to main outfit flow with gap context (existing navigation hooks).
7. **Create outfits** (per missing item) — use selected item/category as context for outfit generation.
8. **Shop similar** — use existing Google Shopping search helper if available; safe placeholder handler otherwise.
9. **View style guide** — navigate to Guide (`ROUTES.GUIDE` / UserGuideView).
10. **Admin/debug** — only when `user.is_admin` / `auth.currentUser?.is_admin == true`.

---

## Page structure (both platforms — identical hierarchy & copy)

### 1. Wardrobe Insights Header
- Title: **Wardrobe Insights**
- Subtitle: **AI-powered analysis of your wardrobe to help you dress better.**
- Primary action: **New Analysis** (top-right when result exists; before first run, use Analyze flow)

### 2. Analysis Context Bar (collapsed, after analysis)
- Label: **Analyzed for**
- Tags: Occasion, Season, Style
- Action: **Change preferences**
- Before analysis: show full `AnalysisPreferences` / `AnalysisPreferencesView` instead

### 3. Main Summary Card
- Wardrobe gap score (0–100) with circular progress ring
- Score label: **Weak** / **Fair** / **Good** / **Strong** (derive from score bands)
- Short diagnosis text (from `overall_summary` / `summaryText` or normalized summary)
- **Top 3 priorities** numbered list (from `topPriorities`)
- Primary CTA: **Generate outfits using these gaps**
- Optional illustration area on web only if assets exist — do not block if missing

### 4. Top Items to Add
- Section title: **Top items to add**
- Subtitle: **High impact pieces that will level up your wardrobe.**
- Cards: item name, priority badge (High/Medium/Low), short reason, best colors (swatches), works with (short list), **Create outfits** (primary), **Shop similar** (secondary)
- Web: responsive grid/carousel (3 desktop, 2 tablet, 1 or horizontal scroll mobile)
- iOS: vertical cards or horizontal scroll

### 5. Wardrobe Coverage Dashboard
- Section title: **Wardrobe coverage**
- Subtitle: **How your wardrobe looks across essential categories.**
- Categories: Shirts, Trousers, Shoes, Blazers, Belts, Colors, Styles
- Each card: icon, category name, status, short helper text
- Status values: **Good**, **Medium**, **Weak**, **Missing**, **Needs neutrals**, **Too casual**
- Web: responsive grid (4–7 per row by width)
- iOS: 2-column `LazyVGrid`

### 6. Detailed Category Analysis
- Section title: **Detailed category analysis**
- Subtitle: **Tap a category to see details and recommendations.**
- Collapsed by default
- Row: category icon, name, one-line summary, status badge, chevron
- Expanded: existing wardrobe assessment, missing items, recommended next step, CTA if relevant

### 7. Quick Tip
- Text: **Focus on versatile, neutral pieces. They will work with most of your existing clothes and help you create more outfits with fewer items.**
- Secondary CTA: **View style guide**

### 8. Admin / Debug (admin only)
- Hide from normal users: Analysis Cost, AI Prompt & Response, raw prompt/response, model fallback text, diagnostic logs
- `AdminDebugPanel` / `AdminDebugView` only when admin flag true

---

## Shared data model

Normalize existing API `WardrobeGapAnalysisResponse` into `WardrobeInsightResult`:

```typescript
WardrobeInsightResult {
  context: { occasion, season, style }
  score: { value: number, label: 'Weak'|'Fair'|'Good'|'Strong', summary: string }
  topPriorities: [{ id, rank, name, category, priority }]
  missingItems: [{ id, name, category, priority, reason, bestColors[], worksWith[] }]
  categoryHealth: [{ id, category, status, summary, details, recommendedStep }]
  diagnostics?: { missingCategories[], colorsToAdd[], stylesToTry[] }  // admin only
  admin?: { aiPrompt?, aiRawResponse?, cost? }  // admin only
}
```

**Score bands (both platforms):**
- 0–39: Weak
- 40–59: Fair
- 60–79: Good
- 80–100: Strong

Derive score from category gaps (item counts, missing colors/styles) when API does not return explicit score.

**Category health mapping** from `analysis_by_category`:
- `shirt` → Shirts
- `trouser` → Trousers
- `shoes` → Shoes
- `blazer` → Blazers
- `belt` → Belts
- Aggregate colors → Colors (status: Needs neutrals if many missing neutrals)
- Aggregate styles → Styles (status: Too casual if style mismatch)

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading | Show progress; disable analyze | Existing loading messages |
| Empty (no result) | Full preferences form + Analyze CTA | Subtitle as above |
| Error | Inline error banner | User-friendly message; no raw API errors |
| Success | Full redesigned layout | Sections per structure above |

---

## Visual / UX

- Dark premium styling: deep navy/slate background, elevated cards
- Purple (`brand-blue` / `AppTheme.accent`) for primary CTAs and key highlights only
- Status colors: green (Good), yellow/gold (Medium), orange (Weak), red (Missing), purple-blue (Needs neutrals), blue (Too casual)
- Strong spacing between sections; summary card is visually dominant
- Reduce chips/pills; short descriptions
- Primary vs secondary button hierarchy clear

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, actions
- Layout-only: `adaptiveContent`, `LazyVGrid` column count, spacing via `horizontalSizeClass`

---

## API and contract

### Backend changes needed?

- [x] No — UI-only; normalize client-side from existing `WardrobeGapAnalysisResponse`

### Endpoints (unchanged)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/wardrobe/analyze-gaps` | Wardrobe gap analysis |

### Client contract files to update

**Web**

- [x] `frontend/src/models/WardrobeInsightResult.ts` (new)
- [x] `frontend/src/utils/normalizeWardrobeInsight.ts` (new)
- [ ] `frontend/src/services/ApiService.ts` — no API change
- [ ] Deprecate/replace `WardrobeGapAnalysis.tsx` with new component tree

**iOS**

- [x] `ios-client/OutfitSuggestor/Models/WardrobeInsightResult.swift` (new)
- [x] `ios-client/OutfitSuggestor/Utils/NormalizeWardrobeInsight.swift` (new)
- [ ] Refactor `InsightsView.swift` into component files under `Views/Insights/`

### Shared constants / enums

| Name | Value(s) | Web file | iOS file |
|------|----------|----------|----------|
| Score labels | Weak, Fair, Good, Strong | `normalizeWardrobeInsight.ts` | `NormalizeWardrobeInsight.swift` |
| Coverage statuses | Good, Medium, Weak, Missing, Needs neutrals, Too casual | same | same |
| Section copy | See structure above | component files | component files |

---

## User-facing docs (About & Guide)

- [x] **Yes** — Wardrobe Insights flow and copy change significantly
  - Guide: Update Insights step to describe summary-first layout, top priorities, coverage dashboard, collapsed details
  - About: Update Wardrobe Insights bullet to match new experience (action-focused, not debug report)

---

## Platform-specific notes

### Web only

- Component folder: `frontend/src/views/components/insights/`
- Suggested files: `WardrobeInsightsPage.tsx`, `InsightsHeader.tsx`, `AnalysisContextBar.tsx`, `AnalysisPreferencesCard.tsx`, `InsightSummaryCard.tsx`, `TopMissingItemsSection.tsx`, `MissingItemCard.tsx`, `WardrobeCoverageDashboard.tsx`, `CoverageStatusCard.tsx`, `CategoryDetailAccordion.tsx`, `QuickTipCard.tsx`, `AdminDebugPanel.tsx`
- Wire in `App.tsx` INSIGHTS route; keep auth gate
- Reuse `AnalysisPreferences.tsx` for expanded form
- Reuse existing `openShoppingSearch` logic from current `WardrobeGapAnalysis.tsx`
- Connect outfit generation via existing `navigate(ROUTES.MAIN)` + filter/preference state

### iOS only

- Component folder: `ios-client/OutfitSuggestor/Views/Insights/`
- Suggested files per user prompt
- Reuse `FiltersView` for expanded preferences
- SF Symbols: shirt, pants/trousers, shoe, jacket, belt fallback, paintpalette, hanger
- `AdminDebugView` gated by `auth.currentUser?.is_admin`

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- N/A — UI-only

### Web (web agent)

- [ ] Unit: `frontend/src/utils/normalizeWardrobeInsight.test.ts`
- [ ] Unit: component tests for summary, coverage, accordion, admin gating
- [ ] Integration: update `InsightsFlow.integration.test.tsx`, `AdminInsightsFlow.integration.test.tsx`
- [ ] Cases:
  1. Before analysis, full preferences form is visible
  2. After analysis, preferences collapse into context bar
  3. Summary card renders score, label, summary, and top 3 priorities
  4. Top missing item cards render priority, reason, colors, works-with, and CTAs
  5. Wardrobe coverage dashboard renders all category statuses
  6. Category details collapsed by default and can expand
  7. Admin/debug content hidden for normal users
  8. Admin/debug content only when admin flag true
  9. Responsive layout does not break (smoke via component structure)
  10. Empty/no-result state handled gracefully

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/NormalizeWardrobeInsightTests.swift`
- [ ] Unit: `ios-client/OutfitSuggestorTests/WardrobeInsightsViewTests.swift` (or extend existing)
- [ ] Cases: same 10 as web

---

## Parity checklist

- [ ] Same user-visible behavior on web and iOS
- [ ] About & Guide updated on both platforms
- [ ] Same copy and error messages
- [ ] Equivalent loading / empty / error UI
- [ ] Normalizer produces equivalent `WardrobeInsightResult` on both platforms
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated (Wardrobe Insights row)
- [ ] New-behavior tests added (web + iOS)
- [ ] Full web suite pass — orchestrator end gate
- [ ] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- Backend API shape changes
- New illustration assets (optional on web)
- Analysis mode picker removal (keep Quick/AI modes in preferences or collapsed context if currently used — can move to expanded form only)

## Reference

- Attached mockup: dark luxury UI, summary-first, purple accents, coverage dashboard, collapsible category rows
