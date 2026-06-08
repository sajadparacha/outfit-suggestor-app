# Twin UI: One Phrase, Two Platforms, Zero Drift

**How we used parallel AI agents in Cursor to ship matching web and iOS UX on Outfit Suggestor — a full day of work across the repo, June 9, 2026.**

---

Outfit Suggestor helps people build better outfits from photos of their clothes. It runs on **React (web)** and **SwiftUI (iOS)** — same product, two codebases.

Every UX improvement used to raise the same questions:

- Did we ship both platforms?
- Is the copy identical?
- Did we break anything on the other side?

Today we answered those questions at scale — with a repeatable workflow we call **Twin UI**, executed across `feature/multiagent-ui-ux-enhancements` and related branches that feed `main`.

---

## Today at a glance (June 9, 2026)

| Area | What happened |
|------|----------------|
| **Active branch** | `feature/multiagent-ui-ux-enhancements` (primary); no new commits on any branch today — work is implemented and tested locally, ready to land |
| **Twin UI cycles run** | 5 product cycles + 1 workflow improvement |
| **Parallel agents spawned** | 10+ web/iOS subagent runs (2 per feature, always in parallel) |
| **Specs written** | 9 platform-neutral feature specs under `.cursor/specs/` |
| **Files touched** | 58+ modified, 50+ new (web, iOS, backend, Cursor workflow) |
| **Test runs** | Full web + iOS unit/integration + UI test suites executed |
| **Infrastructure** | Twin UI rules, skill, `AGENTS.md`, test-report template, confirmation gate |

