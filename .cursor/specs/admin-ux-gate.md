# Feature Spec: Admin UX — Hide Admin Surfaces from Normal Users

**Branch:** `feature/multiagent-ui-ux-enhancements`  
**Slug:** `admin-ux-gate`  
**Status:** done (pending full-suite verification)

---

## User story

As a regular user, I should never see admin-only tooling (prompts, costs, diagnostics, reports, integration tests, model selectors) so the app feels polished and trustworthy in production.

---

## Problem

Admin features are mostly gated, but some surfaces leak to non-admins:

- Web: model preview toggle via `?modelGeneration=true` URL flag for non-admins
- Web: visiting `/admin/reports` or `/admin/integration-tests` shows feature titles ("Reports", "Integration Tests") even when denied
- Guide / About mention admin toggles and diagnostics to all readers
- Need defense-in-depth: never render admin panels unless `isAdmin === true`

---

## Admin-only surfaces (must be invisible to non-admins)

| Surface | Web | iOS |
|---------|-----|-----|
| AI prompt / raw response panels | OutfitPreview, Sidebar toggle | MainFlowView advanced, OutfitSuggestionView |
| Token / USD cost breakdown | OutfitPreview, WardrobeGapAnalysis | OutfitSuggestionView, InsightsView |
| Image model selector (DALL-E / SD / Nano) | Sidebar advanced | MainFlowView advanced |
| Include AI model preview toggle | Sidebar (currently URL-flag for non-admin) | MainFlowView (already admin-only) |
| Admin diagnostics (Insights) | WardrobeGapAnalysis | InsightsView |
| Reports | NavBar + route | Settings Admin section |
| Integration tests | NavBar + route | Deep link only (already route-gated) |
| "Advanced options" disclosure (admin content) | Sidebar, OutfitPreview | MainFlowView |

---

## Required changes

### 1. Admin gate — defense in depth

Both platforms: admin UI renders **only** when authenticated user has `is_admin === true`.

- Pass `isAdmin={false}` explicitly when user is not admin (never rely on optional default alone)
- Child components (`OutfitPreview`, `WardrobeGapAnalysis`, `OutfitSuggestionView`): keep `isAdmin` guard at top of admin sections; do not render cost/prompt/diagnostics when `!isAdmin` even if API returns data
- iOS `MainFlowView`: pass `showAiPromptResponse: isAdmin && showAiPromptResponse` (not raw state)

### 2. Model preview & model selector — admin-only (web parity with iOS)

**Web `App.tsx` / `Sidebar.tsx`:**

- Change model generation controls to **`isAdmin` only**
- Remove non-admin access via `?modelGeneration=true` URL flag (admins may still use URL flag on localhost for dev if desired, but non-admins never see controls)
- Model selector (`Image model` dropdown) stays inside admin-only Advanced options, shown only when model preview is on

### 3. Admin routes — silent redirect for non-admins (web)

When non-admin (or guest) navigates to `/admin/reports` or `/admin/integration-tests`:

- **Redirect** to main suggest route (`ROUTES.MAIN`) via `<Navigate replace />`
- Do **not** render "Admin privileges required" pages that expose feature names

Admin nav links (Reports, Tests) remain visible only when `user.is_admin && testRunnerEnabled` (Tests).

### 4. Guide & About — admin content only for admins

**Web:**

- Pass `isAdmin={!!user?.is_admin}` to `UserGuide` and `About` routes from `App.tsx`
- Hide admin-specific TipBoxes / sections (Show AI Prompt, admin diagnostics, Reports, cost transparency) when `!isAdmin`
- General users still see the Guide and About; only admin how-to content is hidden

**iOS:**

- Pass admin flag into `UserGuideView` / `AboutView` (via environment or prop from navigation)
- Same: hide admin-only paragraphs/tips for non-admins

### 5. Copy cleanup (non-admin facing)

Soften or remove from **general-audience** copy (when `!isAdmin`):

- About footer: remove "transparent admin diagnostics" from tagline visible to all users
- User guide nav table: hide "Reports" row for non-admins

Admin users still see full documentation.

---

## Screens and flows

| Check | Expected for non-admin |
|-------|------------------------|
| Suggest sidebar | No "Advanced options", no model preview toggle, no model selector |
| Suggestion result | No cost, no prompt/response, no "Advanced options" |
| Insights results | No "Admin diagnostics" |
| Nav bar | No Reports / Tests links |
| `/admin/*` URLs | Redirect to home/suggest |
| Guide / About | No admin how-to sections |
| Settings (iOS) | No Admin section |

---

## API and contract

### Backend changes needed?

- [x] No — client-side visibility only (API may still return cost/prompt; clients must not display)

---

## Platform-specific notes

### Web

- `App.tsx`: route guards, UserGuide/About props, modelGenerationEnabled logic
- `Sidebar.tsx`: `showModelGenerationControls = isAdmin` only
- New test file: `AdminVisibility.test.tsx` or extend existing integration tests

### iOS

- `MainFlowView.swift`: tighten `showAiPromptResponse` pass-through
- `UserGuideView.swift`, `AboutView.swift`: conditional admin sections
- `RouteCoordinator` already redirects non-admin admin routes — verify no UI leak on manual navigation
- Unit tests for admin gate helpers if extracted

---

## Tests (required)

### Backend

- [x] N/A

### Web (web agent)

- [ ] `AdminVisibility.test.tsx` or extend `AIInstrumentation.integration.test.tsx` + new route test
- [ ] Cases:
  - Non-admin sidebar: no "Advanced options", no "Include AI model preview", no "Show AI Prompt"
  - Non-admin OutfitPreview: no cost, no prompt panel (existing tests may cover — ensure)
  - Non-admin WardrobeGapAnalysis: no `admin-diagnostics` test id
  - Non-admin `/admin/reports` redirects (renderApp with router)
  - Non-admin UserGuide: admin tip not in document
  - Admin user: admin surfaces still visible (smoke from existing AdminInsightsFlow)

### iOS (iOS agent)

- [ ] `AdminVisibilityTests.swift` or extend existing tests
- [ ] Cases:
  - Non-admin: Settings has no Admin section (unit/view test pattern used in project)
  - Admin: Settings shows Reports link
  - Build succeeds

### Per-feature tests

| Layer | Command |
|-------|---------|
| Web | `npm test -- --watchAll=false --passWithNoTests` |
| iOS | build + new test class |

---

## Parity checklist

- [ ] Non-admin never sees listed admin surfaces on web and iOS
- [ ] Admin users retain full admin tooling
- [ ] Model preview admin-only on both platforms
- [ ] Guide/About admin sections admin-gated
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated if needed
- [ ] New tests on both platforms

---

## Out of scope

- Backend stripping of cost/prompt fields
- Removing admin features entirely
- Changing admin API endpoints
