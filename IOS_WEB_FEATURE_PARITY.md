# iOS–Web Feature Parity

This document tracks feature parity between the **web app** and the **iOS app** so both offer the same functionality. Use it as a checklist when implementing or syncing features.

**Branch**: `feature/main-page-ui-improvements`

---

## Summary

| Area | Web | iOS | Notes |
|------|-----|-----|--------|
| **Auth** | ✅ | ✅ | Register, login, logout, change password (Settings) |
| **Main flow simplified UX** | ✅ | ✅ | Shared contract `docs/main-flow-ux-contract.md`; creation → result; 3 actions (Generate Another, Save Look, Refine); advanced options input-side only |
| **Random picks thumbnails + input sync** | ✅ | ✅ | Item card thumbs from `matching_wardrobe_items`; left preview replaces stale upload; wardrobe-only **checkbox** (not switch) |
| **Random pick result: regenerate + upload** | ✅ | ✅ | Compact result shows upload new item + Generate Another; shared `mainFlowResultRegenerate` / `MainFlowResultRegenerateLogic` |
| **Preferences layout** | ✅ | ✅ | Occasion, season, style, notes; **Use my wardrobe only** last (auth); Colors removed from UI |
| **Get suggestion (photo)** | ✅ | ✅ | Upload image → AI suggestion |
| **Filters / preference text** | ✅ | ✅ | Occasion, season, style use shared recommended option vocabulary; free text |
| **Wardrobe-only mode** | ✅ | ✅ | Toggle when logged in (Main flow) |
| **Model image generation** | ✅ | ✅ | Toggle + model picker (DALL-E 3, Stable Diffusion, Nano Banana); full-screen view |
| **Wardrobe** | ✅ | ✅ | List, add, edit, delete, category filter (core chips: shirt/trouser/blazer/shoes/belt + extended chips when owned: polo, T-shirt, jeans, shorts, sweater, jacket, coat, tie, other), human-readable category badges, search, "Get suggestion" from item, select 1-5 items (one per slot) to complete outfit with AI; **completion panel shows clickable selection thumbnails** (tap to full-screen) beside Complete outfit with AI; completion slots: polo/T-shirt→shirt, pants/jeans/shorts→trouser, jacket/coat→**outerwear**, sweater→**sweater**, plus blazer/shoes/belt; **upper-body exclusivity** (only one of blazer, outerwear, sweater); max 5 items total; **blazer filter chip counts blazer/suit only** (jacket/coat have extended chips); inline **Preferences** (occasion/season/style/notes + wardrobe-only) synced with Suggest |
| **Outfit history** | ✅ | ✅ | List, search, sort (newest/oldest), delete, load into main view |
| **Random from wardrobe** | ✅ | ✅ | AI via `POST /api/suggest-outfit-from-wardrobe`; session variety (`previous_outfit_text`, fingerprint retry). `GET /api/wardrobe/random-outfit` legacy/non-user-facing. |
| **Random from history** | ✅ | ✅ | Button on Main; client picks from history; **Your inputs** syncs preview + **From history** caption + entry filters |
| **Duplicate detection** | ✅ | ✅ | Check before suggestion; use cached or force new |
| **Next / Alternate outfit** | ✅ | ✅ | Button after suggestion; requests a different outfit |
| **Wardrobe Insights** | ✅ | ✅ | Premium summary-first redesign: gap score + label, top 3 priorities, **Top items to add** cards (tap **Best colors** → Google Shopping; **Shop similar** per item), **Shopping list** (collapsed by default; Buy / Look for / Search online; priority badges; **canonical category labels** via `cleanShoppingItemLabel`—dedupes AI junk names, prefers taxonomy label when name mismatches), per style+color Google Shopping chips + Search all using **`men's` + category phrase** queries (e.g. men's sweater, men's jacket, men's tie; gender prefix hardcoded this iteration—future `REACT_APP_SHOPPING_GENDER` / `AppConfig` documented in spec), Copy list; WhatsApp/PDF export), **Wardrobe coverage** dashboard (7 core clothing categories—shirt, trouser, blazer, sweater, jacket, shoes, belt—plus **tie** when occasion is business/formal/office; then Colors + Styles aggregates), collapsible **Detailed category analysis** with owned/missing color & style counts, quick tip; **jacket wardrobe items count under jacket row, not blazer**; no outfit-generation CTAs from insights; preferences collapse to context bar after analysis; admin/debug gated; modes **Quick Wardrobe Check** (free) and **AI Stylist Review** (premium) in expanded preferences |
| **User Guide** | ✅ | ✅ | In-app documentation with feature walkthroughs |
| **Integration Tests (Admin)** | ✅ | ✅ | Admin-only test runner (list/run/run-all) |
| **Settings** | ✅ | ✅ | Change password, account info, logout |
| **About** | ✅ | ✅ | App info, links |
| **Admin UX gating** | ✅ | ✅ | Non-admins never see prompts/cost/diagnostics/model selector/reports/tests; Guide/About admin sections hidden; web admin routes redirect silently |
| **60s first-run coach (Phase A)** | ✅ | ✅ | 3-step coach strip, collapsed optional preferences, empty-preview directional copy; `first_run_coach_dismissed` persistence |
| **Guest limit auth UX** | ✅ | ✅ | At 3/3 free tries: single auth surface on Suggest; nav Sign Up/Login hidden; no duplicate CTAs |
| **Logout clears main flow** | ✅ | ✅ | Logout resets image, result, prefs on Suggest |
| **Admin Reports** | ✅ | ✅ | Four tabs (Overview, Utilization, Users, Searches); timeline + search APIs; Recharts (web) / Swift Charts (iOS); city filter web-only |
| **Week Outfit Planner** | ✅ | ✅ | Route `/week`; Mon–Sun day toggles + occasions; shared style; reminder time + timezone; generate week / regenerate day (wardrobe-aware, persisted); Today surface; login required; **daily wake-up reminders iOS-first** (local notifications); web shows Today in-app (no OS push required for v1) |

---

## 1. Authentication

**Web**: Register, login, logout, change password, email activation (optional), JWT in localStorage.

**iOS status**: Not implemented.

**API endpoints** (see API_DOCUMENTATION.md):

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `GET /api/auth/activate/{token}`

**iOS work**:

- [ ] Add auth service (login, register, logout, me, change password).
- [ ] Store JWT securely (e.g. Keychain).
- [ ] Add Login / Register / Settings (change password) screens.
- [ ] Send `Authorization: Bearer <token>` on requests that require auth.

---

## 2. Get Outfit Suggestion (Photo Upload)

**Shared UX contract**: `docs/main-flow-ux-contract.md` + `mainFlowUxCopy.ts` / `MainFlowUxCopy.swift`

**Flow (both platforms)**:
1. **Creation** — upload, preferences (occasion/season/style/notes), **Generate Outfit** CTA; wardrobe / random picks / advanced options collapsed on input side
2. **Result** — styled look hero (model image or placeholder, not upload repeat), context line (`Style · Season`), simplified item cards with source tags, optional **Also wear** collapsible section (sweater / outerwear / tie when API returns them — not part of core five), **Why this works** bullets
3. **Actions** — **Generate Another Look**, **Save Look**, **Refine** (formal / casual / wardrobe-only / change occasion inside menu)
4. **Layout** — side-by-side on wide viewports: creation = input column \| empty preview; result = compact input \| styled look; sticky bottom actions on result (no inline primary actions in result panel on wide). Web uses `md:` (768px) two-column grid aligned with iPad regular width; max content width 980px; shared `mainFlowLayoutLogic.ts` / `MainFlowLayoutLogic.swift`. iPhone / mobile web stay single-column stacked with scroll-to-result.

**Web**: Upload image (drag/drop or pick), optional preference text, occasion/season/style filters, **Generate Outfit**, loading state, display result. Optional: generate model image (advanced, input side).

**iOS**: Same flow in `MainFlowView` + `OutfitSuggestionView`; sticky bottom Save Look + Generate Another on result.

**iOS status**: Implemented (image + text/filters → suggestion). Missing: auth header, wardrobe-only flag, model image option.

**API**: `POST /api/suggest-outfit`

**Body (multipart)**:

- `image` (required)
- `text_input` (optional)
- `generate_model_image` (optional bool)
- `image_model` (optional: "dalle3", "stable-diffusion", "nano-banana")
- `use_wardrobe_only` (optional bool, requires auth)

**Response (optional layers, main suggest flow only)**: nullable `sweater`, `outerwear`, `tie` plus `sweater_id`, `outerwear_id`, `tie_id` for wardrobe thumbnails. Wardrobe **complete-outfit** multi-select also accepts jacket/coat (`outerwear_id`) and sweater (`sweater_id`) with upper-body exclusivity vs blazer; max 5 items total.

**iOS work**:

- [ ] Add `Authorization` header when user is logged in.
- [ ] Add optional “Use wardrobe only” toggle (when logged in).
- [ ] Optionally add “Generate model image” and model picker; handle `model_image` in response and display.

---

## 3. Wardrobe-Only Mode

**Web**: Sidebar toggle “Use my wardrobe only”. When on, suggestion request sends `use_wardrobe_only=true`; backend suggests only from user’s wardrobe items.

**iOS status**: Not implemented.

**iOS work**:

- [ ] Add toggle in suggestion screen (visible when logged in).
- [ ] Send `use_wardrobe_only` in `POST /api/suggest-outfit`.

---

## 4. Wardrobe Management

**Web**: List wardrobe items, add (with optional AI analysis), edit, delete, filter by category (core chips always visible; extended chips—polo, T-shirt, jeans, shorts, sweater, jacket, coat, tie, other—when items exist), human-readable category badges on cards, get suggestion from a single item, select 1-5 eligible items across unique outfit slots (shirt, trouser, blazer, outerwear, sweater, shoes, belt—only one of blazer/outerwear/sweater) and complete the outfit with AI. Duplicate check before add. Full-screen image view.

**Wardrobe item card actions (web + iOS)**: Primary **Style this item** + overflow menu (View image, Edit, **Past Suggestions**, Delete). Past Suggestions opens per-item outfit history modal/sheet.

**iOS status**: Full parity. List, add (with "Analyze with AI" and duplicate check), edit, delete, category filter (core + extended chips when owned), human-readable category badges, "Get suggestion" from item, multi-select complete outfit with AI (jacket/coat→outerwear, sweater slot, upper-body exclusivity); history has full-screen image viewer.

**API endpoints**:

- `GET /api/wardrobe` (paginated, optional category filter)
- `POST /api/wardrobe` (add item; optional AI analysis)
- `GET /api/wardrobe/{id}`, `PUT /api/wardrobe/{id}`, `DELETE /api/wardrobe/{id}`
- `GET /api/wardrobe/summary`
- `POST /api/wardrobe/check-duplicate`
- `POST /api/wardrobe/analyze-image`
- `POST /api/suggest-outfit-from-wardrobe-item/{item_id}`
- `POST /api/suggest-outfit-from-wardrobe` with optional `selected_wardrobe_item_ids`

**iOS work** (remaining, optional):

- [ ] Filter list by category (UI).
- [ ] Add-item: optional duplicate check, optional AI analyze before form.
- [ ] “Get AI Suggestion” from a wardrobe item → call suggest-outfit-from-wardrobe-item, show result in suggestion view.

---

## 5. Outfit History

**Web**: Tab “History”. List past suggestions (with search). Delete entry. Load a cached suggestion into main view. Full-screen image for uploaded/model images.

**iOS status**: Not implemented.

**API**: `GET /api/outfit-history` (optional limit/offset), `DELETE /api/outfit-history/{id}` (if supported).

**iOS work**:

- [ ] Add history API calls (list, delete if available).
- [ ] History list screen with search.
- [ ] Delete action per entry.
- [ ] “Load” action: put entry back into main suggestion view (same shape as current suggestion).
- [ ] Full-screen image viewer for history images.

---

## 6. Random from Wardrobe

**Web & iOS**: Sidebar / Main **Random from Wardrobe** (auth required). Both call **`POST /api/suggest-outfit-from-wardrobe`** with occasion, season, style, and notes from Preferences — AI combines items from the user’s wardrobe (no photo upload). Loading copy: **“Scanning your wardrobe…”**. Result caption: **“Random from wardrobe”**; **Generate Another** re-calls the same AI endpoint.

**Session variety** (`wardrobe-random-ai-variety`): fingerprint each result (text fields + wardrobe IDs); pass `previous_outfit_text` when user already has a wardrobe-random result; track last 5 session fingerprints; retry up to 3 times on duplicate with stronger avoid wording; optional `avoid_outfit_texts` in API body. Reset session on logout, main-flow reset, and filter change.

**Legacy**: `GET /api/wardrobe/random-outfit` (DB `random.choice` per slot) — not used by user-facing flows; may remain for tests/admin.

**API**: `POST /api/suggest-outfit-from-wardrobe` with empty `selected_wardrobe_item_ids` for random; optional `previous_outfit_text`, `avoid_outfit_texts`.

**Parity**: ✅ Both platforms use AI endpoint + session variety helpers (`wardrobeRandomSession.ts` / `WardrobeRandomSession.swift`).

---

## 7. Random from History

**Web**: Sidebar “Random from History”. Client refetches history on each pick (limit ~150), deduplicates by outfit fingerprint, excludes the current look and last 5 session picks, rotates through a shuffled session deck, maps chosen entry to suggestion format, shows in main view.

**iOS**: Same flow on Main (refetch limit ~100 per pick).

**Diverse random selection** (`random-history-diverse-selection`): both platforms use the same client-side rules — fingerprint dedupe (core items + optional layers + wardrobe IDs), exclude current history id when already showing a history/random result, session recent-N avoidance with relaxed fallbacks, shuffle-deck rotation per session (reset on logout / main-flow reset). Optional once-per-session info toast when only one unique look remains after dedupe.

**Input panel sync** (`random-history-input-summary-sync`): clear stale upload/wardrobe preview; compact **Your inputs** shows entry preview, **From history** caption, and `summaryFilters` from entry occasion/season/style; wardrobe banner hidden in compact result mode.

**API**: `GET /api/outfit-history` (fresh fetch per random pick; no dedicated random endpoint).

---

## 8. Model Image Generation

**Web**: Optional “Generate model image” with model choice (DALL-E 3, etc.). Response includes `model_image` (base64). Display and full-screen view.

**iOS status**: Not implemented.

**iOS work**:

- [ ] Add optional “Generate model image” toggle and model picker.
- [ ] Send `generate_model_image` and `image_model` in suggest-outfit.
- [ ] Decode and show `model_image` in suggestion view; full-screen on tap.

---

## 9. Settings

**Web**: Change password, account info (e.g. email). Settings tab when logged in.

**iOS status**: Not implemented.

**iOS work**:

- [ ] Settings screen (when logged in): change password (call `POST /api/auth/change-password`), show email/account info from `GET /api/auth/me`.

---

## 10. About

**Web**: About tab with app description, features, links, tech stack.

**iOS status**: Not implemented.

**iOS work**:

- [ ] About screen (static content or simple web view) with same info as web About page.

---

## 11. Admin Reports

**Web**: Admin-only Reports tab with four sections — **Overview**, **Utilization**, **Users**, **Searches**. Shared filters (date range, user, country, **city**, operation type, endpoint). Recharts line/bar charts; timeline from `GET /api/access-logs/timeline`; search aggregates from `GET /api/reports/searches`. Network/CORS failures show friendly banner (not raw `Failed to fetch`); backend CORS allows `localhost:3000`, `127.0.0.1:3000`, `closiq.me`, `www.closiq.me`.

**iOS status**: **Implemented** — same four tabs, shared filters (no **city** filter — web-only), Swift Charts where practical, same APIs; network errors use same friendly copy as web via `ReportsErrorFormatter`.

**API**: `/api/access-logs/` (list), `/stats`, `/usage`, `/timeline`; `/api/reports/searches` (outfit_history occasion/season/style aggregates).

**Parity gaps**:

- [ ] **City filter** — web only (by design).
- [x] Tabbed layout and copy match.
- [x] Network/CORS error copy matches (friendly message, not raw `Failed to fetch`).

---

## 12. Shared / UX

- **Error handling**: Show API errors in a consistent way (e.g. alert or inline message).
- **Loading states**: Skeleton or spinner for all async operations.
- **Offline**: Web does not require offline; iOS can add later (e.g. cache last suggestion).
- **Deep links**: Optional; not required for parity.

---

## Implementation Order (Suggested)

1. **Auth** – Required for wardrobe, history, random, settings.
2. **Wardrobe** – List, add, edit, delete, get suggestion from item.
3. **Outfit history** – List, search, delete, load cached.
4. **Random from wardrobe** – One API call + reuse suggestion UI.
5. **Random from history** – Fetch history, pick random, map to suggestion UI.
6. **Wardrobe-only toggle** – One flag on suggest-outfit.
7. **Model image** – Optional; add params and image display.
8. **Settings** – Change password, account.
9. **About** – Static screen.
10. **Admin reports** – If needed on iOS.

---

## Backend URL and Auth

- **iOS**: Configure base URL in `APIService` (or config). Use HTTPS in production.
- **Auth**: After login, store JWT and send `Authorization: Bearer <token>` on every request that requires auth (suggest-outfit with wardrobe_only, wardrobe, history, etc.).

---

## References

- [README.md](./README.md) – Project and features overview
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) – Full API reference
- [USER_GUIDE.md](./USER_GUIDE.md) – End-user flows (web)
- [ios-client/README.md](./ios-client/README.md) – Current iOS setup

---

**Last updated**: February 2026 (branch `feature/ios-web-sync`).
