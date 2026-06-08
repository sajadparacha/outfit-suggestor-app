# Feature Spec: Route-Based Navigation

**Branch:** `feature/multiagent-ui-ux-enhancements`  
**Slug:** `route-based-navigation`  
**Status:** done

---

## User story

As a user (and as the product team), I want shareable URLs, working browser back/forward, and clean page analytics—without changing the existing UX or components.

---

## Canonical routes (web)

| Path | View / component | Auth required |
|------|------------------|---------------|
| `/` | Main (Suggest) flow | No |
| `/wardrobe` | `Wardrobe` | Yes (redirect guests to `/` with login prompt) |
| `/history` | `OutfitHistory` full view | Yes |
| `/insights` | Wardrobe gap analysis | Yes |
| `/guide` | `UserGuide` | No |
| `/about` | `About` | No |
| `/settings` | Settings + change password | Partial (show login CTA if guest) |
| `/admin/reports` | `AdminReports` | Admin only |
| `/admin/integration-tests` | `AdminIntegrationTestRunner` | Admin + testRunnerEnabled |

**Query params (preserve existing behavior):**
- `/wardrobe?category=shirt` — initial category filter (replaces `wardrobeCategoryFilter` state seed)

Unknown paths → redirect to `/`.

---

## Web implementation

1. Add `react-router-dom` (v6) to `frontend/package.json`.
2. Wrap app in `BrowserRouter` in `index.tsx`. Use `basename={process.env.PUBLIC_URL}` for GH Pages compatibility.
3. Create `frontend/src/navigation/routes.ts` — path constants + `AppView` → path helpers.
4. Refactor `App.tsx`:
   - Remove `currentView` / `setCurrentView` state.
   - Use `<Routes>` / `<Route>`; keep all existing view components and handlers.
   - Replace navigations with `useNavigate()` + path constants.
   - `useLocation()` for active nav state in `NavBar`.
5. Update `NavBar.tsx` to use router links (`NavLink` or `useNavigate` + `useLocation`).
6. Add `public/404.html` SPA fallback for GitHub Pages (copy of index.html) if not present.
7. Update tests: wrap `App` in `MemoryRouter` in `App.test.tsx`; fix any broken navigation tests.

**Do not** migrate to Next.js in this task.

---

## iOS implementation (parity)

iOS uses tabs, not URLs—but align **canonical route identifiers** with web for deep linking readiness.

1. Create `ios-client/OutfitSuggestor/Navigation/AppRoute.swift`:
   - Enum or struct with path strings matching web table above.
   - `tabIndex` mapping where applicable.
2. Add `NavigationCoordinator` or extend `MainTabView`:
   - `handleIncomingRoute(_ path: String)` selects tab and pushes stack destinations (Guide, About, Insights, Settings, Admin reports) via `NavigationPath` or bindings.
3. Wire `.onOpenURL` in `OutfitSuggestorApp.swift` (or `ContentView`) to parse path and call route handler.
   - Support custom scheme `outfitsuggestor://wardrobe` and universal-style paths `/wardrobe`.
4. Document route ↔ tab mapping in file header comments.

**No** Universal Links entitlements or Associated Domains in this task.

---

## API and contract

- [x] No backend changes.

---

## Parity checklist

- [x] Web paths match spec table
- [x] iOS `AppRoute` paths match web
- [x] Browser back/forward works on web (React Router history)
- [x] Direct URL load works on web (GH Pages `404.html` SPA fallback)
- [x] iOS `onOpenURL` routes to correct tab/screen
- [x] Same components; no UX redesign

---

## Out of scope

- Next.js migration
- Universal Links / Associated Domains setup
- Analytics instrumentation (routes enable it later)
