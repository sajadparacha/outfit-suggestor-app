# Feature Spec: Wardrobe Delete with Undo

**Branch:** `feature/multiagent-ui-ux-enhancements`  
**Slug:** `wardrobe-delete-undo`  
**Status:** done

---

## User story

As a user, I want wardrobe deletes to be reversible for a few seconds so I don't lose items I uploaded and edited by accident.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe list | `frontend/src/views/components/Wardrobe.tsx` | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` | Delete button on each row |

### Flow

1. User taps delete (trash) on a wardrobe item.
2. Item disappears from the list immediately (optimistic hide).
3. Toast appears: **"Item deleted."** with **Undo** action.
4. If user taps **Undo** within 5 seconds: item reappears; no API call.
5. If undo window expires (or user deletes another item): pending delete commits via `DELETE /api/wardrobe/{id}`.
6. If API delete fails: show error; reload list to restore truth.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Pending delete | Row hidden; undo toast visible | "Item deleted." + "Undo" |
| Undo | Row restored; toast dismissed | — |
| Committed | API delete; list refresh | — |
| Error | Toast/alert with error | Use existing error patterns |

---

## Visual / UX

- No confirmation modal (`window.confirm` removed on web).
- Undo toast: bottom of wardrobe area, dark glass / brand styling, 5-second window.
- Only one pending delete at a time; starting a new delete commits the previous one immediately.

---

## API and contract

### Backend changes needed?

- [x] No — UI-only (existing `DELETE /api/wardrobe/{item_id}`)

### Client contract files to update

None.

---

## Platform-specific notes

### Web only

- Local undo toast in `Wardrobe.tsx` (no global toast controller change required).
- `UI_CONFIG.undoDeleteDurationMs` for timer length.

### iOS only

- Bottom overlay toast in `WardrobeListView`, matching category info toast patterns.
- `accessibilityIdentifier`: `wardrobe.deleteUndoToast`, `wardrobe.deleteUndoButton`

---

## Parity checklist

- [x] Same undo flow on web and iOS
- [x] Same copy: "Item deleted." / "Undo"
- [x] 5-second undo window
- [x] No confirmation dialog before delete
- [x] Optimistic hide + delayed API commit
