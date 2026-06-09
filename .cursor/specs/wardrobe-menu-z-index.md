# Feature Spec: Wardrobe overflow menu not hidden behind next card

**Branch:** `main`  
**Slug:** `wardrobe-menu-z-index`  
**Status:** done

---

## User story

As a wardrobe user, when I open the ⋮ menu on a card, I want all menu items fully visible above the cards below.

---

## Problem

On web, the overflow menu uses `position: absolute` with `z-50` inside a card. Sibling cards below paint on top (later DOM order), so the dropdown is clipped/hidden behind the next card. Screenshot: only "View image" peeking out.

---

## Fix

### Web (required)

When `openMenuItemId === item.id`, elevate the **entire card** above siblings:

- Add `relative z-50` (or `z-[60]`) to the wardrobe item card wrapper while its menu is open.
- Keep menu `absolute top-full z-50` (or menu can use portal as alternative — prefer card elevation for minimal diff).
- Optional hardening: render menu via `createPortal` to `document.body` with `position: fixed` from trigger `getBoundingClientRect()` — only if card z-index insufficient.

### iOS (verify)

Native SwiftUI `Menu` popover should already present above list. Verify no regression; add test comment if already OK.

---

## Tests (required)

### Web

- `Wardrobe.test.tsx`: when menu open, card wrapper has elevated z-index class (`relative z-50` or equivalent)
- Existing menu item visibility tests still pass

### iOS

- `WardrobeCardUxTests.swift`: document native menu not affected (or no change if N/A)

---

## Parity

- Web menu fully visible over adjacent cards
- iOS unchanged (native popover)

---

## Out of scope

- Backend changes
- Menu item copy/order changes
