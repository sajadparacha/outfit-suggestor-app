# Feature Spec: Admin Reports fetch error fix

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `admin-reports-fetch-error-fix`  
**Status:** in-progress

---

## User story

As an admin, when I open Admin Reports and click Search, I should see report data or a clear error — not the cryptic browser message **"Failed to fetch"**.

---

## Root cause

- Browser `fetch()` surfaces network/CORS failures as `TypeError: Failed to fetch`.
- CORS `ALLOWED_ORIGINS` omits common dev/prod origins:
  - `http://127.0.0.1:3000` (local dev via IP)
  - `https://www.closiq.me` (production www subdomain)
- Admin Reports calls four endpoints in parallel; any network failure fails the whole search and shows the raw message.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Admin Reports error banner | `frontend/src/views/components/AdminReports.tsx` | `ios-client/OutfitSuggestor/Views/ReportsView.swift` | Friendly copy on network/CORS failures |
| API error helper | `frontend/src/utils/apiErrorMessage.ts` (new) | `ReportsViewModel.swift` or shared helper | Map `Failed to fetch` / `URLError` |

### Flow

1. Admin opens Reports, sets filters, taps Search.
2. If API unreachable or CORS blocked → show actionable error banner (not raw `Failed to fetch`).
3. If API returns HTTP error → show server `detail` (existing behavior).
4. If all succeed → tabs/charts load (unchanged).

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Network/CORS error | Dismissible banner | **Web/iOS:** `Can't reach the API. Make sure the backend is running and open the app at http://localhost:3000 (not 127.0.0.1).` when `Failed to fetch` / connection errors; otherwise keep server message |
| HTTP 401/403 | Banner | Server detail (e.g. session expired) |
| Success | Unchanged | — |

---

## API and contract

### Backend changes needed?

- [x] Yes — expand default `ALLOWED_ORIGINS` in `backend/config.py`

### Endpoints

No API shape changes.

---

## User-facing docs (About & Guide)

- [x] **No** — error-handling only; no Guide/About updates

---

## Tests (required)

### Backend (orchestrator)

- [ ] Test file: `backend/tests/test_cors_origins.py`
- [ ] Cases:
  - OPTIONS preflight succeeds for `http://127.0.0.1:3000`
  - OPTIONS preflight succeeds for `https://www.closiq.me`

### Web (web agent)

- [ ] Unit: `frontend/src/utils/apiErrorMessage.test.ts`
- [ ] Update: `frontend/src/views/components/AdminReports.test.tsx`
- [ ] Cases:
  - `formatApiErrorMessage('Failed to fetch')` returns friendly copy
  - AdminReports Search shows friendly banner when API mock rejects with `Failed to fetch`
  - Add `REACT_APP_API_URL=http://localhost:8001` to `.env.development`

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/ReportsViewModelTests.swift` (extend)
- [ ] Cases:
  - Network error maps to friendly message (not raw `Failed to fetch` / URLError description)

---

## Parity checklist

- [ ] Same friendly network-error copy on web and iOS
- [ ] CORS allows 127.0.0.1 and www.closiq.me
- [ ] New-behavior tests added (web + iOS + backend)
- [ ] Full suite pass after user confirms

---

## Out of scope

- Partial success when only one of four report endpoints fails
- About/Guide updates
