# Astra OS — Roadmap

> Living document. Astra OS started as a read-only mission-control dashboard for the
> [Hermes Agent](https://github.com/NousResearch/hermes-agent) stack. It is evolving into a
> **web-based, full read+write control panel** for that stack — without losing its
> observability identity.

## Positioning

Two halves, fused:

- **Observability + control** (our origin): Orrery, live latency/health, Activity, Cron, Dream, Control Room.
- **Operations + management** (the expansion): Kanban, Skills, per-agent chat, and a full write surface (toggle tools, edit persona, build schedules, manage memory…).

**Moat to protect:** the Orrery (3D agent map), live observability (p50/p95 latency, key health, cache-hit), web + **remote-deployable**, and a distinct war-room design. Principle: **every new write/ops screen carries an observability touch** (like the failure badge on the Board) — we never clone a generic management form worse than the reference.

## Where this roadmap comes from

1. **Reference "Agentic OS" dashboard** (the Hermes + Agent OS video; screenshots in `raw/assets/argus-ref/`, analysis in `raw/projects/argus-os-dashboard*.md`). Source of the **operations layer**: Kanban, skill-as-app (SEO Pipeline), per-agent chat, Video/Studio/Avatar. Notably has **no observability** (deliberate "simplicity").
2. **hermes-desktop** (`fathah/hermes-desktop`, official NousResearch companion, Electron, MIT, ~9k★). Source of the **integration layer** and a **feature checklist**:
   - Local Hermes **HTTP API** at `127.0.0.1:8642` → OpenAI-compatible `/v1/chat/completions` with **SSE streaming**, token usage, tool-progress. (`src/main/hermes.ts`, `src/main/sse-parser.ts` — MIT, portable.)
   - **Remote mode**: `getApiUrl()` resolves local **or** remote (URL + API key, optional SSH tunnel) → the answer to our "local-first can't deploy" problem.
   - 12 screens (read+**write**): Chat · Sessions · Agents(profiles) · Skills · Models · Memory · Soul · Tools · Schedules · Gateway · Office(Claw3d) · Settings.
3. **Decision (confirmed):** Astra becomes **full read+write** — the user should be able to do every operation from the panel.

---

## Phase 0 — v0 (DONE) ✅

8 screens, reading real local data (`~/.hermes` + Obsidian vault), server components, `force-dynamic`:

- [x] `/` Mission Control (Orrery + agent health + stats)
- [x] `/chat` Hermes (live voice + text; currently via CLI `execFile`)
- [x] `/board` Kanban (Triage→Done, failure badges) — *operations layer, from reference*
- [x] `/control` Control Room (providers/keys/gateway + **live p50/p95 latency, cache-hit, key health**)
- [x] `/cron` (read-only scheduled jobs)
- [x] `/activity` (sessions/day, model distribution)
- [x] `/dream` (nightly Dream reports)
- [x] `/goals` (vault Goals.md)

## Phase 1 — Foundation: Hermes integration client ✅ (code) · ⏳ (live API verify)

- [x] **`lib/hermes/sse.ts`** — SSE parser ported from hermes-desktop (MIT): `ParsedUsage`, tool-progress, usage.
- [x] **`lib/hermes/api.ts`** — single Hermes client:
  - **API-first, CLI-fallback**: if `127.0.0.1:8642` is up → use it; else fall back to the working CLI path. Never breaks.
  - **`getApiUrl()`** abstraction (local | `HERMES_API_URL` remote) + key from `~/.hermes/.env` `API_SERVER_KEY` or `HERMES_API_KEY`.
- [x] **Migrated `/chat`** — route now streams SSE (`chunk`/`tool`/`usage`/`done`) to the browser; client renders token-by-token, shows a **source badge** (Hermes API · stream / Hermes CLI) and a **token/cost footer**.
- [ ] **Live-verify the API path** — *deferred (decision B)*. Needs the local API server up (`platforms.api_server` in `config.yaml` + gateway restart, which touches the live gateway). The code is ready and activates automatically once `8642` runs — verify at a convenient moment. CLI fallback works today.

*Note: this client is also the action channel for the whole write panel.*

## Phase 2 — Write panel (read + write)

**A) Config writes** (Hermes-owned mutation via its CLI — never hand-edit the commented `config.yaml`):
- [x] **Tools** — `/tools` toggles the 25 toolsets via `hermes tools enable/disable` (state lives outside `agent.disabled_toolsets`, so the CLI is the safe writer). Optimistic UI + revert-on-error. *First write feature — Astra is no longer read-only.*
- [x] **Cron builder** — `/cron` now writes: create, **edit** (inline form pre-filled from the job: schedule/prompt/name/delivery), pause/resume, run-now, delete — all via `hermes cron`. Per-row actions; `router.refresh()` re-reads after each write.
- [ ] **Soul / Persona** — edit `SOUL.md`.
- [ ] **Agent settings** — `config.yaml → agent.*` (reasoning_effort, max_turns, image_input_mode…).
- [ ] **Memory** — view/edit `~/.hermes/memories`.
- [ ] **Profiles / Agents** — list & switch `~/.hermes/profiles/`.
- [ ] **Image gallery** — `~/.hermes/images/` (read).

