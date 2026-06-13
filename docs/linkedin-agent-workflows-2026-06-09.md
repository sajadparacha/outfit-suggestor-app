# From One Sentence to Production: Twin UI + Publish on Web

**LinkedIn technical achievement writeup — Outfit Suggestor (Closiq), June 2026**

Use the sections below as-is, or copy **“Paste-ready post”** directly into LinkedIn.

---

## Paste-ready post (copy from here)

**I built a two-phrase AI workflow that takes a cross-platform app from idea → matching web + iOS UX → live production — with tests as the gate at every step.**

Outfit Suggestor (Closiq) runs on **React** and **SwiftUI**. Same product, two codebases. Every UI change used to mean double implementation, drift in copy, and “did we break the other platform?”

So I codified two Cursor agent workflows:

**1️⃣ Twin UI** — one instruction, two parallel agents

```text
Twin UI: [your UX change]
```

The orchestrator writes a platform-neutral spec, handles backend if needed, then launches **web and iOS subagents in parallel** — each scoped to its own codebase, each required to add tests before returning.

No orchestrator editing UI directly. No shipping one platform and forgetting the other.

**2️⃣ Publish on Web** — one instruction, full release pipeline

```text
publish on web
```

If **all** tests pass (210 web · 175 backend · 57 iOS in our stack), the agent commits, pushes, deploys the frontend to **GitHub Pages** (closiq.me), and ships the backend to **Railway** — with a structured report at the end.

If anything fails, nothing ships.

**The loop:**

Feature branch → Twin UI iterations → merge → `publish on web` → live.

**What we enforced in code, not vibes:**

• Strict agent boundaries (`frontend/` vs `ios-client/` vs orchestrator)  
• Platform-neutral specs with mandatory test sections  
• Parity review against a living feature matrix  
• Full-suite test gate before “done” or “published”  
• Cursor rules + project skills so the workflow survives beyond one chat  

**Recent wins from this pipeline:** wardrobe card UX (overflow menus, z-index, Past Suggestions), guest auth prompts, route parity web/iOS, insights copy aligned across platforms — all spec'd, tested, and deployed through the same system.

Building for two platforms doesn’t have to mean doing everything twice — or shipping twice as much drift.

🔗 Live app: https://closiq.me  
📂 Open-source patterns: Twin UI + Publish on Web skills in the repo

#AI #Cursor #MultiAgent #React #SwiftUI #DevOps #Testing #ProductEngineering #BuildInPublic

---

## Long-form version (article / carousel notes)

### The problem

Cross-platform products fail in predictable ways:

1. **Parity drift** — web gets the fix; iOS gets it three sprints later (or never).
2. **Copy drift** — “History” on one side, “Past Suggestions” on the other.
3. **Test gaps** — a green web build hides a broken iOS flow.
4. **Release friction** — tests, commit, Pages, Railway, and verification are a manual checklist nobody enjoys.

We had React (web), SwiftUI (iOS), FastAPI (backend), GitHub Pages, and Railway. We needed a **repeatable operating system** for UI work — not a one-off hack.

---

### Workflow 1: Twin UI — build both platforms from one sentence

**Trigger:** `Twin UI: [instruction]`

**Twin** = two platforms, two agents, always in parallel.

| Role | Scope | Job |
|------|-------|-----|
| Orchestrator | Specs, backend, contracts | Write spec, API changes, parity review — **never** edit platform UI |
| Web agent | `frontend/**` | React, Tailwind, Jest |
| iOS agent | `ios-client/**` | SwiftUI, XCTest, XCUITest |

**Pipeline:**

```
Your instruction
      ↓
Platform-neutral spec (.cursor/specs/)
      ↓
Backend/API? → pytest (orchestrator)
      ↓
┌─────────────┐   ┌─────────────┐
│ Web agent   │   │ iOS agent   │  ← launched together
└──────┬──────┘   └──────┬──────┘
       └────────┬─────────┘
                ↓
     Parity review → user confirms → full test suites → Test Execution Report
```

**Non-negotiables:**

- Two subagents in **one message** (not sequential, not optional).
- Every feature spec includes a **Tests (required)** section before agents start.
- Each agent adds tests for **new behavior**, not smoke-only coverage.
- Orchestrator asks before running full suites (~8+ minutes) — but won’t call a feature “done” if suites fail.

**Example instructions we ran through Twin UI:**

- Wardrobe card simplification (hero “Style this item” + overflow menu)
- Past Suggestions in the overflow menu + fix menu clipping behind the next card
- Insights copy from AI jargon → fashion-assistant language
- Guest auth prompts at moments of value (first outfit, like, history, wardrobe)
- Admin-only surfaces gated on both platforms

