# Feature Spec: Preference Option Values

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `preference-option-values`  
**Status:** in-progress

---

## User story

As a user choosing outfit preferences, I want Occasion, Season, and Style lists to use clearer outfit-planning values so that the filters match common styling scenarios.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Suggest preferences | `frontend/src/components/Sidebar.tsx` | `ios-client/OutfitSuggestor/Models/OutfitModels.swift` and the views that render `Occasion`, `Season`, `Style` | Replace the visible dropdown/picker values on both platforms. |

### Flow

1. User opens Suggest preferences.
2. User picks Occasion, Season, and Style values.
3. Generated suggestions receive the matching API value for each selected label.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading | Unchanged | Unchanged |
| Empty | Default selections are shown | Occasion: Everyday; Season: All Season; Style: Classic |
| Error | Unchanged | Unchanged |
| Success | Selected values appear in input summaries and submitted request data | Use the labels and values listed below |

---

## Visual / UX

- Keep existing layout, styling, field order, and interaction behavior.
- Replace only the option lists and related defaults.
- Remove misspelled or old values that are not in this spec, including `Businees Casual`, `Business`, `Modern`, `Minimalist`, `Bold`, and Occasion `Casual`.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, and actions.
- **Layout-only** adjustments on regular horizontal size class are allowed.
- **No** iPad-specific navigation, screens, or feature differences.

---

## API and contract

### Backend changes needed?

- [x] No — UI/client constants only
- [ ] Yes — describe endpoints, request/response shapes

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/suggest-outfit` | Existing request should receive the selected `occasion`, `season`, and `style` values. |

### Client contract files to update

**Web**

- [ ] `frontend/src/models/...`
- [ ] `frontend/src/services/ApiService.ts`
- [ ] `frontend/src/controllers/...`
- [x] `frontend/src/components/Sidebar.tsx`

**iOS**

- [x] `ios-client/OutfitSuggestor/Models/OutfitModels.swift`
- [ ] `ios-client/OutfitSuggestor/Services/...`
- [ ] `ios-client/OutfitSuggestor/ViewModels/...`
- [ ] `ios-client/OutfitSuggestor/Utils/...`

### Shared constants / enums

| List | Default label | Values: label -> API value |
|------|---------------|----------------------------|
| Occasion | Everyday | Everyday -> `everyday`; Work -> `work`; Date Night -> `date-night`; Dinner / Night Out -> `dinner-night-out`; Party -> `party`; Wedding Guest -> `wedding-guest`; Formal Event -> `formal-event`; Travel -> `travel`; Workout -> `workout`; Errands -> `errands`; Lounge -> `lounge`; Outdoor -> `outdoor` |
| Season | All Season | Spring -> `spring`; Summer -> `summer`; Fall -> `fall`; Winter -> `winter`; Transitional -> `transitional`; All Season -> `all-season` |
| Style | Classic | Classic -> `classic`; Minimal -> `minimal`; Smart Casual -> `smart-casual`; Streetwear -> `streetwear`; Sporty -> `sporty`; Preppy -> `preppy`; Boho -> `boho`; Edgy -> `edgy`; Romantic -> `romantic`; Trendy -> `trendy`; Vintage -> `vintage`; Elegant -> `elegant` |

---

## User-facing docs (About & Guide)

| Platform | Files |
|----------|--------|
| Web | `frontend/src/views/components/UserGuide.tsx`, `About.tsx` |
| iOS | `ios-client/OutfitSuggestor/Views/UserGuideView.swift`, `AboutView.swift` |

- [x] **No** — this changes option vocabulary in existing controls, not Guide/About flows or app capabilities
- [ ] **Yes** — describe what to update:
  - Guide: …
  - About: …

---

## Platform-specific notes

### Web only

- Keep `select` labels and accessibility labels unchanged.
- Ensure option `value` attributes match the API values in this spec.

### iOS only

- Keep picker labels and API mappings aligned with web.
- Update `OutfitFilters` defaults to the API values in this spec.

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- [x] Not applicable; no backend changes.

### Web (web agent)

- [x] Unit or integration: add/update tests covering `Sidebar` preference option lists.
- [x] Cases:
  - Occasion dropdown includes exactly the spec labels/API values in order and excludes old `Casual`/`Business` occasion values.
  - Season dropdown includes exactly Spring, Summer, Fall, Winter, Transitional, All Season with `all-season`.
  - Style dropdown includes exactly the spec labels/API values in order and excludes misspelled `Businees Casual`.
  - Default filter values are compatible with the new lists.

### iOS (iOS agent)

- [x] Unit/Integration: add/update `OutfitSuggestorTests` coverage for `Occasion`, `Season`, `Style`, and `OutfitFilters` defaults.
- [x] Cases:
  - Enum `allCases` labels and `apiValue` values exactly match the spec lists in order.
  - `OutfitFilters` defaults are `everyday`, `all-season`, and `classic`.
  - Old values removed from enums.
  - iPhone/iPad UX remains the same because values are shared through the same enums.

### Per-feature tests (agents add during implementation)

| Layer | Command |
|-------|---------|
| Backend | Not applicable |
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `cd ios-client && xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build`; run new `OutfitSuggestorTests` class |

### End of Twin UI — confirm, then full suites + report (orchestrator)

Orchestrator **asks user to confirm** before running these (full suites take several minutes):

| Layer | Command |
|-------|---------|
| Web (always) | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS (always) | `cd ios-client && xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests -only-testing:OutfitSuggestorUITests` |

After user confirms, publish filled report using `.cursor/specs/_test-report-template.md`.

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] About & Guide updated on both platforms (not required by spec)
- [x] Same copy and error messages
- [x] Equivalent loading / empty / error UI unchanged
- [x] API client methods match on both platforms
- [x] `IOS_WEB_FEATURE_PARITY.md` updated (if new capability)
- [x] New-behavior tests added (web + iOS)
- [ ] Full web suite pass (`npm test -- --watchAll=false`) — orchestrator end gate
- [ ] Full iOS suite pass (`xcodebuild test` OutfitSuggestorTests + UITests) — orchestrator end gate

---

## Out of scope

- Backend validation changes.
- New preference fields, layout changes, or Guide/About content changes.
