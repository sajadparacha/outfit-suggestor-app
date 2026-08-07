# Feature Spec: UX coherence & hierarchy (all phases)

**Branch:** `fix/weekly-planner-gui`  
**Slug:** `ux-coherence-hierarchy`  
**Status:** done

---

## User story

As a user, I want a clear product story and navigation so that Suggest, Wardrobe, Insights, and Week Planner feel like one men’s stylist product—not a pile of peer tools.

---

## Product decisions (locked)

- Audience: **men’s wardrobe stylist** (keep shopping “men’s” queries as-is).
- Three rings: **Suggest** (instant) → **Wardrobe / History** (closet) → **Week Planner / Insights** (habit + gaps).
- Nav: demote **Guide** from primary destinations (footer / Profile / Settings only).
- No new AI modes, no backend/API changes.

---

## Screens and flows

| Screen / area | Web | iOS | Change |
|---------------|-----|-----|--------|
| Suggest promise | `mainFlowUxCopy.ts`, creation/empty preview or coach-adjacent header | `MainFlowUxCopy.swift`, `MainFlowView` | Add product promise copy |
| Wardrobe empty | `Wardrobe.tsx` | `WardrobeListView.swift` | Job sentence + primary CTA |
| Insights empty | `insightsCopy.ts` + insights page empty UI | `InsightsCopy.swift` + `InsightsView` | Point to wardrobe |
| History empty | `OutfitHistory` (or equivalent) | `HistoryListView.swift` | Point to Suggest |
| Week Planner tip / settings align | `PlannerSettings.tsx`, `WeekPlanner.tsx` / copy | `WeekPlannerView`, `WeekPlanModels` copy | Align Season/Reminder; ring tip if missing |
| Primary nav | `NavBar.tsx` | Tabs already OK; Profile/Settings Guide | Remove Guide from web primary nav |
| About | `About.tsx` | `AboutView.swift` + `AboutCopy` | Story-first rewrite |
| Guide | `UserGuide.tsx` | `UserGuideView.swift` | Nav/story wording only |

### Flow

1. User lands on Suggest → sees men’s stylist promise + empty preview.
2. Empty Wardrobe → Add first item CTA.
3. Empty Insights → build wardrobe messaging + Open wardrobe.
4. Empty History → Generate on Suggest.
5. Week Planner → Season/Reminder top-aligned; secondary tip when useful.
6. Guide reachable from footer (web) / Profile Settings (iOS), not primary nav.

---

## Shared copy (exact — both platforms)

### Suggest (add to MainFlowUxCopy)

| Key | Value |
|-----|--------|
| `productPromiseHeadline` | `Your personal AI men's stylist` |
| `productPromiseSubline` | `Upload a piece, get a complete look — then build your wardrobe and plan your week.` |

Keep existing `emptyPreviewHeadline` / `emptyPreviewSubline`. Show promise above or with empty preview / creation header (visible in creation state; hide or de-emphasize on result if cluttered).

### Wardrobe empty

| Element | Copy |
|---------|------|
| Title | `Your wardrobe is empty` |
| Body | `Add pieces so Suggest, Insights, and Week Planner can style from what you own.` |
| Primary CTA | `Add your first item` |

### Insights empty (no analysis result)

| Element | Copy |
|---------|------|
| Message | `Build your wardrobe, then run a check to see gaps and what to buy next.` |
| Secondary CTA (if not already) | `Open wardrobe` |

Update `INSIGHTS_COPY.EMPTY_STATE` / `InsightsCopy.emptyStateMessage` to the Message above.

### History empty

| Element | Copy |
|---------|------|
| Title (web if present) | `No saved looks yet` |
| Body | `Generate an outfit on Suggest, then tap Save Look.` |

### Week Planner

- Settings row: **Season** and **Reminder** labels/inputs top-aligned (`items-start` / SwiftUI equivalent). Timezone under Reminder only.
- Optional compact tip (only if no generated outfits yet): `Generate outfits for your week. Add wardrobe items first for closer matches.`

---

## Visual / UX

- Theme unchanged (dark slate, blue–purple gradient).
- One primary CTA per empty state.
- iPhone / iPad: same UX; layout-only width/spacing differences.

---

## API and contract

- [x] **No** — UI-only

---

## User-facing docs (About & Guide)

- [x] **Yes**

### About (both platforms)

Rewrite hero/intro to:

1. **Headline:** AI Outfit Suggestor / ClosIQ product name as today  
2. **Tagline:** Your personal AI men's stylist  
3. **Three rings (short):** Suggest a look from a photo → build your wardrobe → plan your week and close gaps with Insights  
4. Keep a **short** feature list (bullets), not encyclopedia paragraphs. Collapse or trim long shopping/tech essays; keep admin note for admins only.

### Guide (both platforms)

- Update any text that lists Guide as a primary nav peer next to Suggest/Wardrobe.
- State Guide is under **More options / footer** (web) or **Profile → Guide** (iOS).
- Mention the three-ring journey in 1–2 sentences in the intro.

---

## Platform-specific notes

### Web

- Remove `{ view: 'guide', label: 'Guide' }` from `NavBar` `mainLinks`.
- Keep Footer “User guide” → `/guide`.
- Optionally add Guide link in Settings if missing (parity with iOS Profile).

### iOS

- Do **not** add Guide as a tab.
- Keep Guide in Profile/Settings.
- Align Week Planner Season/Reminder vertically like web.

---

## Tests (required)

### Backend

- N/A

### Web (web agent) — targeted only

- [ ] Nav: Guide not in primary nav; footer or settings still reaches Guide
- [ ] Main flow copy: `productPromiseHeadline` / subline present in creation UI
- [ ] Wardrobe empty: new body + “Add your first item”
- [ ] Insights empty: new `EMPTY_STATE` string
- [ ] History empty: new body copy
- [ ] PlannerSettings uses top alignment (`items-start`)
- Update existing tests that assert old copy

Run only touched test files, e.g.:

```bash
cd frontend && npm test -- --watchAll=false --testPathPattern="NavBar|mainFlowUxCopy|Wardrobe.test|OutfitHistory.test|insightsCopy|WardrobeInsights|WeekPlanner|GuideAndFooter|About" 
```

### iOS (iOS agent) — targeted only

- [ ] MainFlowUxCopy / contract tests for product promise
- [ ] Wardrobe empty copy + Add CTA
- [ ] InsightsCopy empty message
- [ ] History empty copy
- [ ] About/Guide copy tests if present
- [ ] Week planner settings alignment / tip if testable

Run only new/updated test classes via `xcodebuild test -only-testing:…`

### End gate

User will run full suites themselves. Orchestrator: **do not** run full web/iOS suites. Run `estimate-workflow-cost.py end` and report targeted results only.

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] About & Guide updated on both platforms
- [x] Same copy for promise + empty states
- [x] Guide demoted from primary nav (web); iOS tabs unchanged
- [x] `IOS_WEB_FEATURE_PARITY.md` note if IA/copy story changed (short)
- [x] New-behavior tests added (web + iOS)
- [x] Full suites: deferred to user

---

## Out of scope

- Full test suites; backend; new features; design-system rewrite; changing shopping gender env; merging to main.
