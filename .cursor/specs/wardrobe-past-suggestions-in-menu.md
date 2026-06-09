# Feature Spec: Past Suggestions in wardrobe overflow menu

**Branch:** `main`  
**Slug:** `wardrobe-past-suggestions-in-menu`  
**Status:** done

## Parity checklist

- [x] Past Suggestions only in overflow menu (both platforms)
- [x] Same menu order and copy
- [x] Standalone Past Suggestions button removed
- [x] Web menu fully visible (downward)
- [x] `IOS_WEB_FEATURE_PARITY.md` updated

---

## User story

As a wardrobe user, I want **Past Suggestions** inside the ⋮ overflow menu so secondary actions stay grouped and the card stays compact.

---

## Problem

Past Suggestions is currently a standalone full-width button below **Style this item**. User wants it in the overflow menu. The web menu also opens upward and clips at the card top — removing the standalone button allows opening the menu **downward** with full visibility.

---

## Screens and flows

| Screen / area | Web | iOS |
|---------------|-----|-----|
| Wardrobe card | `Wardrobe.tsx` | `WardrobeListView.swift` (`WardrobeCardView`) |

### Flow

1. Card shows **Style this item** + ⋮ only (no standalone Past Suggestions row).
2. ⋮ menu items in order: **View image** → **Edit** → **Past Suggestions** → **Delete**.
3. **Past Suggestions** opens existing per-item history modal/sheet (`handleOpenHistorySuggestions` / `openHistorySuggestions`). Same empty state and load behavior.
4. **Past Suggestions** enabled even when item has no image.

---

## Visual / UX

```
[ ✨ Style this item          ]  [ ⋮ ]
```

Menu (opens **downward** on web):
- View image
- Edit
- Past Suggestions
- Delete (destructive/red)

- **Web:** menu `top-full mt-1 z-50`; card `overflow-visible`; `data-testid="wardrobe-menu-past-suggestions-{id}"`; `aria-label="Past Suggestions"`.
- **iOS:** menu item uses copy **Past Suggestions** (not "History"); identifier `wardrobe.menu.history.{id}`; remove standalone `WardrobeTopActionButton` for past suggestions.
- Update `WardrobeCardUx.menuActionsOrder` to include `.history` between edit and delete.
- Update `WardrobeCardMenuAction.history.title` → **Past Suggestions**.

---

## API and contract

- [x] No backend changes

---

## Tests (required)

### Web

- [ ] `Wardrobe.test.tsx` — menu lists Past Suggestions; no standalone button; Past Suggestions via menu opens modal
- [ ] `Wardrobe.integration.test.tsx` — update if needed
- [ ] Menu opens downward (`top-full`, not `bottom-full`)

### iOS

- [ ] `WardrobeCardUxTests.swift` — menuActionsOrder includes history; history title is Past Suggestions; no standalone pastSuggestions button identifier required on card
- [ ] Update `OutfitAppE2ETests` if it taps standalone past suggestions button — use menu instead

---

## Parity checklist

- [ ] Past Suggestions only in overflow menu (both platforms)
- [ ] Same menu order and copy
- [ ] Standalone Past Suggestions button removed
- [ ] Web menu fully visible (downward)
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated

---

## Out of scope

- Backend changes
- User Guide / About copy
