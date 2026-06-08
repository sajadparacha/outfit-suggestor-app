# Feature Spec: Persuasive Authentication UX

**Branch:** `feature/multiagent-ui-ux-enhancements`  
**Slug:** `auth-ux-persuasive-login`  
**Status:** done

---

## User story

Anonymous users can still generate outfits. Login prompts should appear at **moments of value** with contextual, persuasive copy—not generic access-denial walls.

---

## Principles (keep)

- Optional auth: guests can generate outfits on `/` (Suggest).
- Modal/sheet login keeps users in context (no full-page redirect away from task).
- Login required only for persistence features (history, wardrobe, favorites, insights).

---

## Contextual copy (both platforms — use verbatim)

| Context key | Headline | Subheadline (optional) | Primary CTA |
|-------------|----------|------------------------|-------------|
| `first-outfit` | Save this outfit and build your wardrobe. | Create a free account to keep every look you love. | Create account |
| `like` | Sign in to save favorites. | Your liked outfits stay with you across devices. | Sign in |
| `history` | Create an account to keep your outfit history. | Every suggestion you generate will be saved automatically. | Create account |
| `wardrobe` | Upload your clothes once and get unlimited combinations. | Build a digital closet and get wardrobe-aware suggestions. | Create account |
| `insights` | See what your wardrobe is missing. | Sign in to run gap analysis on your saved items. | Sign in |
| `settings` | Manage your account and preferences. | Sign in to sync wardrobe, history, and settings. | Sign in |

Default modal title when no context: keep existing "Sign in to your account".

---

## Trigger moments

### 1. After first good outfit result (guest only)

- **When:** First successful suggestion for an unauthenticated user (one-time per device).
- **Web:** Dismissible banner/card below `OutfitPreview` on main route; buttons open login/register modal with `first-outfit` context.
- **iOS:** Dismissible banner on `MainFlowView` after first suggestion; sheet for login/register.
- **Persist:** `localStorage` (web) / `@AppStorage` (iOS) flag so it does not repeat.

### 2. Like button (guest only)

- **Web:** Add **Like** action on result UI (`OutfitPreview` or result actions). Guest tap → login modal with `like` context. Authed → existing success toast (no backend favorites API required).
- **iOS:** Wire `onLike` in `MainFlowView` / `OutfitSuggestionView`; guest → auth sheet with `like` copy.

### 3. History access (guest)

- **Web:** Replace generic `/history` wall with `AuthGateCard` using `history` copy. CTA opens modal (Create account default).
- **iOS:** Update `GuestTabPlaceholderView` on Looks tab with `history` copy; primary "Create account", secondary "Sign in".

### 4. Wardrobe access (guest)

- **Web:** Replace silent redirect to `/` + generic login with persuasive flow: show gate or modal with `wardrobe` copy when guest hits `/wardrobe` or wardrobe nav.
- **iOS:** Update Wardrobe tab placeholder with `wardrobe` copy.

### 5. Other gates (if touched)

- Insights / Settings: use `insights` / `settings` copy instead of "Please log in…".

---

## Web implementation notes

- Add `frontend/src/utils/authPromptCopy.ts` — context keys + copy.
- Add `frontend/src/views/components/AuthGateCard.tsx` — glass card with headline, subheadline, Create account + Sign in buttons.
- Extend `Login.tsx` (and register flow in `App.tsx` modal) to accept optional `headline` / `subheadline` from context.
- `App.tsx`: `loginPromptContext` state passed into modal; helper `openAuthPrompt(context)`.
- Do **not** block anonymous Suggest flow.

---

## iOS implementation notes

- Add `ios-client/OutfitSuggestor/Utils/AuthPromptCopy.swift` — mirror web keys/copy.
- Enhance `GuestTabPlaceholderView`: headline + message + primary Create account + secondary Sign in.
- Add guest auth sheet (or reuse `LoginView`/`RegisterView` in sheet) with contextual title from `AuthPromptCopy`.
- `MainFlowView`: post-first-suggestion banner + like handler for guests.

---

## API and contract

- [x] No backend changes.

---

## Tests

- Web: update/add tests for auth gate copy and guest Like → modal trigger (mock auth).
- iOS: optional if no existing auth UI tests.

---

## Parity checklist

- [x] Same contextual copy at four moments (+ insights/settings on web)
- [x] Guests can still generate outfits without login
- [x] Modal/sheet auth (not full-page wall for Suggest)
- [x] First-outfit prompt shows once per device
