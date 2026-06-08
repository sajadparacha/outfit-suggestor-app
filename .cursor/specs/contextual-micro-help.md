# Feature Spec: Contextual Micro-Help (Guide & About Review)

**Branch:** `feature/multiagent-ui-ux-enhancements`  
**Slug:** `contextual-micro-help`  
**Status:** done (pending full-suite verification)

---

## User story

As a user, I want short in-context explanations next to key toggles and features so that I understand what they do without reading the full Guide first.

---

## Problem

The in-app Guide and About pages are useful but too long for most users. Important features (wardrobe-only mode, model preview, Insights) need **micro-help** inline where the user acts.

---

## Principle

- **Keep** User Guide and About unchanged in structure (no removal or major rewrite).
- **Add** one-line contextual help at the point of use.
- Copy should feel friendly and outcome-focused, not technical.

---

## Micro-help copy (both platforms — must match)

Create shared copy modules:

- Web: `frontend/src/utils/microHelpCopy.ts`
- iOS: `ios-client/OutfitSuggestor/Utils/MicroHelpCopy.swift`

| Context | Micro-help text |
|---------|-----------------|
| Wardrobe-only toggle | **Only recommend items from your saved wardrobe.** |
| Model preview toggle | **Creates a visual preview of the suggested outfit.** |
| Insights (page header / entry) | **Find missing items that would unlock more outfit combinations.** |

---

## Screens and flows

| Screen / area | Web location | iOS location | Change |
|---------------|--------------|--------------|--------|
| Wardrobe-only toggle | `Sidebar.tsx` → `ModernSwitch` description | `MainFlowView.swift` → `moreOptionsSection` toggle | Static micro-help under label |
| Model preview toggle | `Sidebar.tsx` → `ModernSwitch` description | `MainFlowView.swift` → model preview toggle | Replace "This may take longer." with micro-help |
| Insights page header | `App.tsx` Insights route subtitle | `InsightsView.swift` header subtitle | Use Insights micro-help |
| Insights sidebar shortcut | `Sidebar.tsx` insights link | `SettingsView.swift` Insights row | Show micro-help as secondary line (web: under link; iOS: caption under label) |

### Wardrobe-only toggle — behavior change

**Replace** dynamic on/off descriptions:
- ~~"Only your wardrobe items are used." / "AI may suggest items you do not own."~~

**With** static micro-help always visible (same text on or off). State remains visible via toggle position / `aria-checked` only.

### Model preview toggle

Replace `"This may take longer."` with model-preview micro-help. Optional: no secondary timing note unless needed for accessibility — user copy is sufficient.

### Insights entry points

| Location | Before (examples) | After |
|----------|-------------------|-------|
| Web Insights `<h2>` subtitle | "Understand wardrobe gaps by category…" | Insights micro-help |
| Web sidebar link | "Need closet insights? Open Insights →" | Keep link CTA short: **"Open Insights →"** with micro-help as caption below |
| iOS Insights header | "Get a ranked shopping list…" | Insights micro-help |
| iOS Settings → Insights | Label only | Label **Insights** + caption with micro-help |

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Toggle off | Show micro-help under label | Static strings from table |
| Toggle on | Same micro-help (no alternate description) | Static strings from table |
| Guest (no wardrobe toggle) | N/A | Unchanged |

---

## Visual / UX

- Use existing `ModernSwitch` `description` prop on web (text-xs slate-400).
- iOS: `.caption` / `AppTheme.textSecondary` under toggle labels (match model preview pattern).
- Do not add new modals, tooltips, or info icons — inline caption only.
- No layout redesign.

---

## API and contract

### Backend changes needed?

- [x] No — UI-only copy

---

## Platform-specific notes

### Web only

- `ModernSwitch` already supports `description` — wire `microHelpCopy` constants
- Update `Sidebar.test.tsx` if tooltip/hint assertions reference old wardrobe-only strings
- Insights route in `App.tsx` (~line 737)

### iOS only

- Wardrobe toggle currently has no subtitle — add `VStack` label pattern like model preview toggle
- Register `MicroHelpCopy.swift` in `project.pbxproj` if new file
- Settings Insights row: use `Label` + caption or custom `NavigationLink` content

---

## Tests (required)

### Backend

- [x] N/A

### Web (web agent)

- [ ] Unit: `frontend/src/utils/microHelpCopy.test.ts`
- [ ] Update: `frontend/src/views/components/Sidebar.test.tsx` — wardrobe-only micro-help visible; insights link caption
- [ ] Optional integration: assert Insights page subtitle in a lightweight test
- [ ] Cases:
  - Wardrobe-only switch shows "Only recommend items from your saved wardrobe."
  - Model preview switch shows "Creates a visual preview of the suggested outfit."
  - Insights page header shows "Find missing items that would unlock more outfit combinations."
  - Dynamic wardrobe on/off descriptions are removed

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/MicroHelpCopyTests.swift`
- [ ] Cases:
  - `MicroHelpCopy` constants match spec
  - Build succeeds
  - Unit tests pass

### Per-feature tests

| Layer | Command |
|-------|---------|
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | build + `MicroHelpCopyTests` |

---

## Parity checklist

- [ ] Same micro-help strings on web and iOS
- [ ] Wardrobe-only, model preview, Insights all updated
- [ ] User Guide / About untouched (no structural changes)
- [ ] New-behavior tests added (web + iOS)
- [ ] `IOS_WEB_FEATURE_PARITY.md` note if needed

---

## Out of scope

- Rewriting User Guide or About content
- New tooltip/info-icon components
- Backend or API changes
- Adding micro-help to every control in the app (only the three contexts above)
