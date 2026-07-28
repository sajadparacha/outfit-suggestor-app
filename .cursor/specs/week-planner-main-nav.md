# Cost Twin UI: Week Planner + Insights main nav

**Branch:** `main`  
**Slug:** `week-planner-main-nav`  
**Status:** done  
**Mode:** Cost Twin UI (short spec)

---

## Goal

1. Rename primary nav label **Week** → **Week Planner** (web + iOS).
2. **iOS only:** expose **Wardrobe Insights** and **Week Planner** in the **main tab bar** (not only under Profile/Settings).

No API/backend changes.

---

## Behavior

### Web
- `NavBar` main link currently labeled `Week` → **`Week Planner`**.
- Keep Insights label as **`Insights`** (already in main nav) unless a one-line Guide/About mention needs “Week Planner” wording sync.
- Route `/week` unchanged.

### iOS
- Tab bar label currently `Week` → **`Week Planner`** (SF Symbol `calendar` OK).
- Add a **main TabView** entry for Insights:
  - Tab label: **`Insights`** (short; page title remains **Wardrobe Insights** via `InsightsCopy.pageTitle`).
  - Authenticated: show `InsightsView`.
  - Guest: `GuestTabPlaceholderView` with insights auth context (same pattern as Wardrobe/Week).
- Tab order (left→right): Suggest → Wardrobe → Week Planner → Insights → Looks → Profile.
- Update `AppRoute.TabIndex` + `RouteCoordinator` so `/insights` selects the Insights tab (not Profile stack push). `/week` keeps Week Planner tab.
- Settings “Discover” may keep Week Planner / Insights as secondary shortcuts; primary entry is the tab bar.
- Same UX on iPhone and iPad (layout-only differences OK). Six tabs may use system More on compact width — acceptable.

### About / Guide
- Only if copy still says nav “Week” alone; one-line fix to “Week Planner” if present. Skip otherwise.

---

## Files (agents — read only these + their tests)

**Web:**  
`frontend/src/views/components/NavBar.tsx`  
`frontend/src/views/components/GuideAndFooter.integration.test.tsx` (or a small NavBar test — **one test file max**)  
Optional: `UserGuide.tsx` / `About.tsx` only if “Week” nav wording appears

**iOS:**  
`ios-client/OutfitSuggestor/Views/MainTabView.swift`  
`ios-client/OutfitSuggestor/Navigation/AppRoute.swift`  
`ios-client/OutfitSuggestor/Navigation/RouteCoordinator.swift`  
`ios-client/OutfitSuggestor/Models/WeekPlanModels.swift` (only if `WeekPlanCopy.navTitle` / tab copy lives there)  
`ios-client/OutfitSuggestor/Utils/AuthPromptCopy.swift` (insights guest context if missing)  
`ios-client/OutfitSuggestorTests/` — **one** test file (e.g. route/tab mapping or copy)  
Optional: Settings Discover label already says Week Planner — leave unless broken by TabIndex change

**Backend:** none

---

## Tests (3–5)

- Web: main nav shows **Week Planner** (not bare `Week`); `/week` still reachable.
- iOS: tab label **Week Planner**; Insights tab present and opens Wardrobe Insights (or guest gate).
- iOS: `/insights` maps to Insights tab; `/week` maps to Week Planner tab.
- Guest: Insights/Week Planner tabs show auth placeholder (not crash).

**Cost mode:** one test file per platform; targeted run only. No full suites unless asked.

## Out of scope

New APIs; renaming History↔Looks; web Insights → “Wardrobe Insights” string; design-system rewrite.
