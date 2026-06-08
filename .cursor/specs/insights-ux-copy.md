# Feature Spec: Insights UX Copy Review

**Branch:** `feature/multiagent-ui-ux-enhancements`  
**Slug:** `insights-ux-copy`  
**Status:** done (pending full-suite verification)

---

## User story

As a regular user, I want Insights to read like a fashion assistant—not a technical report—so that I feel confident using wardrobe analysis without needing to understand AI jargon.

---

## Problem

Insights uses admin/developer language in user-facing UI:

- Basic Analysis / Premium Analysis / ChatGPT
- Wardrobe Gap Analysis
- Priority Shopping List
- Category-wise coverage
- Missing colors / Missing styles

Admin-only sections (diagnostics, tokens, USD) stay technical—**only visible to admins**.

---

## Copy mapping (both platforms — must match)

### Primary labels (required)

| Old (user-facing) | New (user-facing) |
|-------------------|-------------------|
| Basic Analysis | **Quick Wardrobe Check** |
| Premium Analysis | **AI Stylist Review** |
| Wardrobe Gap Analysis | **What's Missing From My Wardrobe?** |
| Priority Shopping List | **What to Buy Next** |

### Secondary labels (required — soften related technical copy)

| Old | New |
|-----|-----|
| Missing colors | **Colors to add** |
| Missing styles | **Styles to try** |
| Categories analyzed | **Categories checked** |
| Top buy-next category | **Best category to shop next** |
| Run analysis to get category-wise color and style coverage. | **Run a check to see what's missing in each part of your wardrobe.** |
| Choose Analysis Mode | **How would you like to check your wardrobe?** |
| Pick how you want your wardrobe analyzed. | **Pick the level of detail you want from your stylist.** |
| Analysis depth: Basic | **Review type: Quick Wardrobe Check** |
| Analysis depth: Premium | **Review type: AI Stylist Review** |
| Running Premium Analysis with ChatGPT... | **Preparing your AI Stylist Review...** |
| Analyzing your wardrobe with free rules... (iOS) | **Running your Quick Wardrobe Check...** |
| Premium Analysis is ready. ✅ (web toast) | **Your AI Stylist Review is ready. ✅** |
| Basic (iOS segmented control) | **Quick Check** |
| Premium (ChatGPT) (iOS segmented control) | **AI Stylist** |

### Modal / mode picker subtitles (web `App.tsx`)

| Mode | Title | Subtitle |
|------|-------|----------|
| Quick | Quick Wardrobe Check | Fast snapshot with practical buy-next guidance. |
| AI | AI Stylist Review | Deeper styling advice tailored to your occasion and wardrobe. |

### Admin-only — keep technical (do not rename)

- Admin diagnostics
- Analysis Cost, Input tokens, Output tokens, ChatGPT cost line
- AI Prompt & Response (Admin)
- `data-testid` / `accessibilityIdentifier` values may stay stable for tests; update test assertions to match new visible copy

### Guide / About pages

Update user-facing mentions of Insights analysis modes to use new labels. Admin/technical references in About can mention AI under the hood briefly but primary CTA labels must use the fashion-assistant wording.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Insights page header | `WardrobeGapAnalysis.tsx` | `InsightsView.swift` | Main title + empty state |
| Analysis mode picker | `App.tsx` modal | `InsightsView.swift` segmented picker | Same labels both platforms |
| Loading overlay | `App.tsx`, `AiProgressPanel` message | `InsightsView.swift` `analysisLoadingMessage` | No ChatGPT in user loading copy |
| Results — shopping list | `WardrobeGapAnalysis.tsx` | `InsightsView.swift` `GapAnalysisResultView` | What to Buy Next |
| Results — stat cards | `WardrobeGapAnalysis.tsx` | `InsightsView.swift` summary grid | Softer stat labels |
| Category cards | `WardrobeGapAnalysis.tsx` | `InsightsView.swift` `CategoryGapCard` | Colors to add / Styles to try |
| Admin diagnostics | both (admin only) | both (admin only) | Unchanged labels |
| User guide | `UserGuide.tsx` | `UserGuideView.swift` | Align mode names |

