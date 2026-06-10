# Feature Spec: Enhanced Admin Reports

**Branch:** `feature/admin-reports`  
**Slug:** `admin-reports-enhanced`  
**Status:** done

---

## User story

As an admin, I want tabbed reports (Overview, Utilization, Users, Searches) with charts and filters so I can understand traffic, usage, user activity, and outfit-search patterns over time.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Admin Reports shell | `frontend/src/views/components/AdminReports.tsx` | `ios-client/OutfitSuggestor/Views/ReportsView.swift` | Tab bar: Overview, Utilization, Users, Searches |
| Shared filters | Same | Same | start/end date; web adds **city** filter |
| Overview tab | AdminReports | ReportsView | KPI cards + timeline line chart (`GET /api/access-logs/timeline`) |
| Utilization tab | AdminReports | ReportsView | Usage breakdown + bar charts from `/usage` |
| Users tab | AdminReports | ReportsView | Top users table + country/city bar charts from `/stats` |
| Searches tab | AdminReports | ReportsView | Search aggregates from `GET /api/reports/searches` |

### Flow

1. Admin opens Reports (web tab or iOS Reports screen).
2. Sets date range (+ city on web); taps Search / Load reports.
3. Switches tabs; each tab loads relevant data (can share filter state).
4. Charts render from API data; empty/error states shown per tab.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading | Disable Search; show spinner/skeleton | "Searching…" / ProgressView |
| Empty (no search yet) | Prompt to search | "Ready when you are. Set your filters above, then click Search to load reports." |
| Empty (no data) | Per-tab empty message | "No data for the selected filters." |
| Error | Banner with dismiss | API error message |
| Success | Tab content + charts | — |
| Non-admin | Gate entire screen | "Admin privileges are required to view reports." |

---

## Visual / UX

- Dark slate glass cards; brand gradient accents (`#4facfe` → `#c471ed`).
- **Web:** horizontal tab buttons under header; Recharts line chart (timeline) and bar charts (usage, geo, searches).
- **iOS:** segmented `Picker` or tab-style control for same four tabs; Swift Charts where practical (line + bar); fallback to summary lists if chart data empty.
- Filters persist across tab switches until Clear.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical tabs, copy, filters, actions.
- Layout-only: `AppTheme.adaptiveContent` width cap on regular horizontal size class.

| Device | Expected difference |
|--------|---------------------|
| iPhone (compact) | Full-width tabs and charts |
| iPad (regular) | Same UI; optional wider chart height / spacing |

---

## API and contract

### Backend changes needed?

- [x] Yes — see below (orchestrator implements before UI agents)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/access-logs/timeline` | Time-series request counts (`group_by`: hour/day/week; filters: start_date, end_date, **city**, country) |
| GET | `/api/access-logs/stats` | Aggregates (existing) |
| GET | `/api/access-logs/usage` | Usage breakdown (existing) |
| GET | `/api/access-logs/` | Log list (existing; city filter supported) |
| GET | `/api/reports/searches` | Outfit search report: filters + aggregates from `outfit_history` |

#### `GET /api/reports/searches` (admin-only)

Query params: `start_date`, `end_date`, `occasion`, `season`, `style`, `user_id`

Response shape:

```json
{
  "total_searches": 42,
  "by_occasion": [{"occasion": "business", "count": 10}],
  "by_season": [{"season": "summer", "count": 8}],
  "by_style": [{"style": "modern", "count": 12}],
  "timeline": [{"period": "2026-06-01T00:00:00", "count": 5}],
  "recent": [{"id": 1, "created_at": "...", "occasion": "casual", "season": "all", "style": "modern", "user_id": 2, "user_email": "..."}]
}
```

#### `outfit_history` columns (new)

`occasion`, `season`, `style` — nullable strings; populated on save from wardrobe-only suggestions and optional image-suggest form fields.

### Client contract files to update

**Web**

- [x] `frontend/src/services/ApiService.ts` — `getAccessLogTimeline`, `getSearchReports`; city on existing calls
- [ ] `frontend/package.json` — add `recharts`

**iOS**

- [x] `ios-client/OutfitSuggestor/Services/APIService.swift` — timeline + search reports methods
- [x] `ios-client/OutfitSuggestor/Models/` — response DTOs for timeline + searches

### Shared constants / enums

| Name | Value(s) | Web file | iOS file |
|------|----------|----------|----------|
| Report tabs | overview, utilization, users, searches | AdminReports.tsx | ReportsView.swift |

---

## Platform-specific notes

### Web only

- City filter input in shared filters row.
- Recharts `LineChart`, `BarChart` with dark-theme axis/tooltip styling.

### iOS only

- Swift Charts (`import Charts`) for line/bar where iOS 16+; same data bindings as web.
- No city filter required on iOS (web-only per request); other filters match.

---

## Tests (required)

### Backend (orchestrator)

- [x] Test file: `backend/tests/test_reports_searches.py`, extend `backend/tests/test_access_log_endpoints.py`
- [x] Cases:
  - `/api/reports/searches` admin-only; 401/403 for anon/non-admin
  - Filters by occasion/season/style/date return correct aggregates
  - `/api/access-logs/timeline` returns timeline array; city filter works
  - `save_outfit_history` persists occasion/season/style when provided

### Web (web agent)

- [x] Unit: `frontend/src/views/components/AdminReports.test.tsx`
- [x] Cases:
  - Renders four tabs; switching tabs shows correct section headings
  - Search calls timeline + searches APIs when Searches tab active (or on search)
  - City filter passed to `getAccessLogs` / timeline
  - Non-admin gate unchanged
  - Mock Recharts or assert chart containers render with data

### iOS (iOS agent)

- [x] Unit: `ios-client/OutfitSuggestorTests/ReportsViewModelTests.swift`
- [x] Cases:
  - Tab enum maps to four sections
  - API params for timeline and search reports match spec
  - Non-admin shows error message

### End of Twin UI — confirm, then full suites + report (orchestrator)

| Layer | Command |
|-------|---------|
| Backend | `cd backend && pytest -q` |
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests -only-testing:OutfitSuggestorUITests` |

---

## Parity checklist

- [x] Same four tabs and copy on web and iOS
- [x] Same filter behavior (except city = web-only)
- [x] Equivalent loading / empty / error UI
- [x] API client methods match on both platforms
- [x] `IOS_WEB_FEATURE_PARITY.md` updated
- [x] New-behavior tests added (web + iOS)
- [x] Backend full pytest — PASS (183/183)
- [x] Web full Jest suite — PASS (41 suites, 232 tests)
- [x] iOS full suite — PASS (78 unit + 10 UITest)

---

## Out of scope

- Export CSV / PDF
- Real-time websocket updates
- iOS city filter (web-only per request)
- Changing non-admin Reports visibility in nav
