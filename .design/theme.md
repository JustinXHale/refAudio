# refOpenMic — Visual theme

**Purpose:** Single reference for color, surfaces, and how UI libraries consume tokens so the product stays visually consistent.

**Source of truth (code):**
- **Material UI theme:** `src/theme/muiTheme.ts` (`appTheme`)
- **Legacy / utility CSS:** `src/index.css` (`@theme` and component classes — keep aligned with this doc)

**Last updated:** 2026-04-16

---

## Palette: Studio (dark green + amber)

Inspired by pitch-side / field officiating: **dark forest green** anchors the brand and primary actions; **amber** signals secondary emphasis, warnings-adjacent UI, and warm contrast without competing with semantic reds.

| Role | Token | Hex | Usage |
|------|--------|-----|--------|
| Primary | `primary.main` | `#166534` | Filled primary buttons, selected nav, key brand moments |
| Primary light | `primary.light` | `#15803d` | Hover states, lighter green emphasis |
| Primary dark | `primary.dark` | `#14532d` | Pressed / strong green surfaces |
| Primary on text | `primary.contrastText` | `#ffffff` | Text/icons on primary-colored surfaces |
| Secondary | `secondary.main` | `#b45309` | Outlined secondary actions, accent chips, warm highlights |
| Secondary light | `secondary.light` | `#d97706` | Hover on amber, brighter accents |
| Secondary dark | `secondary.dark` | `#92400e` | Stronger amber text on light surfaces |
| Secondary contrast | `secondary.contrastText` | `#fffbeb` | Text on amber fills |

**Info channel:** `info.*` matches **primary green** so `color="info"` stays aligned with the main brand hue.

---

## Surfaces & structure

| Token | Hex | Usage |
|-------|-----|--------|
| `background.default` | `#f0fdf4` | App canvas behind content (very light green tint) |
| `background.paper` | `#ffffff` | Cards, app bars, sheets |
| `divider` | `rgba(22, 101, 52, 0.12)` | Hairlines; ties dividers to primary hue |

**Dark / full-bleed screens** (e.g. match room): use **MUI `grey.900`** (or dedicated dark tokens in component `sx`), not this light palette—for contrast and OLED-friendly chrome.

---

## Semantic colors (do not repurpose)

These come from MUI defaults; **do not** swap brand greens/ambers in their place for these meanings.

| Meaning | Typical use |
|---------|-------------|
| **Error / LIVE** | Destructive actions, live badges, recording danger states |
| **Warning** | Private events, admin warnings |
| **Success** | Connected, notifications on, positive confirmation |
| **Info** | Neutral informational (aligned to **green** in our theme) |

---

## Implementation rules

1. **Prefer theme tokens** — Use `color="primary"`, `color="secondary"`, `sx={{ color: 'primary.main' }}`, or `theme.palette.*` — avoid raw hex in new UI except in `muiTheme.ts` / `index.css` `@theme`.
2. **Tailwind** — Use `primary`, `primary-dark`, `secondary`, etc. from `@theme` in `index.css`; add a token there if you need a new utility class.
3. **Accessibility** — Small **body text** on white: prefer **`primary.dark`** for green text; use **`secondary.dark`** for amber text on light surfaces. Filled buttons use `contrastText` from the palette.
4. **PWA** — `index.html` `theme-color` matches **`primary.main`** for the OS status bar.

---

## Related documents

- `.design/README.md` — design folder overview  
- `.design/features/core/design-history.md` — UX history including shell/navigation  

When you change this palette, update **`src/theme/muiTheme.ts`**, **`src/index.css` `@theme`**, **`index.html` `theme-color`**, and **this file** together.