### Flow

1. User opens Insights (nav unchanged: tab/link still **Insights**).
2. User picks Quick Wardrobe Check or AI Stylist Review.
3. Loading message uses friendly copy (no ChatGPT mention).
4. Results show **What's Missing From My Wardrobe?** section title and **What to Buy Next** list.
5. Admins still see Admin diagnostics with token/USD details.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading | Overlay / inline spinner | Quick: "Running your Quick Wardrobe Check..." / AI: "Preparing your AI Stylist Review..." |
| Empty | No result yet | "Run a check to see what's missing in each part of your wardrobe." |
| Error | Show API error | Unchanged (server message) |
| Success | Show results | New section headings and stat labels per mapping |

---

## Visual / UX

- **Copy-only change** — no layout, color, or navigation changes.
- Keep existing component structure and admin gating.
- Prefer a **shared copy module** on each platform for parity:
  - Web: `frontend/src/utils/insightsCopy.ts`
  - iOS: `ios-client/OutfitSuggestor/Utils/InsightsCopy.swift`

---

## API and contract

### Backend changes needed?

- [x] No — UI-only (copy strings). Internal `analysis_mode` values (`free` / `premium`) unchanged.

### Client contract files to update

- [ ] Optional shared copy constants only (no API/model changes)

---

## Platform-specific notes

### Web only

- Update tests: `WardrobeGapAnalysis.test.tsx`, `InsightsFlow.integration.test.tsx`, `AdminInsightsFlow.integration.test.tsx`
- `App.tsx` wardrobe analysis mode modal + global loading/toast messages

### iOS only

- Update `OutfitAppE2ETests.swift` assertions for new visible strings
- Segmented control accessibility label can stay `insights.analysisMode`

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- [x] N/A — no backend changes

### Web (web agent)

- [ ] Unit: `frontend/src/utils/insightsCopy.test.ts` (assert key label constants)
- [ ] Update: `frontend/src/views/components/WardrobeGapAnalysis.test.tsx`
- [ ] Update: `frontend/src/views/components/InsightsFlow.integration.test.tsx`
- [ ] Update: `frontend/src/views/components/AdminInsightsFlow.integration.test.tsx`
- [ ] Cases:
  - Results header shows "What's Missing From My Wardrobe?"
  - Shopping section shows "What to Buy Next"
  - Stat cards use "Colors to add" / "Styles to try" (not "Missing colors/styles")
  - Mode picker buttons use Quick Wardrobe Check / AI Stylist Review
  - Admin diagnostics still visible for admin users with unchanged "Admin diagnostics" label
  - Integration flow clicks updated mode button labels

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/InsightsCopyTests.swift`
- [ ] Update UITest: `OutfitAppE2ETests.swift` — `testAdminPremiumInsightsShowsCostPromptAndResponse`
- [ ] Cases:
  - `InsightsCopy` constants match spec mapping
  - Build succeeds
  - InsightsView displays new header and segmented labels (unit or snapshot-style test if feasible)

### Per-feature tests (agents add during implementation)

| Layer | Command |
|-------|---------|
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build` + run new/updated test classes |

### End of Twin UI — confirm, then full suites + report (orchestrator)

Orchestrator **asks user to confirm** before running these (full suites take several minutes):

| Layer | Command |
|-------|---------|
| Web (always) | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS (always) | `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests -only-testing:OutfitSuggestorUITests` |

After user confirms, publish filled report using `.cursor/specs/_test-report-template.md`.

---

## Parity checklist

- [ ] Same user-visible behavior on web and iOS
- [ ] Same copy and error messages
- [ ] Equivalent loading / empty / error UI
- [ ] API client methods match on both platforms
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated (copy refresh note)
- [ ] New-behavior tests added (web + iOS)
- [ ] Full web suite pass — orchestrator end gate
- [ ] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- Renaming the **Insights** nav tab/link
- Backend prompt engineering or API response shape changes
- Changing admin diagnostics content (tokens, USD, ChatGPT cost lines)
- Changing internal enum/API values (`free`, `premium`, `analysis_mode`)
