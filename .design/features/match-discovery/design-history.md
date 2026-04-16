# Design History

This file contains a chronological record of key design updates and decisions for Match Discovery. See `.design/README.md` for format guidelines.

---

## 2026-04-16

### [Update] My Events includes saved bookmarks
- **My Events** lists matches the user created, joined (ref/waiting/notify), and matches they **saved for later** from discovery; saved items stay in the main Events list too.
- Match detail adds **Save for later** / **Saved for later** (not shown to the event creator); cards can show a **Saved** chip when bookmarked.

## 2026-04-15

### [Update] Initial browse and discovery screens
- Home screen with Live Now / Upcoming tabbed view
- Match cards show title, level badge, location, time, ref count, and spectator count
- Live indicator with pulsing red dot
- Join by code page for private matches with 6-character input

## 2026-04-15 (update 2)

### [Update] Ref Code join flow and waiting room
- "Join with Code" page renamed to "Enter Ref Code" — now specifically for referees
- Nav tab renamed from "Join" to "Ref Code" with microphone icon
- Match cards now show "X in lobby" badge for upcoming matches with waiting refs
- Removed match level badge from cards (level no longer set on creation)
- Match detail page redesigned: Ref Code visible to crew, waiting room section, "Notify Me When Live" button
- Spectators join directly from match detail — no code needed
- "Join Waiting Room (as Referee)" button on match detail for upcoming matches (alternative to code entry)