*Tools follow-ups (backlog): a short "what enabling a toolset does" hint on `/tools`; a platform selector (cli / telegram / discord — toolsets are per-platform); an **output gallery** for artifacts the tools produce (`~/.hermes/images/` etc.). Enabling a toolset grants the agent a capability — the effect shows up as tool-progress in `/chat` and artifacts on disk when the agent next runs (chat / cron / kanban / gateway), not as a new tab.*

**B) Action triggers** (via the Phase-1 client — API/CLI):
- [ ] Send a task / run a tool (web, browser screenshot, image-gen, TTS) → Hermes executes, we trigger + show results.
- [ ] Gateway start / stop / restart.

## Phase 3 — Operations parity (from reference Agentic OS)

- [ ] **Skills browser** `/skills` (`~/.hermes/skills/`, `gray-matter`) → later **skill-as-app** (interactive SEO-Pipeline-style screens).
- [ ] **Per-agent chat channels** — agent pills on `/chat` (Claude/Hermes/OpenClaw/Gemini…).
- [ ] Video / Studio / Avatar (content creation) — longer term.

## Phase 4 — Observability depth (our moat — keep widening)

- [ ] **ROI / "time worth" + Runs/Outputs** — the reference Agentic OS shows outputs in a dedicated **Activity → "Runs / Outputs"** view: a run table (`RUN · MODEL · WORKSPACE · STARTED · DURATION · STATUS · TOOLS`) + per-workspace cost cards + "60 runs · 80 outputs — every session and the artefact it produced". We have all of it in `state.db.sessions` (id, model, source=workspace, started/ended→duration, end_reason→status, tool_call_count, tokens, `estimated_cost_usd`). Build: a **Runs table** on `/activity` from `state.db` (this also **fixes the "token 0" issue** — move the Activity reader off session JSON), plus an **Outputs/gallery** tab (generated images in `~/.hermes/images/`, kanban `tasks.result`/`workspace_path`).
- [ ] Session full-text search (`state.db` has FTS5) — from hermes-desktop's Sessions screen.

## Phase 5 — Deploy

- [ ] **Remote mode flip** — point `getApiUrl()` at a remote Hermes API → Astra becomes Vercel-deployable (no longer empty without local `~/.hermes`). Unlocked by Phase 1.

## Phase 6 — Cinematic UI pass (LAST, deliberate)

- [ ] Gradient stat cards, sparklines, space-themed hero art, motion polish.
- [ ] **Cron edit layout rework** — the current inline form-at-top is rough. Move to the reference's **master-detail** (job list left, selected job's full detail/edit panel right, with "last outputs"). Functional today; visual only.

---

## Reusable assets identified
- hermes-desktop `src/main/sse-parser.ts` (MIT) — SSE/usage parsing.
- hermes-desktop `src/main/hermes.ts` (MIT) — API client / remote / gateway patterns to mirror.
- Provider + gateway **logo SVGs** (MIT) for Control Room.
- `lib/hermes/kanban.ts` taught us: use `process.getBuiltinModule("node:sqlite")` (not `createRequire`) inside Turbopack server modules.
