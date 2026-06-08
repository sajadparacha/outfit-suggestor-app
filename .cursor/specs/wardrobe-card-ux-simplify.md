# Feature Spec: Wardrobe Card UX Simplify

**Branch:** `feature/multiagent-ui-ux-enhancements`  
**Slug:** `wardrobe-card-ux-simplify`  
**Status:** in-progress

---

## User story

As a wardrobe user, I want each item card to highlight one clear AI styling action with secondary actions tucked in a menu, so that cards feel clean and I immediately know how to get an outfit suggestion from any piece.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe item list | `frontend/src/views/components/Wardrobe.tsx` | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` (`WardrobeCardView`) | Card action layout only |
| Flow tip (wardrobe) | Same file, dismissible tip | Same file, `wardrobeFlowTip` | Update step 2 copy |

### Flow

1. User opens Wardrobe and sees item cards with category, color, description, and thumbnail (display only — not an action target).
2. Each card shows one **hero primary button**: **Style this item** (brand gradient, full width on mobile; prominent on card).
3. Each card shows a **secondary overflow menu** (⋮ / “More” / `ellipsis.circle`) with:
   - **View image** — opens full-screen image viewer (disabled or shows alert if no image)
   - **Edit** — opens edit modal/form (existing behavior)
   - **History** — opens past outfit history for this item (existing modal/sheet; show empty state if none)
   - **Delete** — triggers existing delete + undo toast flow
4. Tapping **Style this item** runs the existing “prepare item on Suggest / navigate to main” flow (`handleGetAISuggestion` / `onGetSuggestionFromItem`). No API changes.
5. Category filters, search, pagination, duplicate detection, add-item flow remain unchanged.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading (primary) | Spinner on hero button | `Opening in Suggest…` (web) / `Loading…` or spinner on button (iOS) |
| No image | Hero disabled or shows existing error | `This item doesn't have an image. Please add an image first.` |
| History empty | History menu item still available; modal shows empty message | `No history suggestions found for this wardrobe item yet.` |
| Delete | Same undo toast | `Item deleted.` / `Undo` |

---

## Visual / UX

### Card layout (both platforms)

```
[ thumbnail ]  Category
               Color / description
               
[ ✨ Style this item          ]  [ ⋮ ]
     (hero, full-width)         (menu)
```

- **Remove from card surface:** standalone Past Suggestions button, inline Edit/Delete icon buttons, clickable thumbnail (View image moves to menu only).
- **Primary button:** label **Style this item**; sparkle/AI visual; `btn-brand` / `AppTheme.accent`; min touch target 48px; `aria-label="Style this item with AI"` on web.
- **Overflow menu:** four items in order: View image → Edit → History → Delete. Delete uses destructive styling (red) where platform supports it.
- **History:** Always present in menu (not conditional on card). If no linked history, opening still works and shows empty state (do not hide menu item).
- **Accessibility:** Menu trigger `aria-label="More actions"` (web); iOS `accessibilityIdentifier` like `wardrobe.itemMenu.{id}`; menu items with stable identifiers for tests.

### Copy alignment

| Old copy | New copy |
|----------|----------|
| Build outfit from this item | Style this item |
| Build outfit (iOS) | Style this item |
| Past Suggestions (card button) | History (in menu) |
| Flow tip step 2: “Build outfit…” | “Tap **Style this item**” |

Update wardrobe flow tip and any in-card helper text on both platforms. User Guide / About references are **out of scope** unless a test breaks.

---

## API and contract

### Backend changes needed?

- [x] No — UI-only

### Endpoints

No changes.

### Client contract files to update

None.

---

## Platform-specific notes

### Web only

- Use a dropdown/popover menu for overflow (native `<details>`, headless menu, or positioned div — match existing patterns in codebase).
- Hero button row: flex with primary flex-1 + menu trigger fixed width at trailing edge.
- Update `Wardrobe.test.tsx` selectors from `Past Suggestions` / `Delete item` icon to menu paths where needed.

### iOS only

- Use SwiftUI `Menu` with `Label` items and `Image(systemName: "ellipsis.circle")` (or equivalent).
- Refactor `WardrobeCardView` to remove `WardrobeTopActionButton` for Past Suggestions and inline Edit/Delete HStack.
- Update `OutfitAppE2ETests` if it taps `Build outfit` — use `Style this item` accessibility label/identifier.
- `showPastSuggestions` prop on `WardrobeCardView` can be removed if History is always in menu.

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- N/A — UI-only

### Web (web agent)

- [ ] Unit: `frontend/src/views/components/Wardrobe.test.tsx`
- [ ] Integration: extend `frontend/src/views/components/Wardrobe.integration.test.tsx` if needed
- [ ] Cases:
  - Card with image shows hero button **Style this item** (role/label)
  - Overflow menu opens and lists View image, Edit, History, Delete
  - **Style this item** still navigates/prepares suggest flow (mock outfitController)
  - **History** via menu opens history modal (update existing history test — no standalone Past Suggestions button on card)
  - **Delete** via menu triggers undo toast (update existing delete test)
  - Card does **not** show standalone Past Suggestions or inline Edit/Delete icon buttons

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/WardrobeCardUxTests.swift` (new — test menu/copy helpers or extract small testable pieces if View is hard to unit test)
- [ ] UITest: update `OutfitAppE2ETests` wardrobe flow if it references old button copy
- [ ] Cases:
  - Primary button accessibility identifier/label uses **Style this item**
  - Menu contains History, Edit, Delete, View image
  - Build succeeds; new unit tests pass

### Per-feature tests (agents add during implementation)

| Layer | Command |
|-------|---------|
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build` + run new test class |

### End of Twin UI — full suites + report (orchestrator always)

| Layer | Command |
|-------|---------|
| Web (always) | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS (always) | `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests -only-testing:OutfitSuggestorUITests` |

---

## Parity checklist

- [ ] Same user-visible behavior on web and iOS
- [ ] Same copy: **Style this item** hero; menu items View image, Edit, History, Delete
- [ ] History always reachable from menu (not hidden when empty)
- [ ] Category filter, search, pagination unchanged
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated (wardrobe card UX note)
- [ ] New-behavior tests added (web + iOS)
- [ ] Full web suite pass — orchestrator end gate
- [ ] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- User Guide, About page, or other docs unless required by failing tests
- Backend / API changes
- Add-item flow, duplicate detection, insights, category chips
- Changing main Suggest screen “Get AI outfit suggestion” button (different screen)
