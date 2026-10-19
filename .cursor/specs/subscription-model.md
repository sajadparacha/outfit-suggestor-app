# Spec: Subscription model (freemium + Premium) — DRAFT

**Status:** Draft for review — no code changes yet
**Branch:** `feature/subscription-model`
**Platforms:** Backend first, then iOS (App Store / StoreKit 2). Web shows usage + limits; web payments (Stripe) later.

## 1. Goal

Make the AI features pay for themselves before the iPhone app ships on the App Store:

- Free tier with monthly limits on AI features, so new users can try the app.
- One **Premium** auto-renewing subscription (monthly + yearly) with generous fair-use limits.
- Backend is the single source of truth for a user's plan and usage; clients never decide access.

Non-AI features (wardrobe CRUD, history, manual Week Planner, reminders, Apple Watch app, random outfit) stay free and unlimited — they drive retention and cost nothing per use.

## 2. Current state (code audit)

| Fact | Where |
|---|---|
| Guests get 3 AI suggestions total, tracked per `X-Guest-Session-Id` | `services/guest_usage_service.py` (`GUEST_AI_LIMIT = 3`), `models/guest_usage.py` |
| Signed-in users have **no** AI limits | — |
| Cost is computed per response (`cost` dict) but **not persisted** | `utils/cost_calculator.py`, `models/outfit.py`, `models/week_plan.py` |
| Access logs record `operation_type` per request, but no cost/tokens | `models/access_log.py` |
| Cost calculator charges a flat $0.01 per vision image (code comment: "simplified") | `utils/cost_calculator.py` |

There is no historical per-feature cost data, so section 3 is an estimate from the code. Phase 1 adds a persisted usage ledger so real costs replace these numbers.

## 3. Estimated cost per AI feature

Prices from `cost_calculator.py`: GPT-4o $2.50 / $10.00 per 1M input / output tokens; DALL-E 3 $0.04 per standard image. GPT-4o-mini $0.15 / $0.60. **Verify against current OpenAI pricing and the OpenAI billing dashboard.**

| Feature (endpoint) | AI calls | Model | Est. cost per use |
|---|---|---|---|
| Outfit suggestion from photo (`POST /api/suggest-outfit`) | 1 vision call, max 1,000 output tokens | GPT-4o | ~$0.010–0.020 |
| Outfit suggestion from wardrobe / text (`/suggest-outfit-from-wardrobe`, `/suggest-outfit-from-wardrobe-item/{id}`) | 1 text call | GPT-4o | ~$0.008–0.015 (grows with wardrobe size) |
| + AI model image (`generate_model_image=true`) | +1 clothing-analysis vision call (max 1,500 tokens) + 1 image | GPT-4o + DALL-E 3 | +~$0.05 (DALL-E 3); much less with nano-banana / Stable Diffusion |
| AI week plan (`POST /api/week-plan/generate`) | 1 text call **per enabled day** (up to 7) | GPT-4o | ~$0.01 per day, ~$0.07–0.10 per full week |
| Wardrobe photo analysis (`POST /api/wardrobe/analyze-image`) | 1 vision call, max 1,000 tokens | GPT-4o (or free Hugging Face if `WARDROBE_AI_MODEL=huggingface`) | ~$0.004–0.008 |
| Fit check / check-before-you-buy (`POST /api/wardrobe/evaluate-fit`) | 1 ranking call, max 1,500 tokens (+ photo analysis for uploads) | GPT-4o-mini (+ GPT-4o vision) | ~$0.001–0.007 |
| Wardrobe gap analysis (`POST /api/wardrobe/analyze-gaps`) | 1 call, max 8,000 output tokens | GPT-4o | ~$0.03–0.06 |

Biggest cost levers: AI model images (DALL-E 3), gap analysis (large output), and full-week generation (7 calls).

## 4. Proposed plans

Limits are **per calendar month** (reset on the 1st, UTC) and **per feature**, so the paywall can say concrete things like "10 outfit ideas a month".

| Feature | Guest (no account) | Free (signed in) | Premium (fair use) |
|---|---|---|---|
| Outfit suggestions (photo, wardrobe, text) | 3 total (unchanged) | 10 / month | 100 / month |
| AI model images | — | — | 20 / month |
| AI week plan generations (one per generate request, any number of days) | — | 1 / month | 8 / month |
| Fit checks | — | 3 / month | 30 / month |
| Wardrobe gap analysis | — | 1 / month | 4 / month |
| Wardrobe photo analysis | — | 20 / month | 150 / month |
| Non-AI features | yes | yes | yes |

**Worst-case AI cost per user per month** (every limit fully used, estimates from section 3): Free ≈ $0.40; Premium ≈ $4.40. Typical users use a fraction of their limits.

**Suggested pricing:** Premium **$5.99 / month** or **$49.99 / year**, 7-day free trial on yearly. With Apple's Small Business Program (15% commission under $1M/year) net is ~$5.09 / month, above Premium's worst-case cost. Revisit after Phase 1 data.

