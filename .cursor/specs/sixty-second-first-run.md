# Feature Spec: 60-Second First Run (Phase A)

**Branch:** `feature/ui-ux-final-touches`  
**Slug:** `sixty-second-first-run`  
**Status:** Phase A done — pending full test gate  
**Phase:** A — coach strip, empty preview copy, collapsed preferences on first run

---

## User story

As a **first-time guest**, I want to quickly understand what to do, upload a clothing photo, and know where my outfit will appear — without signing up — so I can start the core flow within about a minute.

Phase A improves **clarity before and during** the first generate. Phase B (loading ETA, post-result CTA hierarchy) is out of scope here.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| First-run coach strip | `frontend/src/views/components/Sidebar.tsx` (new component ok) | `ios-client/OutfitSuggestor/Views/MainFlowView.swift` (extract subview ok) | 3 steps |
| Empty preview copy | `frontend/src/views/components/OutfitPreview.tsx` | `OutfitSuggestionView.swift` or result placeholder in `MainFlowView` | Before first result |
| Collapsed preferences | `frontend/src/views/components/AnalysisPreferences.tsx` + `Sidebar.tsx` | `MainFlowView.swift` + preferences section | First run only |
| Persistence keys | `localStorage` | `@AppStorage` | See Platform notes |

### Flow (Phase A — guest happy path)

1. Land on **Suggest** (default).
2. See **3-step coach strip** above upload: Upload → Generate → Explore.
3. Tap **Upload Item** → photo appears; step 1 marked complete.
4. **Preferences collapsed** on first run with expand affordance.
5. Tap **Generate Outfit** when ready (unchanged behavior).
6. Empty preview panel shows directional copy until result loads.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| First visit, no image | Coach step 1 active; Generate disabled | Coach: **Upload** — “Add any clothing photo”; preview: **“Your outfit appears here”** / **“Upload a photo, then tap Generate Outfit”** |
| Image uploaded, no result | Step 1 ✓, step 2 active | Coach **Generate** — “AI builds a full outfit”; helper: “Ready — tap Generate Outfit” (optional, near button) |
| Loading | Unchanged (Phase B) | — |
| Result shown | Step 3 active; dismiss coach persistence | Coach **Explore** — “Try another look or save”; set `first_run_coach_dismissed` |
| Returning user | No coach; full preferences | `first_run_coach_dismissed === true` |

---

## Visual / UX

### 1. First-run coach strip (new)

Three steps in a row on regular width; stacked or wrapped on compact.

| Step | Title | Subtitle |
|------|-------|----------|
| 1 | Upload | Add any clothing photo |
| 2 | Generate | AI builds a full outfit |
| 3 | Explore | Try another look or save |

- Visual: numbered pills or cards; completed steps show checkmark; active step highlighted with brand gradient border.
- Optional dismiss (✕) sets `first_run_coach_dismissed` without requiring an outfit.
- Hide entirely when `first_run_coach_dismissed` is true.

**Storage key:** `first_run_coach_dismissed` — web: `localStorage`; iOS: `@AppStorage("first_run_coach_dismissed")`.

Auto-dismiss (set to true) when user receives **first successful outfit suggestion** (same moment as existing first-outfit banner logic is fine).

### 2. Collapse preferences on first run

- When `first_run_coach_dismissed` is false and user has not expanded:
  - Show one collapsed row: **“Occasion, season, style (optional)”** with chevron **Expand**.
  - Defaults unchanged: Casual / All Seasons / Modern.
- Tap Expand → show full `AnalysisPreferences` (web) / existing preferences UI (iOS).
- After first outfit OR `first_run_coach_dismissed`, always show full preferences (current behavior).

**Storage key (optional):** `first_run_prefs_expanded` — only if needed to remember manual expand before first outfit.

### 3. Stronger empty preview

When `!suggestion && !loading`:

- **Headline:** “Your outfit appears here”
- **Subline:** Web two-column: “Upload a photo on the left, then tap Generate Outfit”. iOS stacked: “Upload a photo above, then tap Generate Outfit”.

Keep existing emoji/visual flatlay; add visible text (not sr-only only).

### iPhone / iPad (iOS)

- Same UX on iPhone and iPad: identical flows, copy, and actions.
- Layout-only: coach strip may use horizontal row on regular width, vertical/wrapped on compact.

---

## API and contract

### Backend changes needed?

- [x] No — UI-only

---

## Platform-specific notes

### Web only

- Coach component: `frontend/src/views/components/FirstRunCoach.tsx` (recommended)
- Wire into `Sidebar.tsx` above upload cards
- `OutfitPreview.tsx` empty state copy update

### iOS only

- Coach subview in or near `MainFlowView.swift` creation section
- Match copy exactly
- Accessibility identifiers: `main.firstRunCoach`, `main.firstRunCoach.step1`, etc.

---

## Tests (required)

### Web (web agent)

- [ ] Unit: `frontend/src/views/components/FirstRunCoach.test.tsx`
- [ ] Unit or integration: collapsed preferences on first run
- [ ] Update `OutfitPreview.test.tsx` for new empty-state copy
- [ ] Cases:
  - Guest sees coach when `localStorage` has no dismiss key
  - Coach hidden when `first_run_coach_dismissed` is `true`
  - Step 1 marked complete after image set (via Sidebar test or integration)
  - Preferences collapsed by default; expand reveals occasion/season controls
  - Empty preview shows headline + subline text

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/FirstRunCoachTests.swift` (step state helper if extracted)
- [ ] Cases:
  - Coach visibility tied to `@AppStorage first_run_coach_dismissed`
  - Copy matches web spec
  - Build passes

### End of Twin UI — orchestrator gate

Full suites after user confirms.

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] Same copy and error messages
- [x] Equivalent coach + empty preview + collapsed prefs
- [x] iPhone/iPad layout-only differences
- [x] New-behavior tests added (web + iOS)
- [ ] Full web suite pass — orchestrator end gate
- [ ] Full iOS suite pass — orchestrator end gate

---

## Out of scope (Phase B+)

- Loading ETA copy (“Usually 30–60 seconds”)
- Post-result CTA hierarchy / demote formal-casual on first result
- Demo outfit while waiting
- Backend changes
- Wardrobe upload flow
