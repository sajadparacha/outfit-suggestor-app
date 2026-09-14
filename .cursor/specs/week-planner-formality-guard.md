# Feature Spec: Week Planner formality guard

**Branch:** `feature/admin-error-center`  
**Slug:** `week-planner-formality-guard`  
**Status:** done  
**Mode:** Cost Twin UI (abbreviated)

---

## Goal

When generating or regenerating a Week Planner day (especially wardrobe-only), do not pair formal/suit looks with athletic footwear or clash casual bottoms. Prefer a shoes "Consider adding …" gap over forcing sneakers with a blazer/suit look.

## Rules

1. For **Work / business / formal** occasions and **Elegant / classic / formal** styles: exclude athletic sneakers, running shoes, joggers, sweatpants, and similar casual pieces from shoe/bottom candidate pools when a structured blazer or suit-like look is selected or likely.
2. Soft AI prompt alone is not enough — **hard filter** candidates and/or **post-validate** (drop mismatched shoe → gap copy).
3. Reuse existing day `occasion` / `style`; season unchanged.
4. No new UI unless needed for messaging. Backend-first; clients only if they share match helpers or regenerate messaging.
5. Align loosely with Insights dress-code/formality language (`STYLE_FORMALITY` / similar tokens). Keep change narrow.
6. User-pinned wardrobe items for a slot win (do not strip pins).

## Screens / flows

| Area | Web | iOS | Notes |
|------|-----|-----|-------|
| Week Planner generate / regenerate day | existing | existing | Behavior change via API response only |

### User-facing docs (About & Guide)

- [x] **No** — no new Guide/About copy unless agents discover user-visible messaging change (then update both platforms).

## API / backend

- [x] **Yes** — generate path only; no new endpoints/contract fields.
- Filter wardrobe shoe/trouser candidates in `suggest_outfit_from_wardrobe_only` (and prompt reinforcement in `ai_service`).
- Post-check suggestion: if formal context + structured look + athletic shoe → clear shoe id/match, set `Consider adding …` for shoes.
- Same post-check for open (non-wardrobe) text suggestions when formal context + blazer look.

## Client

| Platform | Expected |
|----------|----------|
| Web | No change if regenerate already shows gap copy. Optional: shared helper only if already used for picks. **Skip UI chrome.** |
| iOS | Same. **Skip UI if backend-only.** |

## Tests (required)

### Backend (orchestrator)

- [x] `backend/tests/test_outfit_formality_guard.py`
- Cases:
  - Formal/work + classic filters athletic sneakers / joggers from candidate pools
  - Casual occasion does not filter sneakers
  - Post-check: blazer look + sneaker text/id → shoe gap ("Consider adding"), id cleared
  - Pinned athletic shoe is preserved
  - Prompt includes formality hard rule when wardrobe-only + formal context (optional assert)

### Web

- [x] Skip if no `frontend/**` change; else one test file near touched helper/controller

### iOS

- [x] Skip if no `ios-client/**` change; else one test class near ViewModel

## Parity checklist

- [x] Same generate behavior via shared backend (web + iOS)
- [x] About/Guide N/A
- [x] Targeted backend pytest pass
- [x] Platform agents: no-op or one test file each
- [x] `./run_all_tests` launched in new terminal (1353 passed)

## Out of scope

- New pick-filter UI / grayed chips
- Changing Insights gap ranking broadly
- Season logic
- New API fields
