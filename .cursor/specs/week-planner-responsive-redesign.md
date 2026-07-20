# Cost Twin UI: Week Planner responsive redesign

**Branch:** `feature/week-planner-responsive-redesign`  
**Slug:** `week-planner-responsive-redesign`  
**Status:** done

## Goal

Responsive Week Outfit Planner UI matching mockups (1=web, 2=iPad, 3=iPhone). Reuse existing week-plan APIs/models/controllers. No new backend.

**Mockups (order):** desktop → iPad landscape → iPhone. Agents: match visual language below if image files are unavailable.

### Mockup visual summary

**Shared:** Deep navy `#0A0E1A`-ish bg; elevated dark cards `#151B2D`; white primary / cool-gray secondary; blue→violet primary CTAs; purple selected-day glow border; green Ready pills; purple Missing pills/alerts; rounded ~10–12px cards.

**Desktop (≥1200):** Title “Week Outfit Planner” + subtitle about reminders; season + reminder pills + “Generate week”; full 7-day card row (day/date, occasion, 3-item preview collage, status pill); selected day 2-col: item grid + missing placeholder (dashed) + missing action bar (Choose from wardrobe / Find an alternative / Continue without) | summary + badges + collapsed “Why this outfit works” + Replace / Regenerate; footer Back + Save weekly plan.

**iPad (~768–1199):** Same structure; ~5 day cards visible + scroll affordance; 2-col detail; touch-friendly; footer Back + Save.

**iPhone (<768):** Compact nav “Week Planner”; horizontal date strip with status dots; single-column; season + “From your wardrobe”; item gallery; summary; Missing card with primary Choose from wardrobe + overflow; Why / Regenerate rows; sticky Save above tab bar (Week selected).

## Behavior (preserve + present)

- Season + reminder selectors; Generate week; Regenerate day; Save weekly plan
- Week overview → select day → detail (no reload)
- Outfit images + concise summary; “Why this outfit works” collapsed by default
- Status: Ready (green), Missing (purple), Rest day, Not generated
- Missing-item UI: Choose from wardrobe / Find alternative / Continue without
- Selected day: purple outline; primary CTAs: blue→violet gradient
- Deep navy bg, dark elevated cards, white/cool-gray text

## Missing-item contract (no backend invent)

Derive missing slots client-side (empty outfit slot text / no wardrobe match).  
If no week-plan replace API exists:

| Action | Integration |
|--------|-------------|
| Choose from wardrobe | Typed stub or navigate/deep-link to Wardrobe; do not invent PUT payloads |
| Find an alternative | Prefer existing regenerate-day; else disabled + clear reason |
| Continue without | Local dismiss/accept incomplete for that day |

Document any gap in agent return notes.

## Responsive

| Width | Layout |
|-------|--------|
| ≥~1200px | Up to 7 day cards; 2-col selected-day detail |
| ~768–1199px | ~3–4 cards + horizontal scroll + affordance; 2-col when space; ≥44×44; safe areas |
| <~768px | Compact date strip + status dots (a11y labels); single column; sticky Save; Week tab selected; no overflow at 320px |

iOS: same UX iPhone/iPad; layout via `horizontalSizeClass` only.

## Files

**Web:** `WeekPlanner.tsx`, `views/components/weekPlan/**`, `useWeekPlanController.ts`, `WeekPlanModels.ts`, `ApiService.ts` (typing only), `WeekPlanner.integration.test.tsx` **or** `useWeekPlanController.test.ts` (one), About + UserGuide (one line each)

**iOS:** `WeekPlannerView.swift`, `WeekPlannerViewModel.swift`, `WeekPlanModels.swift`, `APIService.swift` (if needed), `WeekPlannerViewModelTests.swift` (one), UserGuide (+ About if present)

**Backend:** none

## About / Guide

Yes — one short line each: week overview, day detail, missing-item resolve, save.

## Tests (3–5 bullets)

- Day selection updates detail without full reload
- Missing-item actions visible when a slot is missing
- Save disabled / busy while saving
- Web: compact strip vs day cards smoke if feasible
- iOS: same via ViewModel/accessibility identifiers; iPhone+iPad same flows

## Out of scope

New endpoints; hardcoded mockup outfits in prod; design-system rewrite; nav IA changes beyond Week selected on mobile.

## Done when

Layouts match mockups at desktop/iPad/iPhone; controls use existing architecture; targeted tests pass. Skip full suites.
