# Feature Spec: Insights lifestyle preferences

**Branch:** `feature/insights-lifestyle-preferences`  
**Slug:** `insights-lifestyle-preferences`  
**Status:** done  
**Workflow:** Cost Twin UI (narrow files, one test file per platform)

---

## Goal

Replace Insights **single-select** Occasion / Season / Style with a men’s-stylist **lifestyle model**. Suggest keep its existing single-select pickers. Extra notes stay for **constraints only**.

## User story

As a user running Wardrobe Insights, I want to say where my closet needs to work, how formal that life is, whether to audit year-round or a climate, and my main look plus an optional accent — so gap analysis matches a real wardrobe, not one dropdown combo.

---

## Insights form (web + iOS — identical behavior)

Do **not** reuse the Suggest occasion/season/style dropdowns on Insights.

| Control | UI | Values | Rules | Default |
|---------|----|--------|-------|---------|
| **Where this wardrobe needs to work** | Multi-select chips | `work` Work, `everyday` Everyday, `social` Social / Dinner, `formal` Formal, `sport` Sport / Outdoor | Max **3**. At least **1**. One is **Primary** (badge). Tap unselected to add (if under max). Tap selected non-primary → make primary. Tap primary → deselect only if another chip remains (that other becomes primary). | Primary `work` + `everyday` |
| **Dress code** | Single segmented control | `casual` Casual, `smart-casual` Smart casual, `business-professional` Business professional, `formal` Formal | Required, one value | `smart-casual` |
| **Season** | Year-round selected by default. Optional single climate chip | Core: year-round (no climate). Climate: `hot` Hot, `temperate` Temperate, `cold` Cold | Climate is optional; selecting a climate does not replace year-round core — it **also flags** seasonal gaps. Calendar seasons (Spring/Summer/Fall/Winter) are **not** shown on Insights | Year-round, no climate |
| **Style** | Primary picker + optional accent | Primary: `classic` Classic, `smart-casual` Smart Casual, `preppy` Preppy, `minimal` Minimal, `elegant` Elegant, `streetwear` Streetwear, `sporty` Sporty. Accent: none, `vintage` Vintage, `edgy` Edgy, `sporty` Sporty, `preppy` Preppy | Primary required. Accent optional. **Do not** offer Boho / Romantic / Trendy as Insights primary | Primary `classic`, accent none |
| **Audit for a specific event** | Collapsed optional picker | Same long occasion list as Suggest, plus none | Optional deep-dive; does not replace the mix | none |
| **Extra notes** | Textarea | free text | Constraints only | empty |

Copy:

- Preferences intro: `Tell us where this wardrobe needs to work, how formal that life is, and your main look.`
- Remove Insights “Shared with Suggest” line. Replace with: `Lifestyle mix is for Insights only. Extra notes are constraints (budget, fabrics, dress-code limits) — not extra occasions or styles.`
- Notes placeholder: `e.g. budget under $100, no wool, conservative office, no logos.`
- Notes helper: `Use notes for limits, not extra occasions or styles.`
- Analyze CTA unchanged: `Analyze My Wardrobe`
- Keep Quick Check / AI Stylist mode picker as today.

Context bar after results: show mix (primary first) · dress code · year-round or climate · primary style (+ accent if set). Change preferences still expands the form.

### iPhone / iPad

Same UX. Layout-only width/spacing via `horizontalSizeClass`.

### Suggest / Wardrobe preferences

Unchanged single-select Occasion / Season / Style. Do not add lifestyle chips there.

---

## File paths (agents — only these + their one test file)

**Web**

- `frontend/src/utils/constants.ts` (Insights option lists; do not remove Suggest `FILTER_OPTIONS`)
- `frontend/src/utils/insightsLifestyle.ts` (**new** — defaults, chip rules, request builder, display labels)
- `frontend/src/utils/insightsCopy.ts`
- `frontend/src/models/WardrobeModels.ts`
- `frontend/src/views/components/AnalysisPreferences.tsx` (`variant="insights"` only)
- `frontend/src/views/components/insights/AnalysisPreferencesCard.tsx`
- `frontend/src/App.tsx` (analyze payload only)
- `frontend/src/views/components/UserGuide.tsx`
- `frontend/src/views/components/About.tsx`
- **One test file:** `frontend/src/views/components/InsightsFlow.integration.test.tsx`

