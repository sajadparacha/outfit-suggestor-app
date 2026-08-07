# Feature Spec: Thumbnail enlarge viewer (Week Planner + Wardrobe)

**Branch:** `fix/weekly-planner-gui`  
**Slug:** `thumbnail-enlarge-viewer`  
**Status:** done  
**Mode:** Cost Twin UI (abbreviated)

---

## Goal

Thumbnails with images in **Week Planner day slots** and **Wardrobe list/cards** open the existing full-size image viewer on tap; empty/placeholder thumbs stay non-tappable. Enlarge must not fire Change/Add/Suggest/Edit/Select.

---

## Files (agents stay in these + their tests)

| Platform | Paths |
|----------|--------|
| Web | `frontend/src/views/components/weekPlan/OutfitItem.tsx`, `weekPlan/OutfitPreview.tsx` (if needed), `WeekPlanner.tsx` (wiring only if needed), `Wardrobe.tsx`; shared lightbox helper only if already nearby |
| iOS | `ios-client/OutfitSuggestor/Views/WeekPlannerView.swift`, `WardrobeListView.swift`; shared image viewer only if already nearby |

---

## UX (both platforms)

1. Tap thumbnail **with image** → full-size overlay/viewer (dimmed backdrop).
2. Dismiss: backdrop tap, Close/X, Escape (web) / swipe-dismiss or Close (iOS).
3. Empty / placeholder: **not** tappable (no viewer).
4. Enlarge does **not** trigger Change/Add, Suggest, Edit, or pick-mode Select — stop propagation / separate hit target.
5. **Reuse** existing viewers — do not invent a second modal:
   - Web: Wardrobe `viewingImage` lightbox (or shared equivalent used by History/OutfitItemCard).
   - iOS: Wardrobe `fullScreenCover` image viewer.
6. A11y: button/control with label like “View [slot/item] full size”; focusable; min 44pt hit target where thumb is the control.

### iPhone / iPad

Same UX; layout/spacing via `horizontalSizeClass` only.

---

## About / Guide

- [ ] **Skip** unless visible “tap to enlarge” copy is added.

## Parity doc

- [ ] Skip `IOS_WEB_FEATURE_PARITY.md` unless capability wording needs a one-liner.

## Backend

- [x] No — UI-only

---

## Tests (required — one file per platform max)

### Web (one test file)

- Week: tap slot thumb with image → viewer opens; dismiss → closed; placeholder not openable
- Wardrobe: tap list/card thumb with image → viewer opens; dismiss → closed
- Optional: enlarge does not fire Change/Select

### iOS (one test file)

- Week: tap slot thumb with image → viewer opens; dismiss → closed; placeholder not openable
- Wardrobe: tap list/card thumb with image → viewer opens; dismiss → closed
- Optional: enlarge does not fire Change/Select

---

## Done when

- [x] Both agents return with targeted tests passing
- [x] Spec behaviors match on web + iOS
- [x] Cost Twin UI: no full suites unless user asks
