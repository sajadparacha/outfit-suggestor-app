# Main Flow UX Contract (Web + iOS)

**Version:** 1.0  
**Branch:** `feature/main-page-ui-improvements`  
**Status:** Active — single source of truth for Suggest / main outfit flow

Both clients implement this contract natively. Labels and behavior must match exactly.

---

## Flow states

| State | ID | User sees |
|-------|-----|-----------|
| Creation | `creation` | Upload + preferences + primary CTA; collapsed secondary sections |
| Loading | `loading` | Progress on result area; input disabled |
| Result | `result` | Outfit hero + item cards + actions |
| Error | `error` | Inline error in result area; input remains available |
| Guest limit | `guest-limit` | Auth gate (unchanged) |

**Transition:** `creation` → `loading` → `result` | `error`. Refine actions re-enter `loading` → `result`.

---

## Shared copy (`MainFlowUxCopy` / `mainFlowUxCopy.ts`)

| Key | Label |
|-----|-------|
| `primaryCta` | Generate Outfit |
| `primaryCtaAria` | Get AI outfit suggestion |
| `emptyPreviewHeadline` | Your outfit appears here |
| `emptyPreviewSubline` | Upload a photo, set preferences, then tap Generate Outfit |
| `resultTitle` | Your Styled Look |
| `whyThisWorks` | Why this works |
| `generateAnother` | Generate Another Look |
| `saveLook` | Save Look |
| `refine` | Refine |
| `refineMoreFormal` | Make it more formal |
| `refineMoreCasual` | Make it more casual |
| `refineWardrobeOnly` | Use wardrobe items only |
| `refineChangeOccasion` | Change occasion |
| `tagFromUpload` | From your upload |
| `tagFromWardrobe` | From your wardrobe |
| `tagAiSuggested` | AI Suggested |
| `preferencesSection` | Preferences |
| `wardrobeSection` | Wardrobe |
| `randomPicksSection` | Random picks |
| `advancedOptionsSection` | Advanced options |
| `compactSummaryTitle` | Your inputs |
| `saveLookToast` | Look saved! |
| `saveLookAuthPrompt` | Sign in to save looks |
| `changeOccasionHint` | Update occasion in Preferences, then tap Generate Another Look. |

Categories (item cards): Shirt, Trousers, Blazer, Shoes, Belt.

**Optional layers (not part of core five):** When the API returns non-null `sweater`, `outerwear`, or `tie`, show a collapsible **Also wear** section below the core cards with labels **Layer** (sweater), **Outerwear** (jacket/coat), **Tie**. Same card pattern and source tags as core items. Hidden when all three are null/empty.

| Copy key | Label |
|----------|-------|
| `alsoWearSection` | Also wear |
| Optional card labels | Layer, Outerwear, Tie |

---

## Before generation (`creation`)

### Visible (always)

1. **Upload** — photo library + camera (iOS) / drag-drop + file + camera (web)
2. **Preferences** — occasion, season, style, notes (notes may include color preferences)
3. **Primary CTA** — `Generate Outfit` (full width on mobile)

### Collapsed (disclosure / accordion)

- Wardrobe (use wardrobe only toggle, source item chip)
- Random picks (random from wardrobe / history — auth required)
- Advanced options (admin: model image, AI prompt toggle — **input side only**)

### Result preview area (web desktop / tablet)

- Empty state with `emptyPreviewHeadline` + `emptyPreviewSubline`
- No duplicate upload preview in result column before generation

---

## After generation (`result`)

### Hero (priority order)

1. **Model image** when `model_image` present — large, tappable full-screen
2. Else **styled outfit composite** placeholder (gradient card + outfit context) — **not** the raw upload as hero
3. Upload appears only on the matching **item card**, not as main hero

### Context line

Format: `{Style display} · {Season display}`  
Example: `Business Casual · Summer`  
Fallback: occasion display if style empty.

### Item cards (5 categories)

Each card:

| Field | Source |
|-------|--------|
| Image | Wardrobe match thumb, or upload thumb for matched category only |
| Category | Shirt / Trousers / … |
| Short name | First clause of item text (before `—`, `,`, or `.`) |
| One-line reason | Remainder of item text if multi-part; else hidden |
| Source tag | From your upload / From your wardrobe / AI Suggested |

No paragraphs inside cards. Max ~80 chars visible for reason.

### Also wear (optional)

When `sweater`, `outerwear`, or `tie` is present:

- Section heading: `Also wear` (collapsible; expanded by default if any field present)
- Cards: Layer / Outerwear / Tie — same thumbnail + source tag rules as core cards
- Omit entire section when all optional fields are null

### Why this works

- Heading: `Why this works`
- Body: 3–5 bullet points from `reasoning` (split via `reasoningBullets` util)
- If fewer than 3 sentences, show as-is bullets (min 1)

