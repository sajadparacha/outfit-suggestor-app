# Feature Spec: Photo object storage (Railway Buckets)

**Branch:** TBD (start from `main`)  
**Slug:** `photo-object-storage`  
**Status:** planned — deferred until after the App Store launch (do when the DB passes a few GB or backups get slow)

---

## Why

Photos are stored as base64 text in Postgres (`wardrobe_items.image_data`, `outfit_history.image_data`, `outfit_history.model_image`) and embedded in JSON responses.

Production on 2026-10-20, after the week-plan and outfit-history cleanups: database 150 MB.

| Data | Size |
|------|------|
| `outfit_history` user photos | ~60 MB (~36 MB of it the same photo re-uploaded without a wardrobe link) |
| `wardrobe_items` photos | ~32 MB (largest user: 101 items, 16.9 MB) |
| Model images (JPEG since `fd60d73`) | ~5.6 MB |

Hosting savings are small at this size. The real wins are a small database (fast backups and restores) and photo bytes leaving the JSON responses.

---

## Approach

**Railway Storage Buckets:** private, S3-compatible, $0.015/GB-month, free bucket egress and API calls. Serve photos with presigned URLs (up to 90 days), so bytes go straight from the bucket to the apps.

Railway limits to design around:

- Buckets are private only; there are no public buckets.
- There are no lifecycle (expiry) rules, so orphaned objects need a cleanup script.
- There's no object versioning or server-side encryption.
- Buckets are not on the private network, so uploads from the backend count as service egress ($0.05/GB).

A Railway Volume was rejected: it attaches to one service (blocks running replicas), and every photo would be served through the backend as billed egress.

---

## Phases

### 1. Infrastructure and storage layer (backend only)

- Create one bucket per environment and put its credentials in `web` service variables (endpoint, bucket, keys, region).
  - Local: MinIO or a dev bucket.
  - Tests: an in-memory fake.
- `backend/services/photo_storage.py` using `boto3`: `put(bytes, content_type) -> key`, `presign(key, ttl)`, `delete(key)`.
- Key format `photos/{user_id}/{sha256}.jpg`:
  - Content-addressed, so the same photo is stored once (this also covers the repeated uploads).
  - The per-user prefix makes account deletion a single prefix delete.
- Switch: `PHOTO_STORAGE=db|bucket`.

### 2. Schema and write path

- New columns, added through a startup `ensure_*` helper:
  - `wardrobe_items.image_key`
  - `outfit_history.image_key` and `outfit_history.model_image_key`
  - `image_phash` on both tables
- Upload the JPEG produced by `encode_image` (plus a 256 px thumbnail) and model images (already JPEG). Keep writing base64 too until cutover.
- Store a perceptual hash at write time. Today `WardrobeService.check_duplicate_image`, `find_most_similar_wardrobe_item`, `reorder_matches_by_upload_similarity` and `OutfitService.check_duplicate_image` decode every photo on each request; with photos out of Postgres they would have to download the whole wardrobe.
- AI calls: pass a presigned URL to the OpenAI vision API, or read the bytes from the bucket (free).

### 3. API contract and both apps (`Twin UI:`)

- New response fields: `image_url`, `thumbnail_url`, `model_image_url` (presigned, 24 h to 7 days). Keep `image_data` and `model_image` until old builds are gone.
- Web: load from URLs with a fallback to `data:` URLs (`Wardrobe.tsx`, `OutfitHistory.tsx`, `OutfitPreview.tsx`, `RecentLooksSection.tsx`, `outfitItemThumbnail.ts`, …).
- iOS: URL loading with an image cache and a base64 fallback (`HistoryModels.swift`, `WardrobeModels.swift`, `WardrobeListView.swift`, `OutfitItemThumbnail.swift`, …). The watch and widget don't handle base64 photos.
- Cache by photo key or item ID, not by URL (presigned URLs change on every request).
- Uploads keep going through the backend; direct presigned uploads aren't needed at this scale.

### 4. Backfill, cutover and cleanup

- `migrate_photos_to_bucket.py`, in the style of `migrate_slim_outfit_history.py`:
  - `--dry-run`; safe to re-run and resume.
  - Upload, set the key, read back to verify, clear base64, `VACUUM FULL`.
  - Rows with `image_from_wardrobe` reuse the wardrobe item's key.
- Stop returning base64 once old app builds are gone, then drop `image_data` and `model_image`.
- Deletion: a periodic orphan-sweep script (keys can be shared), plus a prefix delete on account deletion.

---

## Tests (when implemented)

- Backend: a fake storage backend; key and dedupe behavior; presigned fields in responses; base64 fallback while `PHOTO_STORAGE=db`; backfill script (dry run, resume, verify); account deletion removes the user's prefix; phash-based duplicate and similarity checks without loading photos.
- Web and iOS: render from the URL, fall back to base64, cache by key.

---

## Out of scope

- CDN or custom image domain
- Direct client uploads to the bucket