Cheaper alternative to consider: run Free-tier suggestions on GPT-4o-mini (~15x cheaper) and keep GPT-4o for Premium.

## 5. Backend design

### Data

- `user_entitlements` — `user_id`, `plan` (`free` | `premium`), `source` (`app_store` | `stripe` | `admin`), `product_id`, `original_transaction_id`, `expires_at`, `status` (`active` | `grace_period` | `billing_retry` | `expired` | `revoked`), `auto_renew`, timestamps. Source-agnostic so Stripe plugs in later.
- `ai_usage_events` — `user_id` or `guest_session_id`, `feature` (`suggestion` | `model_image` | `week_plan` | `fit_check` | `gap_analysis` | `wardrobe_analysis`), `cost_usd`, `input_tokens`, `output_tokens`, `model`, `created_at`. Monthly counts are derived from this ledger; it also gives real cost per feature.

### Enforcement

- One `UsageService.check_and_reserve(user, feature)` called at the top of each AI endpoint; returns **HTTP 402** with `{feature, limit, used, resets_at, plan}` when over the limit. Usage is recorded only after a successful AI call (failed calls don't count).
- Week plan: one `week_plan` unit per generate request; its day calls are logged as `suggestion` cost events but don't consume the user's suggestion quota.
- Limits live in config (one table per plan) so they can change without a client release.
- `GET /api/usage` → plan, limits, used, `resets_at` per feature (powers usage meters on iOS + web).

### App Store purchases

- iOS sends the StoreKit 2 signed transaction to `POST /api/subscriptions/apple/verify`; the backend verifies the JWS signature (Apple root cert chain) and upserts `user_entitlements`. Set `appAccountToken` = our user UUID at purchase so transactions map to the right account.
- `POST /api/subscriptions/apple/notifications` receives **App Store Server Notifications V2** (renewals, expiry, refunds, grace period, revocation) and updates the entitlement.
- App Store Server API is used for restore and reconciliation.

## 6. iOS (later phase)

- StoreKit 2 products: `premium.monthly`, `premium.yearly` in one subscription group.
- Paywall: plan comparison, price, trial terms, **Restore Purchases**, links to Terms of Use (EULA) and Privacy Policy, "Manage subscription" link.
- Shown when the backend returns 402, and from Settings / Account.
- Usage meters ("7 of 10 outfit ideas left this month") from `GET /api/usage`.
- iPhone and iPad identical UX (project rule). The watch app is unaffected (no AI calls).

## 7. Web (later phase)

- Show plan + usage meters from `GET /api/usage`; handle 402 with an "upgrade in the iPhone app" message for now.
- Stripe checkout + webhooks feeding the same `user_entitlements` table in a later phase.

## 8. App Store prerequisites (outside the code)

1. Enroll in the paid **Apple Developer Program** ($99/year) — the current free Personal Team cannot publish or sell in-app purchases.
2. App Store Connect: Paid Apps agreement, tax and banking, create the subscription group and products, Small Business Program enrollment.
3. **Sign in with Apple** must be offered because Google sign-in is offered (App Review Guideline 4.8); it is currently hidden on iOS.
4. In-app account deletion (Guideline 5.1.1(v)) — confirm it exists on iOS.
5. Publicly hosted Terms of Use and Privacy Policy URLs.

## 9. Phases

1. **Usage ledger + metering (backend)** — `ai_usage_events`, record real cost per call, `GET /api/usage`. No limits enforced yet; gives real cost data. Fix the cost calculator's flat vision-image price.
2. **Limits (backend)** — `user_entitlements` (everyone `free`, admin can grant `premium`), enforce limits with 402. Caps the AI bill even before payments exist.
3. **Apple purchases (backend)** — verify endpoint, Server Notifications V2, App Store Server API client.
4. **iOS paywall + usage meters** — StoreKit 2, restore, 402 handling, Sign in with Apple.
5. **Web usage meters + 402 handling**; Stripe later.

## 10. Tests (per phase)

- Backend: usage counting and monthly reset; 402 payload when over limit; failed AI calls not counted; week-plan quota accounting; entitlement transitions from each Apple notification type; JWS verification rejects tampered payloads; `GET /api/usage` per plan.
- iOS: paywall product loading and purchase flow (StoreKit test configuration); restore; 402 → paywall; usage meter display.
- Web: usage meter display; 402 → upgrade message.

## 11. Open questions

1. Are the limits and prices in section 4 right for your audience and region?
2. Per-feature limits (proposed) or one pooled monthly "AI credits" balance with weights per feature?
3. Should Free-tier suggestions use GPT-4o-mini to cut cost?
4. Do existing signed-in users get a grace period or a launch promo before limits apply?
5. Should web users ever be able to buy Premium on web (Stripe), and when?
