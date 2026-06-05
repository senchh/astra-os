# Brand fonts — fixes the "Missing brand fonts" warning

Claude Design showed *"Missing brand fonts — Claude is rendering typography with
substitute web fonts."* Astra uses three fonts; all are **free / open-source (SIL
OFL)**, so you can add them. This folder now ships them.

| role | font | weights | where it's used |
|---|---|---|---|
| **Display** | **Sora** | 300, 400, 600, 700 | hero titles, page titles, stat numbers (`font-display`) |
| **Sans / body** | **Geist** | 400, 500, 600, 700 | all UI text |
| **Mono / data** | **Geist Mono** | 400, 500 | metrics, ids, schedules, the tracked uppercase `.label` eyebrows |

## Two ways to resolve in Claude Design

**A — Upload the files (most reliable).** Add the `.woff2` files in `fonts/` as the
project's brand fonts. They cover **latin + latin-ext**, so Turkish glyphs
(ş ğ İ ı ç ö ü) render correctly. `fonts.css` has ready `@font-face` rules
(paths are relative to this folder).

**B — Load from Google Fonts.** All three are on Google Fonts, so instead of
uploading you can point Claude Design at:

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
```

Family names to set: `Sora`, `Geist`, `Geist Mono`.

## Mapping (so substitutes aren't picked again)
- Anything `font-display` / headings / big numbers → **Sora**
- Default body / buttons / inputs → **Geist**
- `.label`, metrics, code, ids, timestamps → **Geist Mono**

> These are the same fonts the app loads via `next/font/google` in
> `app/layout.tsx` — so the handoff renders byte-for-byte like the screenshots.
