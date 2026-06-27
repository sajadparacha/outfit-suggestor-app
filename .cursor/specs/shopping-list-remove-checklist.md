# Feature Spec: Remove Shopping List Checklist

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `shopping-list-remove-checklist`  
**Status:** done

---

## User story

As a user viewing the Wardrobe Insights shopping list, I want a clean table focused on **Buy**, **Look for**, and **Search online** without checkboxes, notes, or progress tracking.

---

## Scope

Remove market checklist UI and persistence. Keep all other shopping list features (collapse/expand, labels, look-for text, combo chips, Search all, Copy/WhatsApp/PDF export).

### Remove (both platforms)

- Checkbox per row in **Buy** column
- **Notes (optional)** text field per row
- **Progress: N / M bought** footer
- `shoppingListStorage` / `ShoppingListStorage` usage (delete files if unused)
- Checklist state in WhatsApp, Copy list, and PDF export text
- Copy strings for notes, progress (keep if used elsewhere; remove if dead)

### Keep

- Shopping list collapsed by default; expand via **Shopping list** button (web) / sheet (iOS)
- Buy column: clean label + priority badge only
- Look for, Search online chips, See all options
- Export actions

---

## Files

**Web:** `ShoppingListPanel.tsx`, `insightsHelpers.ts` (export text), remove `shoppingListStorage.ts` + test, update tests, UserGuide, About

**iOS:** `ShoppingListView.swift`, `WardrobeInsightShoppingList.swift`, remove `ShoppingListStorage.swift` + test from project, update tests, UserGuideView, AboutView, `InsightsCopy.swift`

---

## About & Guide

- [x] **Yes** — remove mentions of checklist, notes, progress from Guide and About on both platforms

---

## Tests (required)

### Web
- Remove/update checklist-related tests in `WardrobeInsightsComponents.test.tsx`, delete `shoppingListStorage.test.ts`
- Assert Buy column has no checkbox/notes; no progress footer
- Export text has no bought/notes lines

### iOS
- Remove/update `ShoppingListStorageTests`, checklist tests in `WardrobeInsightShoppingListTests`
- Update `WardrobeInsightsViewTests` if progress copy removed

---

## Out of scope

- Backend changes
- Other shopping list behavior changes
