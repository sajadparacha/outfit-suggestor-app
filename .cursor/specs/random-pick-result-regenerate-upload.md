# Feature Spec: Regenerate & Upload After Random Pick Result

**Branch:** `feature/main-page-ui-improvements`  
**Slug:** `random-pick-result-regenerate-upload`  
**Status:** done

---

## User story

After **Random from Wardrobe** or **Random from History** shows a result, I want to:
1. **Generate other looks** from the loaded look (alternate outfit, same source)
2. **Upload a new item** and run **Generate Outfit** again

Currently compact result mode hides upload controls and disables **Generate Another Look** because there is no `File`/`selectedImage`.

---

## Required behavior (both platforms)

Use shared logic: `mainFlowResultRegenerate.ts` / `MainFlowResultRegenerateLogic.swift`

### Compact result left column (`compactMode` / `showsCompactResultLayout`)

Below compact summary, show:

1. **Upload new item** (+ camera on web/iOS) — `MAIN_FLOW_UX_COPY.uploadNewItem` / `compactUploadHint`
   - On pick: clear `currentSuggestion`, `inputPanelSource`, summary filters, flow preview; set new image; return to **creation** layout
2. **Generate Another Look** when `canGenerateAnotherFromResult(...)` is true
   - Also enable on result panel sticky actions / `OutfitPreview` (not only `hasImage`)
3. Keep **Preferences**, **Random picks**, **Wardrobe** accordions accessible in compact mode (already partially there)

### Generate Another routing

| Source | Action |
|--------|--------|
| Uploaded image | Existing `getSuggestion` + `previous_outfit_text` |
| `inputPanelSource === 'wardrobe'` (random wardrobe, no file) | Call wardrobe random / wardrobe-only again with `formatPreviousOutfitForPrompt` in text or re-use `getRandomSuggestion` |
| `inputPanelSource === 'history'` with `image_data` / flow preview | Hydrate base64 preview → `File`/`UIImage`, then `getSuggestion` with `previous_outfit_text` |
| Refine menu | Same branches; wardrobe-only refine works without upload when source is wardrobe random |

### Do not regress

- Wardrobe "Style this item" pending flow (`sourceWardrobeItem && image && !hasSuggestion`) still shows full creation + Generate Outfit
- Normal upload → generate flow unchanged

---

## Shared copy (added by orchestrator)

- `uploadNewItem`: Upload new item
- `compactUploadHint`: Upload a new photo to start a fresh outfit

---

## Tests (required)

### Web
- [x] `mainFlowResultRegenerate.test.ts` (orchestrator — done)
- [x] `RandomFromHistory.integration.test.tsx` — Generate Another enabled; upload clears result
- [x] `RandomFromWardrobe.integration.test.tsx` — wardrobe regenerate calls API again
- [x] `Sidebar.test.tsx` — compact mode shows upload + generate another
- [x] `OutfitPreview.test.tsx` — actions enabled when `canGenerateAnother` true without file

### iOS
- [x] `MainFlowResultRegenerateLogicTests`
- [x] `OutfitViewModelIntegrationTests` — history hydrate + wardrobe random regenerate
- [x] `MainFlowUxContractTests` — new copy keys

---

## Parity

- Same upload-new-item behavior in compact result
- Same Generate Another availability rules
- Same copy strings
