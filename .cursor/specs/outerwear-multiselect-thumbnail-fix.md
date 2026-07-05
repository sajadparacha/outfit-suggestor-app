# Outerwear multi-select thumbnail fix

**Branch:** `feature/wardrobe-jacket-blazer-season-fix`  
**Workflow:** Cost Twin UI

## Goal

Complete-outfit multi-select: selected outerwear/jacket shows placeholder and "AI Suggested" instead of wardrobe photo and "From your wardrobe". Sidebar "Selected wardrobe pieces" preview must show the user's picked items (e.g. jacket), not the first AI-filled slot (e.g. shirt).

## Backend

- `WardrobeMatcher`: treat wardrobe category `outerwear` like `jacket`/`coat`.
- `suggest_outfit_from_wardrobe_only`: after matching, pin each selected wardrobe item into `matching_wardrobe_items` (mirror `_apply_source_wardrobe_match_overrides` outerwear insert).
- `_apply_source_wardrobe_match_overrides`: use outerwear category helper (not only jacket/coat literals).

## Web

- `frontend/src/utils/outfitItemThumbnail.ts`: for `outerwear`, resolve thumb by `outerwear_id` across all `matching_wardrobe_items` buckets.
- `frontend/src/utils/outfitItemThumbnail.test.ts`: cross-bucket outerwear case.

## iOS

- `ios-client/OutfitSuggestor/Utils/OutfitItemThumbnail.swift`: mirror web cross-bucket lookup.
- `ios-client/OutfitSuggestorTests/OutfitItemThumbnailTests.swift`: matching test.

## Tests (required)

### Backend
- [x] WardrobeMatcher matches `outerwear` category items
- [x] Pinned selected outerwear appears in `matching_wardrobe_items.outerwear` for wardrobe-only suggest
- [x] Jacket + shoes multi-select pins outerwear text without upload markers

### Web
- [x] `resolveMatchingWardrobeItem` finds outerwear by id in non-outerwear bucket
- [x] `resolveOutfitItemThumbnail` returns wardrobe tag when cross-bucket match has image
- [x] Wardrobe multi-select without upload image is not treated as upload anchor

### iOS
- [x] `resolveMatchingItem` finds outerwear by id across buckets
- [x] Wardrobe multi-select without live source category is not upload anchor

## About / Guide

No — bug fix only; no user-facing flow/copy changes.
