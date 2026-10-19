# Feature Spec: Smaller history and wardrobe API responses

**Branch:** `feature/api-response-size`  
**Slug:** `api-response-size`  
**Status:** done (targeted tests green; full suite via `./run_all_tests`)

---

## User story

As a user on a phone connection, I want History, Past Suggestions and the Wardrobe grid to load quickly, so the app feels fast at App Store launch. **No user-visible flow or copy changes.**

Today every history entry embeds the full input photo plus the full photo of each matched wardrobe item, and clients fetch up to 100–200 entries at once (tens of MB). The wardrobe list embeds every full photo.

---

## Backend contract (done — orchestrator)

### `GET /api/outfit-history`

| Param | Default | Notes |
|-------|---------|-------|
| `limit` | 20 | ≥ 1; values > 100 are **clamped** to 100 |
| `offset` | 0 | ≥ 0 |
| `wardrobe_item_id` | — | Only entries made from or using this item: `source_wardrobe_item_id` or any slot id (shirt, trouser, blazer, shoes, belt, sweater, outerwear, tie) equals it, or legacy rows whose input photo is identical to the item's photo. Replaces the client-side `historyEntryReferencesItem` filter. |
| `include_images` | `true` | `false` → `image_thumbnail`, `model_image` and matched-item thumbnails are all `null` (text-only pool for random pick) |

- Response is still a **JSON array** (same entry shape as before), newest first. **A page shorter than `limit` is the last page** (no total/has_more field).
- Each entry: `image_data` is now always **`null`**; new **`image_thumbnail`** (base64 JPEG, ≤ 256 px) holds the input photo thumbnail (from the source wardrobe item when the photo is referenced).
- `matching_wardrobe_items[slot][0]`: `{ id, category, color, description, image_data: null, image_thumbnail }`.
- `model_image` unchanged (still full in list when `include_images=true`).

### `GET /api/outfit-history/{entry_id}` (new)

- Same entry shape, but `image_data` = **full input photo** (resolved from the wardrobe item when referenced) + `image_thumbnail`. Matched items still thumbnails only.
- 401 when signed out, 404 when not found / not the user's.

### `GET /api/wardrobe` (list)

- Each item: `image_data` is now **`null`**; new **`image_thumbnail`** (≤ 256 px). Paging params unchanged (`limit` ≤ 100, `offset`, `category`, `search`).

### `GET /api/wardrobe/{id}` (detail) and POST/PUT responses

- Unchanged: full `image_data`, plus `image_thumbnail`.

### Other

- gzip: responses ≥ 1 KB are gzip-compressed when the client sends `Accept-Encoding: gzip` (browsers and `URLSession` do this automatically — no client work).
- Not changed: suggestion responses (`/api/suggest-outfit*` `matching_wardrobe_items` still carry full `image_data`), week plans, random-outfit, check-duplicate.

---

## Client rules (both platforms)

1. **Lists show thumbnails:** render `image_thumbnail ?? image_data` everywhere a history entry, matched wardrobe item or wardrobe item is shown as a thumbnail/card (History list, Recent looks, Past Suggestions modal/sheet, Wardrobe grid, outfit item thumbnails, week planner/fit panels that use wardrobe list items).
2. **Full image on view:** when the user enlarges a photo (thumbnail enlarge viewer) or a flow needs the real photo (load history entry into the main flow / preview, "use this item" / load wardrobe item into the main flow, Past Suggestions → select, edit item), fetch the detail endpoint first:
   - history entry → `GET /api/outfit-history/{id}` (`image_data`)
   - wardrobe item → `GET /api/wardrobe/{id}` (`image_data`)
   - Show the thumbnail immediately while the full image loads; if the fetch fails, keep the thumbnail (enlarge) or show the existing error for that flow.
   - Cache full images by **entry id / item id** for the session (invalidate a wardrobe item on edit/delete).
3. **History screen pagination:** first page `limit=20&offset=0`; load the next page (`offset += 20`) when the user scrolls near the bottom; stop when a page returns fewer than 20. Bottom spinner while loading more (accessibility label "Loading more looks"). Replace current "load 2 then 50/200" logic with this; deleting an entry removes it locally without refetching every page.
   - History header: "Showing last N entries." while pages remain, "Showing all N entries" when exhausted; no "Load All" button (web keeps "Refresh", which resets to page 1). "Oldest First" also loads remaining pages (page size 100), like search.
   - Recent looks on the main page: `limit=4` (iOS already) / the minimum it renders (web: keep its current count, max 4).
   - **History search** stays client-side: while a search query is active, keep loading remaining pages (page size 100) until exhausted so search results match today's.
4. **Past Suggestions (wardrobe item):** `GET /api/outfit-history?wardrobe_item_id={id}&limit=20&offset=…`, load more on scroll in the existing modal/sheet; remove the client-side `historyEntryReferencesItem` filter (server does it). Empty/error copy unchanged.
5. **Random pick from history:** fetch pool `GET /api/outfit-history?limit=100&include_images=false` (no more `limit=150` / `limit=100` with photos), run the existing `pickRandomHistoryEntry` / diversity logic unchanged, then `GET /api/outfit-history/{id}` for the chosen entry before showing it.
6. No request may use `limit` > 100 on history.

---

## Screens and flows

