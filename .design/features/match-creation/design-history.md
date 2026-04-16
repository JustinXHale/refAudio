# Design History

This file contains a chronological record of key design updates and decisions for Match Creation. See `.design/README.md` for format guidelines.

---

## 2026-04-16

### [Update] Optional event cover image
- Create flow includes **10 preset thumbnails** (stable placeholder URLs) plus **upload your own** (compressed JPEG data URL for POC); optional — cards and match detail show the image when set.

## 2026-04-15

### [Update] Initial match creation flow
- Single-page form with required fields: title, level, location, date/time
- Toggle switches for "Allow Spectators" (default on) and "Private Match" (default off)
- Auto-generates 6-character join code for private matches
- Redirects to match detail page on creation

## 2026-04-15 (update 2)

### [Update] Simplified to Ref Code model
- Removed "Private Match" toggle — all matches are now public/discoverable
- Removed "Match Level" dropdown — simplified form
- Every match auto-generates a Ref Code shown after creation
- Added info box explaining "How joining works" (ref code vs spectator access)
- Form now only has: title, location, date/time, and "Allow Spectators" toggle

## 2026-04-15 (update 3)

### [Update] Dual-code system and configurable max refs
- Re-introduced "Private Event" toggle — controls whether spectators need a code, not ref access
- Added "Max Referees" slider (1–10, default 5) so organizer can set crew size
- Info box updated to explain both codes: ref code always, spectator code only if private
- Private events generate a separate spectator code on creation
