# Feature Spec: Random from History — Diverse Selection

**Branch:** `feature/random-history-diverse-selection`  
**Slug:** `random-history-diverse-selection`  
**Status:** done

---

## User story

As a user, I want Random from History to surface genuinely varied saved looks so that I do not see the same history row or near-duplicate outfits (same items from Generate Another / Refine) on repeated clicks.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Random from History action | `App.tsx` → `loadRandomFromHistory` | `OutfitViewModel.getRandomFromHistory()` | Behavior-only; no button/layout changes |
| Selection algorithm | `frontend/src/utils/randomHistorySelection.ts` | `ios-client/OutfitSuggestor/Utils/RandomHistorySelection.swift` | Same rules on both platforms |

### Flow

1. User taps **Random from History** (sidebar web / Random picks dialog iOS).
2. Client **refetches** history (do not rely on stale cache only).
3. **Deduplicate** by outfit fingerprint; keep one representative per fingerprint (most recent `created_at` / highest `id`).
4. **Exclude** current look (if showing a history/random result) and last N=5 session picks.
5. **Shuffle deck** of unique candidate ids once per session; pop next id on each click; reshuffle when exhausted.
6. Map chosen entry to suggestion and display (existing behavior).
7. On logout / `resetMainFlowState`, clear session deck + recent picks.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| No history | Existing error toast | Keep: "No history yet. Get some outfit suggestions first! 📋" (web) / same message (iOS) |
| Only one unique look after dedupe | Show that look | Optional info toast **once per session**: "Only one saved look in your history so far." — add to `MAIN_FLOW_UX_COPY` / `MainFlowUxCopy` |
| All candidates excluded | Relax exclusions (drop last-N, then current-id); shuffle fallback | No crash |
| Pick succeeds | Existing success toast | Keep: "Random outfit from your history! 📋" |

---

## Visual / UX

- No visual layout changes to buttons or Random picks UI.
- Behavior-only improvement for variety.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, and actions.
- Layout-only adjustments via `horizontalSizeClass` if needed (not expected).

---

## API and contract

### Backend changes needed?

- [x] No — UI-only (client-side selection)

### Client contract files to update

**Web**

- [ ] `frontend/src/utils/randomHistorySelection.ts` (new)
- [ ] `frontend/src/controllers/useOutfitController.ts`
- [ ] `frontend/src/controllers/useHistoryController.ts` (optional `fetchHistoryForRandomPick`)
- [ ] `frontend/src/utils/mainFlowUxCopy.ts` (optional one-look toast string)

**iOS**

- [ ] `ios-client/OutfitSuggestor/Utils/RandomHistorySelection.swift` (new)
- [ ] `ios-client/OutfitSuggestor/ViewModels/OutfitViewModel.swift`
- [ ] `ios-client/OutfitSuggestor/Utils/MainFlowUxCopy.swift` (optional one-look toast string)

### Shared selection rules

**Fingerprint** = normalized lowercase trim of core text fields: `shirt|trouser|blazer|shoes|belt` plus optional layer fields if present (`sweater|outerwear|tie`), AND wardrobe IDs when set (`shirt_id`, `trouser_id`, `blazer_id`, `shoes_id`, `belt_id`, `sweater_id`, `outerwear_id`, `tie_id`).

**Dedupe**: one entry per fingerprint; prefer most recent `created_at`, tie-break higher `id`.

**Exclude current look**: when `inputPanelSource === 'history'` (web) / `.history` (iOS) and current suggestion maps to a history id, exclude that id from candidates.

**Session recent picks**: track last N=5 picked history ids; exclude from candidates. If pool empty: relax last-N only, then allow repeats as last resort.

**Shuffle deck**: after dedupe, shuffle unique candidate ids once; pop on each Random click; reshuffle when deck exhausted. Persist deck + recent picks in session memory. Reset on logout / `resetMainFlowState` (web) / equivalent iOS reset.

**Refetch pool**:
- Web: always fetch fresh history for random pick (limit 100–200 or paginate until exhausted); do not use `ensureFullHistory` cache alone.
- iOS: refresh `cachedHistory` on each random pick (invalidate `hasLoadedHistory` for random flow).

---

## User-facing docs (About & Guide)

| Platform | Files |
|----------|--------|
| Web | `frontend/src/views/components/UserGuide.tsx`, `About.tsx` |
| iOS | `ios-client/OutfitSuggestor/Views/UserGuideView.swift`, `AboutView.swift` |

- [x] **Optional Guide only** — one line under Random from History noting picks rotate through varied saved looks (only if adding the optional toast copy)
- [ ] **About** — unchanged

---

## Platform-specific notes

### Web only

- Session state in `useOutfitController` refs/state: `randomHistoryDeck`, `recentRandomHistoryIds`, `hasShownSingleLookToast`.
- `loadRandomFromHistory` should accept fresh fetch function (e.g. `fetchHistoryForRandomPick(150)`).
- Current history id available via `currentSuggestion?.id` when `inputPanelSource === 'history'`.

### iOS only

- Session state on `OutfitViewModel`: deck, recent picks, single-look toast flag.
- Clear on logout paths that already reset `hasLoadedHistory` / `cachedHistory`.

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- N/A — skipped

### Web (web agent)

- [ ] Unit: `frontend/src/utils/randomHistorySelection.test.ts`
- [ ] Integration: extend `frontend/src/views/components/RandomFromHistory.integration.test.tsx`
- [ ] Cases:
  - Fingerprint dedupe keeps most recent per fingerprint
  - Exclude current history id from candidates
  - Exclude last N recent session ids
  - Shuffle deck pops without immediate repeat when multiple unique looks exist
  - Fallback when pool small (relax exclusions)
  - Integration: duplicate fingerprints in API response → consecutive random picks return different fingerprints when possible

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/RandomHistorySelectionTests.swift`
- [ ] Integration: extend `OutfitViewModelIntegrationTests` for wired flow
- [ ] Cases mirroring web: dedupe, exclude current, deck no immediate repeat, refetch on each pick

### Per-feature tests (agents add during implementation)

| Layer | Command |
|-------|---------|
| Web | `cd frontend && npm test -- --watchAll=false randomHistorySelection` and targeted integration file |
| iOS | `xcodebuild test … -only-testing:OutfitSuggestorTests/RandomHistorySelectionTests` |

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] About & Guide updated on both platforms (if optional Guide line added)
- [x] Same copy and error messages (`MAIN_FLOW_UX_COPY` / `MainFlowUxCopy` synced)
- [x] Equivalent edge-case behavior (single look, empty pool fallbacks)
- [x] `IOS_WEB_FEATURE_PARITY.md` §7 updated with diverse random selection (dedupe + session deck)
- [x] New-behavior tests added (web + iOS)
- [x] Full web suite pass — orchestrator end gate
- [x] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- Changing how history is saved
- Backend `GET /api/outfit-history/random` endpoint
- Random picks UI redesign
