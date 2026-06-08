# Feature Spec: Guest AI Call Limit (3 free tries)

**Branch:** `feature/multiagent-ui-ux-enhancements`  
**Slug:** `guest-ai-call-limit`  
**Status:** done

---

## User story

Guests can try the app with **3 free AI outfit suggestions**. After that, they must **sign up** to continue using the application.

Authenticated users: **unlimited** (no guest limit).

---

## Business rules

| Rule | Value |
|------|-------|
| Guest AI limit | **3** successful outfit AI generations |
| Counted endpoint | `POST /api/suggest-outfit` only (main photo → outfit flow) |
| Not counted | Duplicate check, history, wardrobe, insights, wardrobe-item suggest (auth-required) |
| Enforcement | **Backend** (clients are UX only) |
| Guest identity | `X-Guest-Session-Id` header (UUID v4), persisted per device |

---

## API contract

### Request header (guests only)

```
X-Guest-Session-Id: <uuid>
```

Required on `POST /api/suggest-outfit` when no `Authorization` header.

### `GET /api/guest-usage`

No auth. Requires `X-Guest-Session-Id`.

Response:
```json
{
  "limit": 3,
  "used": 1,
  "remaining": 2,
  "requires_signup": false
}
```

### Limit exceeded — `POST /api/suggest-outfit`

HTTP **403**:
```json
{
  "detail": "You've used your 3 free AI outfit suggestions. Create an account to keep using the app.",
  "code": "guest_limit_reached"
}
```

---

## UX copy (both platforms — verbatim)

| State | Copy |
|-------|------|
| Remaining hint (optional) | `{{remaining}} of 3 free AI suggestions left` |
| Limit reached (blocking) | **You've used your 3 free AI outfit suggestions. Create an account to keep using the app.** |
| Primary CTA | **Create account** |
| Secondary CTA | **Sign in** |

When `requires_signup` / limit reached:
- Disable Generate / Get AI Suggestion buttons for guests
- Show blocking card or modal with copy above + auth CTAs
- Do not allow further AI calls until signed in

---

## Web scope

- `guestSession.ts` — get/create UUID in `localStorage` (`guest_session_id`)
- `ApiService` — attach `X-Guest-Session-Id` when unauthenticated; `getGuestUsage()`; parse `guest_limit_reached`
- `useOutfitController` / `App.tsx` — track `guestRemaining`, handle 403, disable generate when 0
- UI: subtle remaining counter on Suggest for guests; `GuestLimitReachedCard` or reuse `AuthGateCard` with limit copy

---

## iOS scope

- `GuestSession.swift` — UUID in `UserDefaults`
- `APIService` — header when guest; `getGuestUsage()`; handle 403
- `OutfitViewModel` + `MainFlowView` — remaining count, disable generate, signup sheet at limit

---

## Parity checklist

- [x] Backend enforces 3-call limit
- [x] Same copy on web and iOS
- [x] Guest session header on both clients
- [x] Generate disabled after limit for guests
- [x] Auth users unaffected
