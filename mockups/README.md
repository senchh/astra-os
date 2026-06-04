# Astra OS — Phase 6 (Cinematic UI) design exploration

Static mockups of the **Mission Control / home** + a **working screen**, built to
choose a premium visual direction before touching app code. Open them with any
static server, e.g.:

```bash
cd mockups && python3 -m http.server 8799   # → http://127.0.0.1:8799/c-cinematic.html
```

Same content across the directions so the comparison is apples-to-apples. All three
deliberately avoid generic "AI-slop" aesthetics (no Inter/system fonts, no purple-on-white
gradients, no blur-everything glassmorphism).

| File | Direction | Type | Character |
|---|---|---|---|
| `a-instrument.html` | **Observatory Instrument** | IBM Plex Mono / Sans | aerospace/instrument precision — hairlines, tabular numbers, single accent, grain, **no glow**. Strong on dense data screens, cool as a hero. |
| `b-editorial.html` | **Editorial Deck** | Instrument Serif + Hanken Grotesk | Linear/Vercel-grade premium — serif display headings, gradient stat cards, sparklines. Most universally "premium product", ages best. |
| `c-cinematic.html` | **Cinematic Hero** | Sora + Geist Mono | atmospheric home — big animated Orrery, ambient starfield, telemetry ticker, HUD chips. Best "front door" / sells in a screenshot. |
| `c-working.html` | **Cinematic — data register** | Sora + Geist Mono | the cinematic *language* applied to a real working screen (Control Room), **drama dialed down** (no starfield, glow only on accents, mono data) — proof it stays readable. |

`mock-*.png` are rendered previews of each (1440×900).

## Current decision (in progress — 2026-06-04)

Leaning **C (cinematic)**, understood as a **two-register system**, not "drama everywhere":

- **Home** → full cinematic hero (Orrery + starfield + telemetry ticker) = the showcase / *"your agent stack, in orbit."*
- **Working screens** → same language (Sora + Geist Mono + deep-space palette + restrained accent glow), **dialed to data-mode** (see `c-working.html`) = readable, serious.

Palette stays the established Astra identity (deep navy `#04070e`, signal cyan `#2ad6f0`,
amber/green/violet/red status, agent-identity colors). New: **Sora** display + **Geist Mono**
data; ambient starfield + Orrery glow on home only.

**Next step:** build the home hero as the pilot (real data), lock the signature, then prove
the working-screen register on Control Room and roll out. Not yet committed to app code.
User likes C but hasn't fully locked it — revisit fonts / accent / Orrery form / ticker before building.
