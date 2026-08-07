# Feature Spec: Week overview day cards — occasion + style

**Branch:** `fix/weekly-planner-gui`  
**Slug:** `week-overview-day-occasion-style`  
**Status:** done  
**Mode:** Cost Twin UI (narrow scope)

---

## Goal

On Week overview day cards, planned days show **both** occasion and style as one secondary line (`{Occasion} · {Style}`), matching the day editor’s Occasion + Style controls. Off / not planned days stay `Off` only.

---

## Files (only these + their tests)

| Platform | Files |
|----------|--------|
| Web | `frontend/src/views/components/weekPlan/WeekDayCard.tsx`; optional helper in `frontend/src/models/WeekPlanModels.ts`; **one** test file (prefer new `WeekDayCard.test.tsx` or extend `WeekPlanner.integration.test.tsx` / `WeekPlanModels.test.ts`) |
| iOS | `ios-client/OutfitSuggestor/Views/WeekPlannerView.swift`; optional nearby display helper; **one** test file under `OutfitSuggestorTests/` |

Do **not** edit `backend/`, other platforms’ trees, About/Guide, or `IOS_WEB_FEATURE_PARITY.md` (unless a one-liner is truly needed — prefer skip).

---

## Behavior (both platforms)

| State | Secondary line | Accessibility |
|-------|----------------|---------------|
| Planned (`enabled`) | `{Occasion} · {Style}` truncated on one line | Card label/summary includes both |
| Occasion empty | Fallback **Everyday** | same |
| Style empty/missing | Platform default style label (**Classic** / `classic`) | same |
| Not planned / Off | **Off** only — no style | Off only |

Example: occasion=`work`, style=`classic` → `Work · Classic`.

Reuse existing formatters:
- Web: `formatOccasionLabel`; add `formatStyleLabel` (or mirror occasion formatting) next to it in `WeekPlanModels.ts` if none exists — same title-case hyphen style as occasion. Use `DEFAULT_DAY_STYLE` (`classic`) when empty.
- iOS: `occasionDisplay`; Style via `Style.allCases` / `.rawValue` (same pattern as FiltersView). Default classic when empty. May add a small `styleDisplay` / `dayContextLine` helper in `WeekPlannerView` or nearby — do not invent a second taxonomy.

No API/backend changes.

### iPhone / iPad

Same UX; layout/spacing via `horizontalSizeClass` only.

### About / Guide

- [ ] Not needed

---

## Tests (required) — one file per platform max

- [x] Planned day occasion=work, style=classic → shows both (e.g. contains “Work” and “Classic”, or “Work · Classic”)
- [x] Planned day empty/missing style → occasion + default style label (Classic)
- [x] Not planned / Off → shows “Off”; does not require a style line

Web: run targeted Jest for that one test file.  
iOS: run the one new/updated test class via `xcodebuild test -only-testing:…`.

---

## Orchestrator notes

- Backend: skip  
- Full suites: skip unless user asks (Cost Twin UI)  
- Parity doc: skip unless needed  