**Branches in the same sprint** (merged to `main` on June 8, same HEAD as today's work):

- `feature/ui-ux-refinements` — post-result outfit actions
- `feature/ui-ux-improvements` — shared Suggest/Insights preferences
- `feature/web-responsive-mobile` — premium wardrobe analysis fix
- `feature/web-ios-home-redesign` — unified home experience

---

## What is Twin UI?

**Twin UI** is a strict multi-agent pattern in Cursor. You start any instruction with:

```text
Twin UI: [your instruction]
```

**Twin** = two platforms, two agents, always in parallel.

| Role | Scope | Responsibility |
|------|-------|-----|
| **Orchestrator** (main chat) | Specs, backend, contracts | Writes the platform-neutral spec, handles API changes, reviews parity |
| **Web agent** | `frontend/**` only | React, Tailwind, Jest |
| **iOS agent** | `ios-client/**` only | SwiftUI, XCTest, XCUITest |

The orchestrator **never** edits platform UI directly. It writes `.cursor/specs/<feature>.md`, then launches **two Task subagents in one message**. Each agent adds tests before returning. Full web + iOS test suites are the exit gate — with **user confirmation** before the long run.

We codified this in `AGENTS.md`, `.cursor/rules/parallel-ui-orchestrator.mdc`, and a project skill.

---

## How Twin UI works

```
You: "Twin UI: [instruction]"
         │
         ▼
   Platform-neutral spec (.cursor/specs/)
         │
    Backend/API change? ──yes──► pytest (orchestrator)
         │ no
         ▼
   ┌─────────────┐     ┌─────────────┐
   │ Web agent   │     │ iOS agent   │
   │ frontend/   │     │ ios-client/ │
   └──────┬──────┘     └──────┬──────┘
          └────────┬──────────┘
                   ▼
        Parity review → confirm → full test gate → Test Execution Report
```

**Shared copy modules** keep web and iOS aligned:

| Concern | Web | iOS |
|---------|-----|-----|
| Insights labels | `insightsCopy.ts` | `InsightsCopy.swift` |
| Inline micro-help | `microHelpCopy.ts` | `MicroHelpCopy.swift` |
| Auth prompts | `authPromptCopy.ts` | `AuthPromptCopy.swift` |
| Wardrobe card UX | `Wardrobe.tsx` | `WardrobeCardUx.swift` |
| Guest sessions | `guestSession.ts` | `GuestSession.swift` |
| Admin gating | `AdminVisibility.test.tsx` | `AdminVisibility.swift` |

---

## Everything we built with Twin UI (complete inventory)

Nine product improvements, each spec'd and built for **both** platforms. Five ran today; four were completed earlier in the sprint on the same branch.

### A. Completed earlier in the sprint (same branch, merged to `main` June 8)

**1. Twin UI platform itself**
- Coined the trigger phrase **`Twin UI:`**
- Orchestrator rules: spec first, two agents always, no inline platform UI
- Mandatory tests per agent + end-of-run Test Execution Report
- Spec template with required Tests section

**2. Wardrobe delete with undo**
- Replaced risky immediate delete with **"Item deleted. Undo"**
- 5-second optimistic hide, then API commit
- Web + iOS parity

**3. History delete confirmation**
- Dropped `window.confirm` on web
- In-app **ConfirmationModal** (web) and **confirmationDialog** (iOS)
- Matching copy: "Delete history entry?" / "This outfit suggestion will be removed from your history."

**4. Route-based navigation**
- **Web:** React Router — shareable URLs (`/`, `/wardrobe`, `/history`, `/insights`, `/guide`, `/about`, `/settings`, `/admin/*`)
- GitHub Pages SPA fallback (`404.html`)
- **iOS:** `AppRoute` + `RouteCoordinator` + `onOpenURL` deep links aligned to the same paths
- Fixed `react-router-dom` dependency issues during rollout

**5. Persuasive authentication UX**
- Login at **moments of value**, not generic walls:
  - After first outfit → *"Save this outfit and build your wardrobe."*
  - Like → *"Sign in to save favorites."*
  - History → *"Create an account to keep your outfit history."*
  - Wardrobe → *"Upload your clothes once and get unlimited combinations."*
- `AuthGateCard` (web), `GuestAuthSheetView` (iOS)
- Guests still generate outfits without logging in

**6. Guest AI limit — 3 free tries**
- **Backend:** `POST /api/suggest-outfit` counts guest usage; `GET /api/guest-usage`; 403 with `guest_limit_reached` after 3 calls
- **Web + iOS:** `X-Guest-Session-Id` header, remaining-count hint, blocking signup UI at limit
- Authenticated users: unlimited

**7. Home redesign + shared preferences** *(committed June 7–8, multi-agent)*
- Dark navy theme, blue-to-purple brand gradient (`#4facfe` → `#c471ed`)
- New NavBar, Sidebar, Recent Looks, filter controls
- iOS `AppTheme` aligned; shared Suggest/Insights preference state on iOS (parity with web)
- Post-result actions simplified: **Generate Another Look** + clear secondary actions (formal, casual, wardrobe-only, change occasion)

**8. Premium wardrobe analysis fix**
- Raised `wardrobe_gap_max_tokens` to 8000 — premium JSON no longer truncates to basic mode
- Backend + frontend regression tests

**9. Documentation**
- `WEB_USER_INTERACTION.md` — full web interaction model documented
- `IOS_WEB_FEATURE_PARITY.md` — updated per feature

---

### B. Shipped today (June 9) — five Twin UI cycles

**10. Insights UX copy — from AI jargon to fashion assistant**

| Before | After |
|--------|-------|
| Basic Analysis | Quick Wardrobe Check |
| Premium Analysis | AI Stylist Review |
| Wardrobe Gap Analysis | What's Missing From My Wardrobe? |
| Priority Shopping List | What to Buy Next |
| Missing colors / styles | Colors to add / Styles to try |

Admin diagnostics (tokens, USD, raw prompts) stay technical — admin-only.

**Verification:** Web 36 suites / 194 tests passed (scoped). iOS `InsightsCopyTests` passed.

---

**11. Contextual micro-help — teach at the point of use**

| Location | Help text |
|----------|-----------|
| Wardrobe-only toggle | Only recommend items from your saved wardrobe. |
| Model preview toggle | Creates a visual preview of the suggested outfit. |
| Insights entry | Find missing items that would unlock more outfit combinations. |

Guide and About unchanged — surgical, in-flow education.

**Verification:** Web 37 suites / 197 tests passed (scoped). iOS `MicroHelpCopyTests` — 3/3 passed.

---

**12. Admin UX gating — polish for real users**

| Surface | Before | After |
|---------|--------|-------|
| Model preview toggle | Visible via `?modelGeneration=true` (web) | Admin only |
| Image model selector | Sometimes visible | Admin only |
| AI prompt / cost / diagnostics | Mostly gated | Hard-gated (`isAdmin` required) |
| `/admin/reports`, `/admin/integration-tests` | "Admin privileges required" page | Silent redirect to Suggest |
| Guide & About | Admin how-to visible to all | Admin sections hidden |

**Verification:** `AdminVisibility.test.tsx` — 9/9. `AdminVisibilityTests` — 10/10 on iPhone 17 simulator. Full-suite run confirmed by user.

---

**13. Wardrobe card simplification — one hero action**

```
[ thumbnail ]  Category
               Color / description

[ ✨ Style this item          ]  [ ⋮ ]
     (hero, full-width)         (menu)
```

- **Hero:** Style this item (replaces "Build outfit from this item")
- **Overflow menu:** View image → Edit → History → Delete
- Removed: Past Suggestions button, inline Edit/Delete, clickable thumbnail

**Verification:** Web wardrobe tests updated. iOS `WardrobeCardUxTests` — 5/5 passed. E2E test alignment for new menu paths in progress.

---

**14. Twin UI workflow refinement**

- Orchestrator now **asks for confirmation** before full web + iOS suites
- Updated: `AGENTS.md`, `.cursor/skills/parallel-ui-ux/SKILL.md`, orchestrator rule, test-report template
- Fast iteration during agent work; full gate when you are ready

---

## Test execution today

We ran complete suites to validate the sprint — not just feature-scoped tests.

### Web (`frontend/`)

| Run | Suites | Tests | Status |
|-----|--------|-------|--------|
| Latest scoped (post micro-help) | 37 / 37 | 197 / 197 | PASS |
| Latest full | 37 / 38 | 206 / 207 | 1 fail |

**Known failure:** `AuthUx.integration.test.tsx` — first-outfit guest banner region not found (persuasive auth UX; fix in progress).

### iOS (`ios-client/`)

| Run | Tests | Status |
|-----|-------|--------|
| Unit + integration (`OutfitSuggestorTests`) | 25 / 25 | PASS |
| UI tests (`OutfitSuggestorUITests`) | 9 / 10 | 1 fail |

**Known failure:** `testWardrobeActionButtonsNavigateToExpectedPaths` — wardrobe History menu path after card UX redesign (E2E update in progress).

**Passing UI tests include:** suggest flow, generate another look, history search/sort, admin insights, AI progress panel, occasion picker, wardrobe filter chips.

### Backend (`backend/`)

- `test_guest_usage.py` — guest limit enforcement
- Premium wardrobe analysis regression tests
- Run when API contracts change (guest limit, insights tokens)

---

## Why Twin UI beats a single agent

**1. True parallelism** — Web and iOS do not block each other.

**2. Platform-native output** — Tailwind vs SwiftUI, not awkward translation.

**3. One source of truth** — Every feature starts as a platform-neutral spec.

**4. Enforced parity** — Same behavior and copy, checked against spec.

**5. Merge-ready by default** — Tests are mandatory; a feature is not done without them.

**6. Honest scope** — Orchestrator handles backend; agents stay in their lane.

---

## What we learned today

**1. The spec is the contract.**  
Exact copy tables in markdown eliminate web/iOS drift.

**2. Rules matter as much as agents.**  
Early sessions let the orchestrator edit both platforms inline. Strict scope rules fixed that.

**3. Tests are how you trust parallel work.**  
207+ web tests, 25 iOS unit/integration tests, 10 UI tests — and we still catch integration gaps. That is the point.

**4. Copy is a feature.**  
"AI Stylist Review" vs "Premium Analysis" changes perception. Twin UI lands renames on both platforms in one instruction.

**5. Confirmation gates respect your time.**  
Full suites take minutes. Ask first, run when ready.

**6. You are still the tech lead.**  
Agents execute; you define intent, review parity, and decide when done means done.

---

## By the numbers

- **9** product feature specs + workflow infrastructure
- **10+** parallel web/iOS agent dispatches today
- **207+** web tests (unit + integration)
- **25** iOS unit/integration tests passing
- **9/10** iOS UI tests passing
- **4** branches merged into the same sprint HEAD on `main`
- **1** phrase to activate it all: `Twin UI:`

---

## Try it yourself

```text
Twin UI: [one sentence describing the UX you want on web and iOS]
```

Write the spec. Spawn two agents. Verify with tests. Ship both platforms together.

Multi-agent AI does not replace engineering judgment — it **compresses the execution layer**. The interesting work shifts to defining problems, splitting them cleanly, and verifying outcomes.

For cross-platform products, that split is natural: one agent per platform, one human orchestrating the symphony.

---

**Live app:** https://sajadparacha.github.io/outfit-suggestor-app

**Stack:** FastAPI · React 19 · TypeScript · Tailwind · SwiftUI · Cursor Task agents

---

**#AI #Cursor #MultiAgent #TwinUI #CrossPlatform #React #SwiftUI #ProductEngineering #UX #FashionTech #AgenticAI #SoftwareEngineering**

*Sajad Paracha — Outfit Suggestor*

---

## Copy-paste notes for LinkedIn

- Paste from the headline through the hashtags.
- LinkedIn does not render `#` headings — they work as plain-text section breaks.
- Apply **bold** manually where you see `**text**`.
- Optional opening hook:

  > June 9 on Outfit Suggestor: 9 cross-platform UX features, 10+ parallel agent runs, 207+ web tests — all from one Cursor phrase: Twin UI:
