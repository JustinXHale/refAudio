# refOpenMic — Visual theme

**Purpose:** Single reference for color, surfaces, and how UI libraries consume tokens so the product stays visually consistent.

**Source of truth (code):**
- **Material UI theme:** `src/theme/muiTheme.ts` (`appTheme`)
- **Legacy / utility CSS:** `src/index.css` (`@theme` and component classes — keep aligned with this doc)

**Last updated:** 2026-04-16

---

## Palette: Studio (deep purple + cyan)

Inspired by a professional audio / control-room feel: **purple** anchors the brand and primary actions; **cyan** signals emphasis, metadata, and “active” accents without replacing semantic reds/greens.

| Role | Token | Hex | Usage |
|------|--------|-----|--------|
| Primary | `primary.main` | `#7c3aed` | Filled primary buttons, selected nav, key brand moments |
| Primary light | `primary.light` | `#8b5cf6` | Hover states, light emphasis on purple |
| Primary dark | `primary.dark` | `#6d28d9` | Pressed / strong purple surfaces |
| Primary on text | `primary.contrastText` | `#ffffff` | Text/icons on primary-colored surfaces |
| Secondary | `secondary.main` | `#06b6d4` | Outlined secondary actions, accent chips, icons |
| Secondary light | `secondary.light` | `#22d3ee` | Highlights, subtle cyan glows |
| Secondary dark | `secondary.dark` | `#0891b2` | Cyan text on light backgrounds where needed |
| Secondary contrast | `secondary.contrastText` | `#042f2e` | Text on light cyan fills (MUI default-friendly) |

**Info channel:** `info.*` matches **secondary cyan** so `color="info"` (chips, alerts) stays on-brand with accents.

---

## Surfaces & structure

| Token | Hex | Usage |
|-------|-----|--------|
| `background.default` | `#f8f5ff` | App canvas behind content (slight violet tint) |
| `background.paper` | `#ffffff` | Cards, app bars, sheets |
| `divider` | `rgba(109, 40, 217, 0.12)` | Hairlines; ties dividers to primary hue |

**Dark / full-bleed screens** (e.g. match room): use **MUI `grey.900`** (or dedicated dark tokens in component `sx`), not this light palette—for contrast and OLED-friendly chrome.

---

## Semantic colors (do not repurpose)

These come from MUI defaults; **do not** swap purple/cyan in their place.

| Meaning | Typical use |
|---------|-------------|
| **Error / LIVE** | Destructive actions, live badges, recording danger states |
| **Warning** | Private events, admin warnings |
| **Success** | Connected, notifications on, positive confirmation |
| **Info** | Neutral informational (aligned to **cyan** in our theme) |

---

## Implementation rules

1. **Prefer theme tokens** — Use `color="primary"`, `color="secondary"`, `sx={{ color: 'primary.main' }}`, or `theme.palette.*` — avoid raw hex in new UI except in `muiTheme.ts` / `index.css` `@theme`.
2. **Tailwind** — Use `primary`, `primary-dark`, `secondary`, etc. from `@theme` in `index.css`; add a token there if you need a new utility class.
3. **Accessibility** — Small **body text** on white: prefer **`primary.dark`** for purple text; use **`secondary.dark`** for cyan text on light surfaces. Filled buttons use `contrastText` from the palette.
4. **PWA** — `index.html` `theme-color` matches **`primary.main`** for the OS status bar.

---

## Related documents

- `.design/README.md` — design folder overview  
- `.design/features/core/design-history.md` — UX history including shell/navigation  

When you change this palette, update **`src/theme/muiTheme.ts`**, **`src/index.css` `@theme`**, **`index.html` `theme-color`**, and **this file** together.