| Area | Web | iOS |
|------|-----|-----|
| API client + models | `services/ApiService.ts`, `models/OutfitModels.ts`, `models/WardrobeModels.ts` | `Services/APIService.swift`, `Models/HistoryModels.swift`, `Models/WardrobeModels.swift`, `Models/OutfitModels.swift` |
| History list (pagination, thumbnails, enlarge, load into flow) | `views/components/OutfitHistory.tsx`, `controllers/useHistoryController.ts`, `App.tsx` (history wiring only) | `Views/HistoryListView.swift` |
| Recent looks | `views/components/RecentLooksSection.tsx` | `Views/RecentLooksSection.swift` |
| Random pick | `controllers/useHistoryController.ts`, `controllers/useOutfitController.ts` (`loadRandomFromHistory`) | `ViewModels/OutfitViewModel.swift` (`cachedHistory`) |
| Past Suggestions | `views/components/Wardrobe.tsx` (`handleOpenHistorySuggestions`, `handleSelectHistorySuggestion`) | `Utils/WardrobeCardUx.swift` |
| Wardrobe grid + enlarge + use item | `views/components/Wardrobe.tsx` | `Views/WardrobeListView.swift` |
| Item thumbnails | `utils/outfitItemThumbnail.ts`, `views/components/weekPlan/OutfitItem.tsx`, `views/components/wardrobe/WardrobeFitPanel.tsx`, `utils/historyUtils.ts` | `Utils/OutfitItemThumbnail.swift`, `Views/WardrobeFitResultSheet.swift`, `ViewModels/WeekPlannerViewModel.swift` |

Agents: verify each `image_data` read in these files still works when the list value is `null`.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading first page | Existing loading UI | unchanged |
| Loading more | Small spinner at list bottom | a11y: "Loading more looks" |
| Empty | Existing empty states | unchanged |
| Error (first page) | Existing error + retry | unchanged |
| Error (load more) | Keep loaded entries; allow retry on next scroll | no new copy |
| Full image loading | Show thumbnail until full image arrives | none |

### iPhone / iPad (iOS)

Same UX on both; no layout changes required.

---

## User-facing docs (About & Guide)

- [x] **No** — performance only; no flow or copy change.

---

## Tests (required)

### Backend (orchestrator) — done

- [x] `backend/tests/test_api_response_size.py` — thumbnail helper; pagination (default 20, offset/limit, clamp 100, 422 on bad values); `wardrobe_item_id` filter (slot, outerwear slot, source, identical legacy photo, paginated, other user's item); list thumbnails only (entry + matched items + wardrobe-referenced); lazy backfill of legacy rows; `include_images=false`; history detail (full photo, wardrobe-resolved, 404, 401); wardrobe list thumbnail / detail full / add + replace store thumbnail / legacy backfill; gzip.
- [x] `backend/tests/test_outfit_history_storage.py` — updated to read full photo from detail endpoint.

### Web (web agent)

- [x] `frontend/src/services/ApiService.responseSize.test.ts` (new): `getOutfitHistory` sends `limit`/`offset`/`wardrobe_item_id`/`include_images`; `getOutfitHistoryEntry(id)` and `getWardrobeItem(id)` hit detail endpoints.
- [x] `frontend/src/views/components/OutfitHistory.pagination.integration.test.tsx` (new, MSW): first page 20 → scroll/sentinel loads offset 20 → stops on short page; list `<img>` uses `image_thumbnail`; enlarge fetches detail and shows full image.
- [x] `frontend/src/views/components/Wardrobe.pastSuggestions.integration.test.tsx` (new or extend existing past-suggestions test): request includes `wardrobe_item_id`; wardrobe grid renders thumbnails; selecting a past suggestion fetches the wardrobe item detail.
- [x] Random pick: unit test (in `useOutfitController`/`useHistoryController` test or a new `randomHistoryFetch.test.ts`) — pool fetched with `include_images=false&limit=100`, then detail fetched for the picked id.
- [x] Update `src/test/msw/handlers.ts` (history list with `image_thumbnail`, history detail, wardrobe list thumbnails) and fix any existing spec-listed tests that relied on `image_data` in list payloads.
- Run only these files: `cd frontend && npm test -- --watchAll=false <files>`

### iOS (iOS agent)

- [x] `ios-client/OutfitSuggestorTests/APIResponseSizeTests.swift` (new): URL building for history (`limit`, `offset`, `wardrobe_item_id`, `include_images`) and detail endpoints; decoding `image_thumbnail` on history entry, matched item and wardrobe item (with `image_data` null); thumbnail-or-full helper; history pagination loader (append pages, stop on short page, no request > 100); Past Suggestions uses `wardrobe_item_id`; random pick fetches pool without images then detail for picked id.
- [x] Update mocks conforming to the API protocol (`OutfitViewModelIntegrationTests.swift`, `WardrobeCardUxTests.swift`) for any new protocol methods.
- Run: `-only-testing:OutfitSuggestorTests/APIResponseSizeTests` (plus `WardrobeCardUxTests` if touched)

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS (no flow/copy change)
- [x] Both clients: thumbnails in lists, full image fetched on view / flow entry
- [x] Both clients: paginated history + load more; Past Suggestions server filter; random pick text-only pool + detail
- [x] API client methods match on both platforms
- [x] New-behavior tests added (web + iOS)
- [x] Targeted web tests pass
- [x] Targeted iOS tests pass
- [x] Targeted backend pytest pass
- [x] Full suite launched: `./run_all_tests` in new terminal

---

## Out of scope

- Moving photos to object storage (`photo-object-storage.md`)
- Thumbnails for suggestion responses, week plans, model images
- Server-side history search
- Watch / widget (no base64 photos there)
