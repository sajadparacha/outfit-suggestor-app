# Feature Spec: Guest Limit — Single Auth CTA Surface

**Branch:** `feature/ui-ux-final-touches`  
**Slug:** `guest-limit-auth-ux`  
**Status:** done — agent tests pass

---

## User story

As a guest who used all 3 free suggestions, I want **one clear place** to sign up or sign in — not duplicate Login/Sign Up in the nav **and** Create account/Sign in on the page.

---

## Problem

When `guestLimitReached` on Suggest:
- NavBar shows Sign Up + Login
- `AuthGateCard` shows Create account + Sign in
Same actions, redundant, inconsistent labels.

---

## Expected behavior

When `guestLimitReached` on main Suggest route:

1. **NavBar:** Hide Sign Up / Login buttons (keep logo, nav links, Guide).
2. **Main content:** Show **only** centered `AuthGateCard` (`guest-limit` context) — hide Sidebar, OutfitPreview, HowItWorks, RecentLooks.
3. **Copy:** Card buttons stay **Create account** (primary) and **Sign in** (secondary) per `authPromptCopy.ts`.
4. Other routes (Wardrobe, History, Insights) unchanged — they already use `AuthGateCard` without nav duplication issue on gated tabs (nav auth still ok there OR hide nav auth on any guest-limit state — prefer hide nav auth whenever `guestLimitReached` globally for guests).

**Global rule for guests at limit:** If `!isAuthenticated && guestRemaining === 0`, hide NavBar auth buttons on **all** routes (card on each gated view already has CTAs; main has dedicated card).

---

## Screens

| Area | Web | iOS |
|------|-----|-----|
| Nav auth hide | `NavBar.tsx` — prop `hideGuestAuthActions` | Profile tab / header if any duplicate |
| Main suggest gate | `App.tsx` main route | `MainFlowView.swift` — full-screen limit state |
| Copy | `authPromptCopy.ts` — already correct | `AuthPromptCopy` — match |

### iOS MainFlowView when guest blocked

- Show **only** `guestLimitReachedCard` (existing) in creation + result paths
- Hide upload, preferences, generate, preview content below
- No duplicate auth in tab bar area (guest limit card is sole CTA on Suggest)

---

## API

- [x] No backend changes

---

## Tests (required)

### Web
- [ ] NavBar hides auth buttons when `hideGuestAuthActions` / guest limit
- [ ] Main route renders only AuthGateCard when guest limit (no Sidebar upload UI)
- [ ] `npm test -- --watchAll=false`

### iOS
- [ ] Guest limit shows single card; creation UI hidden
- [ ] Build + test updates

---

## Out of scope

- Changing guest limit count or backend
- Auto-opening auth modal
