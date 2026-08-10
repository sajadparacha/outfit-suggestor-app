# Feature Spec: Google + Apple OAuth (Cost Twin UI)

**Branch:** `oauth-google-apple`  
**Slug:** `oauth-google-apple`  
**Status:** done  
**Mode:** Cost Twin UI (narrow scope; targeted tests; no full-suite gate unless asked)

---

## Goal

Users can sign in with **Google** or **Sign in with Apple** next to existing email/password. After OAuth, clients store the same JWT (`auth_token` / AuthService) as password login. **Skip Facebook.**

---

## API

`POST /api/auth/oauth`

```json
{ "provider": "google" | "apple", "id_token": "<provider JWT>" }
```

Response: same `Token` shape as `/api/auth/login` (`access_token`, `token_type`, `user`).

**Rules:** verify token → match `provider`+`provider_user_id` → else link by email → else create user (`hashed_password` null, `email_verified` true).

**Env:** `GOOGLE_CLIENT_IDS`, `APPLE_CLIENT_IDS` (comma-separated audience allowlists).

---

## Files (agents — read only these + their tests)

| Layer | Paths |
|-------|--------|
| Web | `frontend/src/controllers/useAuthController.ts`, `frontend/src/services/ApiService.ts`, auth modal in `frontend/src/App.tsx` (or extracted auth components), `frontend/src/models/` auth types, **one** auth test file |
| iOS | `AuthService.swift`, `GuestAuthSheetView.swift`, login/register views under `Views/`, auth models, **one** Auth test file |
| Docs | Update About (+ Guide if it describes how to sign in) — Google/Apple mentioned |

---

## UX (both platforms)

- On login (and register if same sheet): secondary row of buttons **Continue with Google** and **Continue with Apple** below email/password.
- Same labels/order on web and iOS.
- Loading/disabled while OAuth in flight; surface provider/API errors.
- iPhone/iPad: identical UX; layout-only size-class tweaks OK.

### About / Guide

- **Yes** — About (and Guide if sign-in steps exist) should mention Google and Apple sign-in.

---

## Tests (required)

### Backend (orchestrator)

- [x] OAuth create new user → Token
- [x] OAuth link existing email user
- [x] Invalid/unsupported provider → 4xx
- [x] Bad token → 401

### Web (one test file max)

- [x] Google/Apple controls visible on auth UI
- [x] Successful oauth API stores token / sets authenticated like login

### iOS (one test file max)

- [x] OAuth request/response wiring or AuthService oauth method
- [x] Buttons/labels present (unit or view model level)

---

## Out of scope

- Facebook
- Replacing email/password
- Full web/iOS suite runs (Cost Twin UI)

## Follow-up completed (gaps)

- [x] Sign in with Apple entitlements
- [x] GoogleSignIn SPM + `GoogleSignInProvider` wiring + URL handler
- [x] Env docs: `backend/.env.example`, `frontend/.env.example`, `OAuth.xcconfig`
- [ ] Fill real client IDs in Google Cloud / Apple Developer (operator step)
