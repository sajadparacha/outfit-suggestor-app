# Feature Spec: Wardrobe Checkbox in Preferences; Remove Colors

**Branch:** `feature/main-page-ui-improvements`  
**Slug:** `preferences-wardrobe-checkbox-no-colors`  
**Status:** done

---

## User story

On Suggest, **Use my wardrobe only** should live in **Preferences** as the **last input** (after Notes). The **Colors** field should be removed from Preferences.

---

## Required behavior (both platforms)

### Preferences fields (Suggest main flow)

Order:
1. Occasion
2. Season
3. Style
4. Notes
5. **Use my wardrobe only** (checkbox) — **auth only**, last row

### Remove Colors

- Web `AnalysisPreferences` sidebar variant: remove static "Colors / No Preference" cell
- iOS `FiltersView` grid layout: remove Colors grid cell and colors sheet
- **Insights** uses same `FiltersView` / `AnalysisPreferences` — remove Colors there too for parity
- Do **not** remove `colorPreference` from models/API if still sent with defaults; UI only

### Wardrobe section

- Remove **Use my wardrobe only** from Wardrobe accordion/disclosure
- Keep **Add to Wardrobe** in Wardrobe section (web + iOS)
- Wardrobe section still visible when authenticated

### Auth

- Wardrobe-only checkbox only when logged in (unchanged)

### Grid layout

- Web: adjust grid from 5 → 4 columns (occasion, season, style, notes); wardrobe checkbox full-width below grid
- iOS: 2×2 grid for four fields; wardrobe checkbox below

---

## Tests (required)

### Web
- [x] `Sidebar.test.tsx` — wardrobe checkbox in Preferences (not Wardrobe section)
- [x] Assert Colors not in sidebar preferences
- [x] Updated tests that previously opened Wardrobe for checkbox

### iOS
- [x] `FiltersViewTests.swift` — no Colors cell; wardrobe checkbox contract
- [x] `main.wardrobeOnlyCheckbox` accessibility id preserved

---

## Parity

- Same field order
- Same checkbox copy + micro-help
- Colors removed from both platforms' preference UI