**Infrastructure:** `AGENTS.md`, `.cursor/rules/parallel-ui-orchestrator.mdc`, platform rules for web/iOS, `.cursor/skills/parallel-ui-ux/SKILL.md`, spec + test-report templates.

---

### Workflow 2: Publish on Web — ship only when everything is green

**Trigger:** `publish on web`

Invoking this skill = explicit approval to **commit, push, and deploy**.

**Pipeline:**

```
All tests (web + backend + iOS)
      ↓ pass only
Commit (exclude secrets & build artifacts)
      ↓
Push to GitHub
      ↓
GitHub Pages (npm run deploy → closiq.me)
      ↓
Railway (railway up → API)
      ↓
Health checks + Publish on Web Report
```

**Test gate (our stack):**

| Layer | Tool | Scale |
|-------|------|-------|
| Web | Jest (unit + integration) | 38 suites · 210 tests |
| Backend | pytest | 175 tests |
| iOS | XCTest + XCUITest | 47 + 10 tests |

**~442 automated checks** before a single line hits production.

**Deploy targets:**

| Surface | URL |
|---------|-----|
| Production web | https://closiq.me |
| GitHub Pages | https://sajadparacha.github.io/outfit-suggestor-app |
| Backend API | Railway (health: `/health`) |

**Safety rails:**

- Any failure → stop. No commit, no push, no deploy.
- Never stage `.env` secrets or iOS build artifacts.
- Production build reads `frontend/.env.production` for API URL.
- Structured **Publish on Web — Report** every run (tests, git, deploy status, live URLs).

**Infrastructure:** `.cursor/skills/publish-on-web/SKILL.md`, `scripts/run-all-tests.sh`, GitHub Actions workflow on `main`.

---

### How they fit together

```text
Branch → Twin UI (iterate) → merge → publish on web (ship)
```

Twin UI optimizes for **correctness and parity while building**.  
Publish on Web optimizes for **confidence while shipping**.

Same philosophy: **automation with gates**, not automation without accountability.

---

### Results & proof points

| Metric | Value |
|--------|-------|
| Parallel agent runs (Twin UI) | 10+ web/iOS pairs across the sprint |
| Feature specs written | 9+ under `.cursor/specs/` |
| Full publish test run | 442 tests, all passing before last production deploy |
| Live product | https://closiq.me |
| Workflow artifacts | Rules, skills, templates — reusable on the next feature branch |

**Concrete UX shipped through this system:**

- Wardrobe overflow menu with Past Suggestions, correct z-index stacking
- First-outfit guest banner (with flaky-test race fixed before publish)
- Route-based navigation parity (React Router ↔ SwiftUI deep links)
- Shared copy modules (insights, micro-help, auth prompts, wardrobe card UX)

---

### What I’d tell another team

1. **Split agents by directory, not by task.** Scope beats smart prompts.
2. **Spec before code.** One platform-neutral doc beats two diverging chats.
3. **Tests are exit criteria**, not post-merge regret.
4. **Separate “build” from “ship” workflows.** Twin UI and Publish on Web do different jobs; both need clear triggers.
5. **Codify in repo** (rules + skills), not in one engineer’s head.

---

### Optional closing lines (pick one)

**Short:**  
Two phrases. Two platforms. One pipeline. Tests at both doors.

**Reflective:**  
The best multi-platform workflow isn’t “use AI twice” — it’s **one intent, enforced boundaries, and a test gate you actually trust**.

**CTA:**  
If you’re juggling web + mobile + deploy, happy to share the skill files and spec templates — the patterns transfer even if the stack doesn’t.

---

## Hashtag sets (mix and match)

**Primary:** `#AI #Cursor #MultiAgent #React #SwiftUI #Testing #DevOps`

**Secondary:** `#ProductEngineering #MobileDevelopment #WebDevelopment #CICD #BuildInPublic #AIEngineering #QualityEngineering`

---

## Suggested visuals for LinkedIn

1. **Diagram:** Twin UI flow (orchestrator → two agents → test gate)
2. **Diagram:** Publish on Web pipeline (tests → git → Pages → Railway)
3. **Screenshot:** Wardrobe card with overflow menu (before/after z-index fix)
4. **Screenshot:** Test Execution Report snippet (442 tests passed)

---

## Links to include in comments

| Resource | URL |
|----------|-----|
| Live app | https://closiq.me |
| GitHub repo | https://github.com/sajadparacha/outfit-suggestor-app |
| Internal workflow doc | `AGENT_WORKFLOWS.md` (in repo) |

---

*Generated for sharing as a technical achievement — June 2026.*