**iOS**

- `ios-client/OutfitSuggestor/Utils/InsightsLifestyle.swift` (**new** — same rules/defaults/request builder as web)
- `ios-client/OutfitSuggestor/Utils/InsightsCopy.swift`
- `ios-client/OutfitSuggestor/Models/WardrobeModels.swift` (`WardrobeGapAnalysisRequest`)
- `ios-client/OutfitSuggestor/Views/Insights/AnalysisPreferencesView.swift`
- `ios-client/OutfitSuggestor/Views/InsightsView.swift`
- `ios-client/OutfitSuggestor/Views/UserGuideView.swift`
- `ios-client/OutfitSuggestor/Views/AboutView.swift`
- **Do not** change `FiltersView.swift` / Suggest pickers
- **One test file:** `ios-client/OutfitSuggestorTests/InsightsLifestylePreferencesTests.swift`

---

## API and contract

`POST /api/wardrobe/analyze-gaps`

Keep legacy `occasion`, `season`, `style` (clients still send derived values). Add optional lifestyle fields:

```json
{
  "occasion": "work",
  "season": "all-season",
  "style": "classic",
  "text_input": "",
  "analysis_mode": "free",
  "lifestyle_mix": ["work", "everyday"],
  "primary_lifestyle": "work",
  "dress_code": "smart-casual",
  "climate": null,
  "style_primary": "classic",
  "style_accent": null,
  "event_focus": null
}
```

Clients **must** send the new fields from Insights. Derive legacy `occasion` / `season` / `style` with the same mapping as backend `services/wardrobe_gap_context.py`.

Allowed:

- `lifestyle_mix` items: `work` | `everyday` | `social` | `formal` | `sport` (max 3, unique)
- `dress_code`: `casual` | `smart-casual` | `business-professional` | `formal`
- `climate`: omit/null, or `hot` | `temperate` | `cold`
- `style_primary`: `classic` | `smart-casual` | `preppy` | `minimal` | `elegant` | `streetwear` | `sporty`
- `style_accent`: omit/null, or `vintage` | `edgy` | `sporty` | `preppy`
- `event_focus`: omit/null, or a Suggest occasion API value

Response `occasion` / `season` / `style` are **display** strings for the context bar (e.g. `Work + Everyday`, `Year-round`, `Classic`). Analyzer still uses canonical mapped values internally.

Old clients that omit lifestyle fields keep working.

Accessibility:

- `insights.preferencesForm` / `analysis-preferences-card`
- `insights.lifestyleMix`
- `insights.dressCode`
- `insights.seasonCore`
- `insights.stylePrimary`
- `insights.styleAccent`
- `insights.eventFocus`
- `insights.analyzeButton` unchanged

---

## User-facing docs (About & Guide)

- [x] **Yes**
  - Guide Insights steps: set lifestyle mix (primary + up to 2 more), dress code, year-round/climate, primary style + optional accent; notes are constraints. Do **not** say Insights uses the same occasion/season/style pickers as Suggest.
  - About Insights bullet: mention lifestyle mix / dress code, not only “occasion, season, style”.

---

## Tests (required)

### Backend (orchestrator)

- [x] `tests/test_wardrobe_gap_context.py` — mapping + mix cap
- [x] Prompt includes lifestyle mix when `lifestyle_context` is passed
- [x] `POST /analyze-gaps` with lifestyle fields returns display context

### Web (one file)

- [x] `InsightsFlow.integration.test.tsx`
  - Lifestyle chips (Work, Everyday, …) visible; Suggest-only labels like Boho are not Insights primaries
  - Default Work + Everyday; cannot select a 4th mix chip
  - Analyze POST includes `lifestyle_mix`, `primary_lifestyle`, `dress_code`, `style_primary`

### iOS (one file)

- [x] `InsightsLifestylePreferencesTests.swift`
  - Defaults, max-3 mix, primary reassignment, request encoding of new fields
  - Copy: Insights-only note; notes placeholder about constraints

---

## Out of scope

- Changing Suggest/Wardrobe preference dropdowns
- Multi-select calendar seasons
- Full test suites (Cost Twin UI — targeted tests only)