### Primary actions (exactly three)

| Priority | Action | Behavior |
|----------|--------|----------|
| 1 | Generate Another Look | Same photo, new outfit (`previous_outfit_text`) |
| 2 | Save Look | Like/save; guest → auth prompt |
| 3 | Refine | Opens menu/panel with 4 refine options |

**Remove from result surface:** standalone Like, Add to Wardrobe, Start Over, Open Wardrobe, duplicate sticky refine buttons.

Secondary utilities (Add to Wardrobe, Start Over) → overflow menu (`⋯` / More) if retained — not primary.

### Refine menu options

All re-request with modifiers (existing API):

- Make it more formal
- Make it more casual
- Use wardrobe items only (auth)
- Change occasion → picker/sheet; on apply, regenerate

### Advanced options

- **Only** on input/preferences side (Sidebar / creation column)
- **Never** in result panel (remove cost/AI prompt from result; admin can use input-side Advanced)

---

## Layout

### Web

| Viewport | Before generation | After generation |
|----------|-------------------|------------------|
| Desktop (lg+) | Left: input stack. Right: empty preview | Left: compact summary (thumb + prefs). Right: result hero |
| Mobile | Stacked: input then empty preview | Stacked: compact summary then result; **scroll to result** on success |
| Sticky bottom (mobile result) | — | Save Look + Generate Another Look (Refine in overflow or third slot) |

### iOS

| Device | Layout |
|--------|--------|
| iPhone | Vertical flow; scroll to result after generation |
| iPad (regular width) | Two columns mirroring web: input left, preview/result right |
| Sticky bottom (result) | Save Look + Generate Another Look |

Item detail expansions: optional `DisclosureGroup` per card on iOS for full text.

---

## Empty / loading / error

| State | Web | iOS |
|-------|-----|-----|
| Empty preview | Dashed card + copy | Same copy in preview area |
| Loading | Skeleton in result column + AI progress | Skeleton + `AiProgressPanelView` |
| Error | Red border card in result area | Alert or inline banner |

---

## Preserve (do not regress)

- Premium dark theme, gradients, rounded cards (`AppTheme` / Tailwind brand tokens)
- Guest limit, first-run coach, duplicate modal, auth flows
- API contracts (`getSuggestion`, variation modifiers, wardrobe-only)
- Admin model image generation (advanced, input side only)

---

## Category taxonomy (wardrobe, insights, shopping)

Iteration-2 clothing categories for gap analysis and shopping: **shirt, trouser, blazer, sweater, jacket, shoes, belt** (+ **tie** for business/formal/office occasions). No new categories beyond this set.

| Concern | Rule (both platforms) |
|---------|----------------------|
| Wardrobe blazer filter chip | Counts `blazer` / `blazers` / `suit` only — **not** jacket |
| Wardrobe jacket filter chip | Extended chip; counts `jacket` / `jackets` only |
| Outfit completion (5 slots) | Jacket items still map to blazer slot for AI completion |
| Insights coverage | Jacket and blazer are separate rows; API `item_count` per category |
| Shopping list labels | `cleanShoppingItemLabel` — dedupe words; prefer category label when AI name is junk or non-taxonomy |
| Google Shopping queries | `Show me men's {categoryPhrase} …` — possessive `men's` hardcoded; future env flag documented in `.cursor/specs/category-taxonomy-polish.md` |

**Sync pair:** `frontend/src/utils/insightsHelpers.ts` ↔ `ios-client/OutfitSuggestor/Utils/WardrobeInsightShoppingList.swift`  
**Wardrobe filter sync:** `frontend/src/utils/wardrobeCategory.ts` ↔ `ios-client/OutfitSuggestor/Utils/WardrobeCategoryDisplay.swift`

---

## Contract files (sync pairs)

| Web | iOS |
|-----|-----|
| `frontend/src/utils/mainFlowUxCopy.ts` | `ios-client/OutfitSuggestor/Utils/MainFlowUxCopy.swift` |
| `frontend/src/utils/reasoningBullets.ts` | `ios-client/OutfitSuggestor/Utils/ReasoningBullets.swift` |
| `frontend/src/utils/outfitContextLine.ts` | `ios-client/OutfitSuggestor/Utils/OutfitContextLine.swift` |
| `frontend/src/utils/outfitItemCardText.ts` | `ios-client/OutfitSuggestor/Utils/OutfitItemCardText.swift` |
| `frontend/src/utils/insightsHelpers.ts` | `ios-client/OutfitSuggestor/Utils/WardrobeInsightShoppingList.swift` |
| `frontend/src/utils/wardrobeCategory.ts` | `ios-client/OutfitSuggestor/Utils/WardrobeCategoryDisplay.swift` |
