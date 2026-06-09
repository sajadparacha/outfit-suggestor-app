# Feature Spec: Wardrobe Past Suggestions Button (visible)

**Branch:** `main`  
**Slug:** `wardrobe-past-suggestions-button`  
**Status:** done

---

## User story

As a wardrobe user, I want a clearly visible **Past Suggestions** button on each item card so I can quickly open outfit history for that piece without hunting inside the overflow menu.

---

## Problem

The wardrobe card UX simplify moved Past Suggestions into the ⋮ menu as **History**. Users report they cannot find it. The hero **Style this item** button and overflow menu remain; Past Suggestions must return as a visible secondary action on every card.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe item card | `frontend/src/views/components/Wardrobe.tsx` | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` (`WardrobeCardView`) | Add visible Past Suggestions button |
| History modal/sheet | Same (existing modal) | Same (`historySuggestionsSheet`) | Unchanged behavior |

### Flow

1. User opens Wardrobe and sees item cards with **Style this item** (primary), **Past Suggestions** (secondary, visible), and ⋮ overflow menu.
2. Tapping **Past Suggestions** opens the existing per-item history modal/sheet (`handleOpenHistorySuggestions` / `openHistorySuggestions`). Same API, empty state, and “use this” flow as today.
3. Overflow menu keeps **View image**, **Edit**, **Delete** only — remove **History** from menu (no duplicate entry).
4. Every card with an image shows the full action row (primary + Past Suggestions + menu). Cards without image: **Style this item** stays disabled; **Past Suggestions** remains enabled (history does not require image).

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| History loading | Spinner/disabled on Past Suggestions button | `Loading…` |
| History empty | Modal opens with empty message | `No history suggestions found for this wardrobe item yet.` |
| History with entries | Modal lists entries; tap loads suggestion | Existing copy |
| No item image | Style this item disabled; Past Suggestions enabled | Existing no-image message on primary only |

---

## Visual / UX

### Card layout (both platforms)

```
[ thumbnail ]  Category
               Color / description

[ ✨ Style this item          ]  [ ⋮ ]
[ 📚 Past Suggestions         ]
```

- **Past Suggestions**: full-width secondary button below the primary row (outline/glass style — not brand gradient). Min touch target 44–48px.
- **Web**: `aria-label="Past Suggestions"`; `data-testid="wardrobe-past-suggestions-{id}"`.
- **iOS**: use `WardrobeTopActionButton` with `isPrimary: false` or equivalent; accessibility identifier `wardrobe.pastSuggestions.{id}`; label **Past Suggestions**.
- **Menu**: View image → Edit → Delete (History removed).
- **List padding**: ensure bottom padding so the last card’s action row is not clipped when scrolling (fix if cards appear cut off).

### Copy alignment

| Location | Copy |
|----------|------|
| Card button | Past Suggestions |
| Menu | (no History item) |
| Modal title (web) | History Suggestions (unchanged) or Past Suggestions — prefer **Past Suggestions** if easy |
| Modal title (iOS) | Past Suggestions (already) |

Update `WardrobeCardUx.swift` menu enum/order to drop `.history` from visible menu (keep history action on card only).

---

## API and contract

### Backend changes needed?

- [x] No — UI-only

### Endpoints

No changes.

---

## Platform-specific notes

### Web only

- Add secondary button in action row section below primary+menu flex row.
- Remove History menuitem from overflow dropdown.
- Update `Wardrobe.test.tsx` and integration tests: assert Past Suggestions button visible; History not in menu; Past Suggestions opens modal.

### iOS only

- Add `WardrobeTopActionButton` (secondary) for Past Suggestions below primary row.
- Remove History from `Menu` in `WardrobeCardView`.
- Update `WardrobeCardUx.swift`: remove `.history` from `menuActionsOrder` or document that history is card-only.
- Update `WardrobeCardUxTests` / `OutfitAppE2ETests` if they tap menu History.

---

## Tests (required)

### Backend (orchestrator)

- N/A

### Web (web agent)

- [ ] Unit: `frontend/src/views/components/Wardrobe.test.tsx`
- [ ] Integration: `frontend/src/views/components/Wardrobe.integration.test.tsx` (if history flow covered there)
- [ ] Cases:
  - Each card shows **Past Suggestions** button (`aria-label` / role)
  - Overflow menu does **not** contain History
  - Overflow menu still has View image, Edit, Delete
  - Clicking **Past Suggestions** opens history modal (mock `ApiService.getOutfitHistory`)
  - **Style this item** behavior unchanged

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/WardrobeCardUxTests.swift`
- [ ] UITest: update `OutfitAppE2ETests` if menu-based history tap — use card button instead
- [ ] Cases:
  - `WardrobeCardUx.menuActionsOrder` excludes history (or menu enum updated)
  - Card accessibility identifier for Past Suggestions exists
  - Build succeeds; unit tests pass

### Per-feature tests (agents)

| Layer | Command |
|-------|---------|
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build` + run new/updated test classes |

---

## Parity checklist

- [x] Visible Past Suggestions on every wardrobe card (web + iOS)
- [x] History removed from overflow menu (both)
- [x] Same modal/sheet behavior when Past Suggestions tapped
- [x] `IOS_WEB_FEATURE_PARITY.md` updated (wardrobe card actions)
- [x] New-behavior tests added (web + iOS)

---

## Out of scope

- Backend / API changes
- User Guide / About copy updates
- Changing main Suggest screen flows
