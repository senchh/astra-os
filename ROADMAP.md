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
- [x] **Control Room stat fix** — the top "aktif sağlayıcı" stat showed `auth.json → active_provider`, a credential-pool pointer that diverges from the model's provider and misled (it pointed at an exhausted provider not even serving the model). Replaced with **"varsayılan sağlayıcı"** = the rolled-up health of the provider serving the default model (`model.provider`), colored by status (sağlıklı/tükendi/hata) — answers "is the AI I'm using actually working?".
- [x] **Model picker (on provider cards)** — `/control` switches the default model/provider in-place. `hermes model` is fully interactive (can't be scripted), so we write `model.provider` + `model.default` via two `config set` calls. **The selector lives on each provider card** in the "sağlayıcılar & anahtarlar" section (not a separate panel) — you pick the model right on the authed provider you're already looking at, with its live p50/p95 latency + key health in the same card. Each card's `<select>` lists that provider's `provider_models_cache.json` models; the current default provider's card shows the active model + a VARSAYILAN marker. Server validates the chosen model against that provider's authed cache list. New-provider login still needs `hermes model` in a terminal. Verified end-to-end (pick gemini-2.5-pro on the gemini card → both keys on disk, `base_url` preserved, VARSAYILAN marker moved → restored byte-for-byte).
- [x] **Memory (Personal Memory) — unified screen** — `/memory` mirrors the reference Agentic OS "PERSONAL MEMORY" layout: a left sub-nav with **My Notes** (`~/.hermes/memories/MEMORY.md`), **User Profile** (`USER.md`), and **Agent Soul** (`SOUL.md`). All three are plain markdown written directly via `fs.writeFile` (no Hermes CLI command exists for any of them). One shared editor (textarea + dirty/revert/save, per-doc unsaved-edit retention on switch). *Observability touch (the reference has none):* the strip **adapts to the active doc's kind** — persona (`SOUL.md`) → live **~token/call** estimate (auto-injected into every agent call) + `##` section count; memory (`MEMORY.md`/`USER.md`) → **entry count** (`§`-split) + lines. Last-saved time on every doc. End-to-end verified for both kinds (UI save → disk → restored byte-for-byte; 0 console errors). *Replaced the earlier standalone `/soul`, which was folded in.*
- [x] **Agent settings** — `/settings` edits curated `agent.*` + `display.*` keys via `hermes config set <key> <value>`. **Critical:** `config set` does **not** validate — it accepts and writes garbage verbatim (e.g. `verbose=notabool` stuck as a string) — so the **UI + a server-side allowlist/normalizer are the only guardrails**. We expose only known-domain fields: bools (toggles), `display.personality` (the 14 exact built-in keys), `agent.max_turns` (bounded int), `agent.reasoning_effort` (minimal/low/medium/high). Per-field optimistic apply + revert-on-error (Tools pattern). Unknown-domain keys (`image_input_mode`, `tool_use_enforcement`, `service_tier`) deliberately omitted. *Observability touch:* header shows the live model/provider these settings apply to + a note that reasoning/max-turns drive the p50 latency & token cost shown in Control Room. Verified end-to-end (enum + bool → disk with correct types → restored byte-for-byte; 0 console errors).
- [x] **Profiles / Agents** — `/profiles` lists each Hermes profile (a self-contained env: own `.env`, SOUL.md, memories, sessions, `state.db`) as cards — name, **active (sticky-default) badge**, model, **live gateway status** (running/stopped dot), alias, distribution — parsed from `hermes profile list` (active row prefixed `◆`). Write: **switch active** via `hermes profile use <name>` (per-card "Aktif yap" with a **confirm**, since it reroutes Astra's own CLI calls; reversible via `use default`). *Observability touch:* a header strip shows which profile Astra's CLI currently routes to + a reroute warning. Verified end-to-end (API switch → reader reflects ◆argus → restored to ◆default). *Backlog: create/delete/rename/describe.*
- [ ] **Image gallery** — `~/.hermes/images/` (read).

*Tools follow-ups (backlog): a short "what enabling a toolset does" hint on `/tools`; a platform selector (cli / telegram / discord — toolsets are per-platform); an **output gallery** for artifacts the tools produce (`~/.hermes/images/` etc.). Enabling a toolset grants the agent a capability — the effect shows up as tool-progress in `/chat` and artifacts on disk when the agent next runs (chat / cron / kanban / gateway), not as a new tab.*

**B) Action triggers** (via the Phase-1 client — API/CLI):
- [ ] Send a task / run a tool (web, browser screenshot, image-gen, TTS) → Hermes executes, we trigger + show results.
- [ ] Gateway start / stop / restart.

## Phase 3 — Operations parity (from reference Agentic OS)

- [x] **Skills browser** `/skills` (`~/.hermes/skills/`, `gray-matter`) — 92 skills by category, usage-aware (`.usage.json`), with an **enable/disable toggle** via a comment-preserving surgical `config.yaml` edit (`config set` corrupts the list to a string; `hermes skills config` is interactive — neither is a safe scriptable writer). *Later: skill-as-app (interactive SEO-Pipeline-style screens).*
- [x] **Per-agent chat channels** — agent pills on `/chat`, one per **authed** provider (Grok/Codex/Gemini/Copilot/OpenAI), built from the same credential-pool gate as the Control Room model picker (cached-but-unauthed providers like anthropic/openrouter aren't offered). Picking a pill routes a single conversation through that provider+model via `hermes chat --provider <p> -m <model>` — **transient, never touching the sticky config default** (that's `/control`'s job). A model dropdown on the active pill lists that provider's cached models; the default pill mirrors the sticky model and sends no override. *Observability touch (reference has none):* each pill carries a **key-health dot** (green ok / amber exhausted / red error) — you pick an agent while seeing whether its keys can actually answer; and every assistant bubble is tagged with the agent that produced it (provenance). Server-side guard (`resolveAgent`) validates the override against the authed pool + that provider's model cache; anything invalid falls back to the sticky default. Verified end-to-end: pills render with live health (Codex/OpenAI amber = exhausted), override → `meta {provider, model}` + correct answer via CLI, invalid provider/model → `provider:null` fallback; tsc+lint clean, 0 console errors. *Backlog: filter non-chat models (grok-imagine-*) out of the dropdown.*
- [x] **Chat history (Astra-local)** — a conversation rail on `/chat` backed by `localStorage` (`lib/chat-history.ts`), local-first with **no server/Hermes coupling**. Each conversation auto-titles from its first message, stores its messages + the agent it used, and **survives reload**; resume / rename / delete from the rail, "+ Yeni" starts a fresh chat. The conversation id doubles as the chat `sessionId`. Persistence is guarded on `!loading` so it writes once per completed turn, not per token. *This deliberately stores only chats made from Astra; the full agent session ledger (telegram/cron/cli) is the separate Phase-4 `/sessions` screen below — different question ("continue my chat" vs "search everything the agent ever did"), so we don't conflate them.* Verified end-to-end (Playwright): send → persisted (title/provider/model/2 msgs in localStorage) → reload keeps it in the rail while the chat area starts fresh → click resumes the transcript with its agent + provenance label; tsc+lint clean, 0 console errors.
- [ ] Video / Studio / Avatar (content creation) — longer term.

## Phase 4 — Observability depth (our moat — keep widening)

- [x] **Runs table + token accounting** — `/activity` now reads `state.db.sessions` (the canonical ledger) instead of `sessions/*.json`. This **fixes the "token 0" bug** (the JSON files always reported `total_tokens: 0`; real tokens were in the DB) — top stat now shows **11.8M tokens** across 113 runs, and the home + debug readers inherit the fix since `readSessions()` was repointed. New **Runs table** (run · model · source · duration · status · tokens · cost) + **per-source token breakdown** (cli/cron/telegram/webui). **Cost reality:** this user is entirely on OAuth/subscription providers, so `estimated_cost_usd` is always 0 / `cost_status` unknown|included — so we **do not show fake dollar totals**; the cost column honestly reads "abonelik" (included) or "—" (unmetered), and tokens lead. `process.getBuiltinModule("node:sqlite")` (Turbopack-safe, same as kanban.ts).
- [x] **Outputs / gallery** — an "üretilen görseller" image gallery on `/activity` (right under the Runs table — runs and the artefacts they produced). Reads `~/.hermes/images/` (`lib/hermes/outputs.ts`); files live outside Next's `public/`, so a guarded API route (`/api/outputs/image?name=`) streams the bytes with path-traversal protection (basename-only, must resolve inside IMAGES_DIR — verified `../config.yaml` → 404). Cards show thumbnail + name + time + size, click → full image. Graceful empty state. *Note: kanban `tasks.result` is empty across all rows today and `image_cache` is empty, so the gallery is the real output source for now; it grows as the agent runs image_gen/vision.*
- [ ] **ROI / "time worth"** — revisit if/when the user adds a metered (per-token-priced) provider; today every provider is subscription-based so there's no dollar ROI to compute. Tokens-per-source is the live proxy.
- [x] **Sessions browser + full-text search** `/sessions` — a master-detail screen over `state.db`: FTS5 search across **every message of every session** (cli/cron/telegram/webui — all agent activity, not just Astra chats), grouped to the sessions that matched with a highlighted `snippet()` and match count. The full transcript (role-labeled: sen/ajan/araç·toolName/sistem) renders on the right with an **observability strip** the reference's plain Sessions list lacks (messages · tokens · tool-calls · cost). Server-reader pattern: the page reads `searchParams` (`?q`/`?source`/`?id`), a client search box navigates by URL, source chips + list rows are `Link`s — so list + detail stay SSR. **Security:** the FTS query is user input, so it goes through bind params (never interpolated) and every whitespace term is quoted as an FTS phrase (`ftsQuery`) so punctuation can't become query syntax; `snippet()` can't run under `GROUP BY`, so matches are fetched newest-first and folded into sessions in JS. `queryState` gained optional bind params; `node:sqlite` (`process.getBuiltinModule`, Turbopack-safe). This is the "search everything the agent ever did" half — distinct from the Astra-local chat history ("continue my chat"). Verified end-to-end (curl+Playwright): `?q=deploy` → 10 sessions across cron/webui/telegram with highlighted snippets + match counts; click → full transcript with all role types (sen/ajan/araç·x_search/read_file/terminal/write_file) + the stat strip; source filter + clear work; tsc+lint clean, 0 console errors. *Backlog: trigram table (`messages_fts_trigram`) for substring matches; jump-to-matching-message in the transcript.*

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
