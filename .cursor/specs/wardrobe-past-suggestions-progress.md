# Feature Spec: Past Suggestions progress bar

**Branch:** `feature/random-history-diverse-selection`  
**Slug:** `wardrobe-past-suggestions-progress`  
**Status:** done

---

## User story

As a user on the **Wardrobe** screen, when I tap **Past Suggestions** on an item’s overflow menu, I want the same staged progress panel as **Generate outfit** (bar, steps, elapsed time) — not only inline “Loading…” on the menu item.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe card overflow | `Wardrobe.tsx` menu | `WardrobeListView` / `WardrobeCard` menu | **Past Suggestions** |
| Load handler | `handleOpenHistorySuggestions` | `openHistorySuggestions(for:)` | `GET /api/outfit-history?limit=100`, filter by item |
| Result | History suggestions modal/sheet | `historySuggestionsSheet` | Same as today |

### Flow

1. User opens overflow → **Past Suggestions**.
2. Show staged progress panel immediately.
3. Fetch history, filter entries linked to wardrobe item (`source_wardrobe_item_id`, slot IDs, image match).
4. Open modal/sheet with matches (or empty-state message).
5. Dismiss progress panel when fetch completes or errors.

---

## States

| State | Copy |
|-------|------|
| Loading message | **Loading past suggestions for this item…** |
| Panel title | **Loading past suggestions** |
| Menu item | Keep **Past Suggestions** label; inline “Loading…” optional but panel is primary feedback |

### Staged steps (sync web + iOS)

| Step id | Label | durationMs |
|---------|-------|------------|
| fetch | Loading your saved looks | 2500 |
| filter | Finding outfits for this item | 2000 |
| prepare | Preparing suggestions | 2000 |

New operation type: **`past-suggestions`**

---

## Visual / UX

- Reuse `LoadingOverlay` (web) and `AiProgressPanelView` (iOS).
- Bottom panel; non-blocking (tabs/nav stay usable where applicable).
- Cancel optional — skip if no abort wired; do not block feature on cancel.

### iPhone / iPad

- Same UX; panel at bottom of wardrobe view.

---

## API

- [ ] No backend changes — `GET /api/outfit-history`

### Contract sync

| Web | iOS |
|-----|-----|
| `aiProgressSteps.ts` → `past-suggestions` | `AiProgressSteps.swift` → `.pastSuggestions` |
| `LoadingOverlay.tsx` title | `AiProgressSteps.title(for:)` |

---

## User-facing docs

- [ ] **No** — loading feedback only

---

## Tests (required)

### Web

- [ ] `aiProgressSteps.test.ts` — `past-suggestions` steps
- [ ] `LoadingOverlay.test.tsx` — title
- [ ] `Wardrobe.test.tsx` or integration — progress panel visible while `handleOpenHistorySuggestions` runs (mock delayed API)

### iOS

- [ ] `AiProgressStepsTests.swift` — `.pastSuggestions`
- [ ] `WardrobeCardUxTests` or new test — progress panel during `openHistorySuggestions` (mock delay)

---

## Parity checklist

- [ ] Same step labels and title on web and iOS
- [ ] Panel shows during Past Suggestions load
- [ ] Modal/sheet behavior unchanged after load

---

## Out of scope

- Changing history matching logic
- Progress for other wardrobe actions (Delete, Edit)
