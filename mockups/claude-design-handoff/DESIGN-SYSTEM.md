# Astra OS — Design System (for Claude Design)

Astra OS is a **space-themed mission-control dashboard** for an AI agent stack
(Hermes / Claude / OpenClaw / Obsidian). The mood is **awake, technical, "you are
in command"** — a deep-space war-room, not a warm editorial app. Every screen
pairs an operational surface with an **observability touch** (live latency, key
health, token counts).

This doc is the source of truth for the visual system. Pilot screen in this
handoff: **`/chat` (Hermes)** — see `chat-01-empty-hero.png` and
`chat-02-conversation.png`.

Live code: **https://github.com/senchh/astra-os** (Next.js 16 App Router +
Tailwind v4 `@theme` + three.js/R3F for the home Orrery). Tokens below are the
real values from `app/globals.css`.

---

## Color tokens (`@theme`)

### Surfaces (deep-space navy, darkest → lightest)
| token | hex | use |
|---|---|---|
| `--color-bg` | `#070b14` | app background |
| `--color-bg-2` | `#0a1020` | sidebar / topbar / inputs |
| `--color-panel` | `#0e1626` | card base |
| `--color-panel-2` | `#131d30` | raised / hover |
| `--color-edge` | `#1e2a44` | all borders / hairlines |

### Text
| token | hex | use |
|---|---|---|
| `--color-fg` | `#e6ecf5` | primary text |
| `--color-muted` | `#7d8aa8` | secondary text |
| `--color-faint` | `#46557a` | tertiary / metadata |

### Signal palette (status + accents — used sparingly, never as fills)
| token | hex | meaning |
|---|---|---|
| `--color-cyan` | `#22d3ee` | **primary accent** — active, default, links |
| `--color-amber` | `#f59e0b` | warning / exhausted key |
| `--color-green` | `#34d399` | healthy / ok / success |
| `--color-red` | `#f87171` | error / failure |
| `--color-violet` | `#a78bfa` | secondary accent (model, dream) |

### Agent identity colors
Claude `#f59e0b` · Hermes `#22d3ee` · OpenClaw `#fb7185` · Obsidian `#a78bfa`

---

## Typography
- **Display** (`--font-display`): **Sora** — headings, hero titles, stat numbers. `font-display`.
- **Sans** (`--font-sans`): **Geist** — body / UI.
- **Mono** (`--font-mono`): **Geist Mono** — data, ids, schedules, eyebrows, metrics.

Signature label style — `.label`: `10px`, `letter-spacing .14em`, **uppercase**,
`color: muted`. Used as tiny section eyebrows everywhere.

---

## Core primitives (CSS classes in `globals.css`)

- **`.panel`** — the card. `linear-gradient(165deg, panel-2, panel)` at ~92%
  opacity, `1px` edge border, `border-radius .9rem`, `backdrop-filter blur(10px)`.
- **`.panel-hover`** — adds cyan-tinted border + lift on hover.
- **`.label`** — tiny tracked uppercase eyebrow (see above).
- **`.hero-space`** — the home/chat cinematic backdrop: layered radial gradients
  (violet top-right, magenta, cyan) over near-black `#05080f`.
- **`.app-ambient`** — subtle ambient glow behind interior screens (cyan
  top-right, violet bottom-left, ~5% opacity).
- **Motion** (pure CSS, `prefers-reduced-motion` guarded):
  - `.stagger-in` — cascades a page's top-level sections in (rise + fade, 0.04s→0.32s stagger). "Systems coming online."
  - `.fade-in` — opacity-only entrance for hero screens (home/chat).
  - `.hairline-draw` — the PageHeader rule draws in from the left.

Status dot pattern (recurring): `h-2 w-2 rounded-full` + `box-shadow: 0 0 8px <color>` (a small glow).

---

## Shared shell (every screen)
- **NavRail** (left, 208px): sectioned labelled sidebar — **MISSION / OPERATE /
  BUILD / SELF** groups + an **AGENTS** block (colored identity dots) + an
  Operator card at the bottom. Active item: cyan left-bar + cyan icon.
- **TopBar** (h-14): breadcrumb `operator / local / <Page>`, an "ALL SYSTEMS"
  pulse, a live clock, and a `⌘K` command-palette button.
- **PageHeader** (interior screens): glass icon-chip (accent glow) + tracked
  section eyebrow + `font-display` title + optional right-side telemetry chips +
  a fading hairline rule. *(Chat does not use PageHeader — it has its own hero.)*

---

## Pilot: `/chat` (Hermes) — component inventory

Owning code: `app/chat/page.tsx` (server, reads agents) + **`components/chat/chat-client.tsx`** (all UI + logic).

1. **History rail** (left, ~240px, `border-r`): a **"+ Yeni sohbet"** button, then
   conversation rows — each: a small **agent badge** (e.g. `GROK`), the
   auto-derived **title**, and `<n> mesaj · <relTime>`. Selected row is
   highlighted. *(Local-first: conversations live in `localStorage`.)*

2. **Agent pills** (top of chat column): one pill per **authed** provider —
   **Grok / Codex / Gemini / Copilot / OpenAI**. Each pill carries a **key-health
   dot** (green ok / amber exhausted / red error). The default provider's pill
   shows a **VARSAYILAN** badge. Active pill exposes a **model dropdown**
   (e.g. `grok-4.3`). *Observability touch: you pick an agent while seeing whether
   its keys can actually answer.*

3. **Transcript**:
   - **User message** — right-aligned, filled cyan-tinted bubble.
   - **Assistant message** — left-aligned `.panel` bubble, prefixed with a
     **provenance label** (`✦ GROK`) = which agent produced it.
   - Token-by-token streaming; a tool-progress indicator; a token/cost footer.

4. **Empty state (hero)** — `.hero-space` backdrop, an **orbit motif** (elliptical
   ring), a small `HERMES-AGENT` eyebrow, big **"Hermes"** (`font-display`), and a
   prompt line *"Yeni bir konuşma başlat — yaz ya da mikrofonla konuş (Grok)"*.
   See `chat-01-empty-hero.png`.

5. **Composer** (bottom): a textarea *"Mesaj yaz veya mikrofonla konuş…"*, a **mic
   button** (Web Speech API, tr-TR voice input), and a cyan **send** button.
   Hint: *"Enter ile gönder · Shift+Enter yeni satır"*.

---

## What "applying to Hermes" means (for the return trip)
Keep **all data/logic** (`lib/hermes/*` readers, `app/api/chat` streaming route,
agent resolution, localStorage history, Web Speech). **Re-skin only the
presentational layer** of `components/chat/chat-client.tsx`. The conversation
never breaks; only the look changes. Tailwind v4 — prefer the `@theme` tokens
above over hard-coded hex.
