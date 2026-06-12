# Feature Spec: Random from History — Sync "Your inputs" Panel

**Branch:** `feature/main-page-ui-improvements`  
**Slug:** `random-history-input-summary-sync`  
**Status:** done

---

## User story

When I tap **Random from History**, the result loads on the right and the left **Your inputs** panel must update to match that history look (preview image, caption, context) — not keep a previous wardrobe upload or stale chip.

---

## Bug

After Random from History:
- Result panel updates correctly
- **Your inputs** / compact summary still shows **old** preview (e.g. previous wardrobe item, wrong caption, or current filters instead of loaded look context)

**Causes:**
1. Stale `sourceWardrobeItem` overrides caption (`Wardrobe · shirt` instead of `From history`)
2. `MainFlowCompactSummary` uses live `filters` / `preferenceText`, not the loaded history entry
3. Wardrobe source banner (`From your wardrobe`) may still render alongside compact summary
4. Preview URL not cleared before setting new history preview

---

## Required behavior (both platforms)

On **Random from History**:

1. Clear stale input state first: upload `File`/`selectedImage`, prior preview URL/image, prior `sourceWardrobeItem` (unless entry has `source_wardrobe_item_id`)
2. Load suggestion from picked history entry
3. Set left-panel preview from entry `image_data` (or first wardrobe match thumb fallback)
4. Caption: **From history** (use `MainFlowUxCopy` / `mainFlowUxCopy.ts`)
5. Compact summary filters/context reflect **loaded entry**:
   - Use `occasion`, `season`, `style` from history API when present
   - Fallback: parse from `text_input` or keep current filters if absent
6. Hide creation-mode **From your wardrobe** banner when viewing loaded result (`compactMode`)
7. Do **not** let `sourceWardrobeItem` caption override history caption unless entry truly originated from that wardrobe item AND user is in creation (not history browse mode)

Add shared copy key if missing:
- Web: `MAIN_FLOW_UX_COPY.fromHistory`
- iOS: `MainFlowUxCopy.fromHistory`

---

## API / contract

History entries include `occasion`, `season`, `style` in backend — ensure clients map them:

| Web | iOS |
|-----|-----|
| `OutfitHistoryEntry` type | `OutfitHistoryEntry` model |
| `historyEntryToSuggestion()` | `toOutfitSuggestion()` |

No backend change required if fields already returned in GET `/api/outfit-history`.

---

## Tests (required)

### Web
- [x] `RandomFromHistory.integration.test.tsx` — after random pick, compact summary image + "From history"; no stale wardrobe chip
- [x] Test: prior wardrobe source cleared when history entry has no `source_wardrobe_item_id`
- [x] `historyUtils.test.ts` — maps occasion/season/style from entry
- [x] `Sidebar.test.tsx` — wardrobe banner hidden in compactMode

### iOS
- [x] `OutfitViewModelIntegrationTests` — random history updates `flowPreviewImage`, clears stale source, sets summary filters
- [x] `MainFlowUxContractTests` — `MainFlowUxCopy.fromHistory` caption

---

## Parity

- Same caption **From history**
- Same preview sync behavior
- Same filter display from loaded entry when available
