# Feature Spec: History Delete Confirmation

**Branch:** `feature/multiagent-ui-ux-enhancements`  
**Slug:** `history-delete-confirmation`  
**Status:** done

---

## User story

As a user, I want deleting a history entry to use an in-app confirmation that matches the design system—not a native browser dialog or silent immediate delete.

---

## Screens and flows

| Screen / area | Web location | iOS location |
|---------------|--------------|--------------|
| History list | `frontend/src/views/components/OutfitHistory.tsx` | `ios-client/OutfitSuggestor/Views/HistoryListView.swift` |

### Flow

1. User taps trash on a history card.
2. In-app confirmation appears (no `window.confirm` on web).
3. **Cancel** → dismiss, no API call, entry remains.
4. **Delete** → call existing delete API, remove entry from list.

---

## States

| State | Copy |
|-------|------|
| Modal title | **Delete history entry?** |
| Modal message | **This outfit suggestion will be removed from your history.** |
| Confirm button | **Delete** (destructive styling on iOS) |
| Cancel button | **Cancel** |

---

## Visual / UX

### Web

- Use existing `ConfirmationModal` from `frontend/src/views/components/ConfirmationModal.tsx`.
- Remove all `window.confirm` usage from `OutfitHistory.tsx`.
- Optional: use 🗑️ or ⚠️ icon context in title; keep slate/glass modal styling.
- Track `pendingDeleteEntryId` (or entry object) in component state.

### iOS

- Use SwiftUI `.confirmationDialog` on `HistoryListView` (pattern from `MainFlowView.swift`).
- No immediate delete on trash tap—show dialog first.
- Match copy above; destructive role on Delete action.
- `accessibilityIdentifier`s: `history.deleteConfirmDialog`, `history.deleteConfirmButton`, `history.deleteCancelButton` if feasible.

---

## API and contract

- [x] No backend changes — existing `DELETE` outfit history endpoint unchanged.

---

## Tests

### Web

- Update `frontend/src/views/components/OutfitHistory.test.tsx`:
  - Remove `window.confirm` mocks.
  - Assert modal opens on delete tap.
  - Assert `onDelete` called only after Confirm.
  - Assert `onDelete` not called on Cancel.

### iOS

- Update tests only if existing history UI tests cover delete; otherwise skip.

---

## Parity checklist

- [x] Both platforms confirm before delete
- [x] Same title/message/copy
- [x] No `window.confirm` on web
- [x] No silent immediate delete on iOS
