# Feature Spec: Clear Main Flow on Logout

**Branch:** `feature/ui-ux-final-touches`  
**Slug:** `logout-clear-main-flow`  
**Status:** done — agent tests pass; full suite pending user confirm

---

## User story

As a user who logs out, I want the **Suggest** main screen to reset to a fresh state so I do not see my previous session's uploaded image, outfit result, wardrobe source, or in-progress UI.

---

## Problem

`handleLogout` / `AuthService.logout()` clears auth tokens only. Outfit flow state (image, `currentSuggestion`, filters, modals, banners) persists on the main page.

---

## Expected behavior on logout

Reset **main suggest flow** to guest-ready empty state:

| State | On logout |
|-------|-----------|
| Uploaded image | Cleared |
| Current outfit result | Cleared |
| Source wardrobe item | Cleared |
| Loading / error | Cleared; cancel in-flight request |
| Duplicate modal | Closed |
| Filters + preference notes | Reset to defaults |
| `useWardrobeOnly` | `false` |
| First-outfit signup banner | Hidden |
| Wardrobe-add / duplicate modals (web) | Closed |
| Recent history section | Already clears via `useHistoryController` — verify still works |

**Do not clear:**

- Guest session id / guest usage counter (backend + `X-Guest-Session-Id`) — refresh guest usage after logout
- `first_run_coach_dismissed` / first-run coach keys
- `intro_hero_seen`, AI prompt visibility prefs

**Navigation:** If on auth-gated route (`/wardrobe`, `/history`, etc.), redirect to `/` (web) or Suggest tab (iOS) — verify existing behavior.

---

## Screens and flows

| Screen / area | Web location | iOS location |
|---------------|--------------|--------------|
| Logout handler | `App.tsx` `handleLogout` + `useEffect` on `isAuthenticated` | `MainTabView.swift` `onChange(of: auth.isAuthenticated)` |
| Reset API | `useOutfitController.ts` — add `resetMainFlowState()` | `OutfitViewModel.swift` — add/extend `resetSessionState()` |

### Flow

1. User taps **Logout**.
2. Auth clears token/session.
3. Main flow resets immediately (same render cycle or `useEffect` on auth false).
4. Guest sees empty Suggest: no image, no result, default preferences, empty preview copy.
5. `guestRemaining` refreshed from API.

---

## API and contract

- [x] No backend changes

---

## Tests (required)

### Web

- [ ] Unit: `useOutfitController` — `resetMainFlowState` clears image, suggestion, source item, error
- [ ] Integration or App test: after logout, main page does not show prior suggestion/image
- [ ] Run: `cd frontend && npm test -- --watchAll=false --passWithNoTests`

### iOS

- [ ] Unit: `OutfitViewModel` reset on logout clears `selectedImage`, `currentSuggestion`, filters
- [ ] Build + run new/updated test class
- [ ] Run: `xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build`

---

## Parity checklist

- [ ] Same reset behavior web + iOS
- [ ] Tests added both platforms
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated if needed

---

## Out of scope

- Clearing guest session / resetting free-try count on logout
- Wardrobe list cache (gated behind login; reloads on next login)
