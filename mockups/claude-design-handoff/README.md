# Claude Design handoff — Astra OS pilot: `/chat`

This folder is a **package to open in Claude Design**, refine the look, then send
the resulting bundle back to Claude Code to apply to the real app. Pilot screen:
**`/chat` (Hermes)**.

## What's in here
| file | what it is |
|---|---|
| `chat-01-empty-hero.png` | `/chat` empty state — the cinematic "Hermes" hero |
| `chat-02-conversation.png` | `/chat` with a conversation — bubbles, agent provenance, history rail, agent pills |
| `DESIGN-SYSTEM.md` | the visual system: real color/type tokens, primitives, and the chat component inventory |
| `FONTS.md` + `fonts/` + `fonts.css` | the brand fonts (Sora · Geist · Geist Mono, open-source). Fixes Claude Design's "Missing brand fonts" warning — upload the `.woff2` files or load them from Google Fonts |

## The round-trip
1. **(me → you)** This package + the live repo.
2. **(you, in Claude Design)** Open it. For the truest start, point Claude Design's
   onboarding at the repo so it reads the real code/tokens:
   **https://github.com/senchh/astra-os** — the chat UI is
   `components/chat/chat-client.tsx`. The two PNGs + `DESIGN-SYSTEM.md` are the
   visual reference. Refine the chat screen there.
3. **(you, in Claude Design)** When happy, export the **handoff bundle** (the
   "package for Claude Code" Claude Design produces).
4. **(you → me)** Drop the bundle in the repo (e.g. `mockups/claude-design-handoff/return/`)
   and tell me to apply it.
5. **(me)** I apply it to Hermes — see the rule below.

## The one rule when it comes back
**Keep all logic, re-skin only the presentation.** Astra is server-components +
`lib/hermes/*` readers + CLI/API write routes; the data wiring, streaming,
agent-health, localStorage history and voice input must stay. I take the new
visual design and reapply it to the presentational layer of
`components/chat/chat-client.tsx` (and `globals.css` tokens if the palette/fonts
change) — the conversation never breaks, only the skin changes.

## Scope note
This is a **pilot** (one screen) to prove the round-trip. If the returned chat
applies cleanly, I'll package the rest of the screens (Control Room, Activity,
Board, Cron master-detail, Sessions, Memory, Settings, Run, Profiles, Skills,
Dream, Goals, and the home Orrery) the same way.

> Tip for Claude Design: Astra's identity is the **deep-space war-room** look —
> signal-cyan on navy, Sora + Geist Mono, sparing accents, an observability touch
> on every surface. Please evolve that language; don't replace it with a warm /
> generic SaaS theme.
