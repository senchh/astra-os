# Astra OS

**Your entire agent stack, in orbit.**

Astra OS is a local-first mission-control dashboard for your AI agent setup. It reads
your local [Hermes](https://github.com/) data and Obsidian vault directly from disk and
renders them as a single "war room" — with **the Orrery** at its center: a live orbital
map of every agent and system in your stack (Claude, Hermes, OpenClaw, Obsidian).

> Status: **v0** — functional baseline. Six screens live, reading real local data.
> Visual polish is iterative.

## Screens

| Route | What it shows |
|-------|---------------|
| `/` | **Mission Control** — the Orrery + agent health chips + live stat cards |
| `/control` | **Control Room** — providers, credentials & gateway in one panel: per-key status (ok / exhausted / error), source, auth type, fingerprint, **live p50/p95 latency + cache-hit + heartbeat per provider**, plus active/default provider and channel state |
| `/cron` | Scheduled jobs with per-job status (ok / error / paused), schedule, model, last & next run |
| `/activity` | Sessions-per-day chart + model distribution, last 14 days |
| `/dream` | Nightly Dream reports (pattern analysis & improvements), with full report view |
| `/goals` | Goals pulled from your Obsidian vault (`Goals.md` checkboxes) |

## How it works

Astra OS is **local-first**. Every page is a server component that reads files under
your home directory at request time — nothing is sent anywhere, no backend to host.

It reads from:

- `~/.hermes/cron/jobs.json` — cron jobs
- `~/.hermes/kanban.db` — kanban tasks (via Node's built-in `node:sqlite`)
- `~/.hermes/sessions/*.json` — session activity & model usage
- `~/.hermes/auth.json` — provider credentials (read **safe fields only** — token values are never touched)
- `~/.hermes/config.yaml`, `gateway_state.json`, `provider_models_cache.json` — Control Room config & status
- `~/.hermes/logs/agent.log` — per-API-call latency / token / cache lines → live p50/p95 per provider
- `~/Documents/HermesMemory/` — Obsidian vault: Dream reports, Goals

Because of this, **deploying to a remote host (e.g. Vercel) will render empty states** —
there's no `~/.hermes` on the server. Astra OS is meant to run on the same machine as
your agents.

Paths are centralized in [`lib/hermes/paths.ts`](lib/hermes/paths.ts) — adjust them there
if your setup differs.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

For daily use, run the production build:

```bash
npm run build
npm run start
```

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 · three.js + react-three-fiber (the Orrery) ·
cmdk (⌘K command palette) · gray-matter (vault markdown) · lucide-react.

## Roadmap

- Dream "run this fix" actions
- ROI / "time worth" view (cost & tokens are already in `state.db` — `estimated_cost_usd`, `input/output/reasoning_tokens`)
- Cinematic UI pass (gradient stat cards, sparklines, space-themed hero art)

---

Built by [@senncch](https://x.com/senncch) · VectorMind
