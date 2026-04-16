# Design History

This file contains a chronological record of key design updates and decisions for refOpenMic core product. See `.design/README.md` for format guidelines.

---

## 2026-04-16

### [Update] Studio color theme (dark green + amber)
- See **`.design/theme.md`** for palette tokens and usage rules; primary forest green and secondary amber with a very light green-tinted app canvas for a pitch-side, field-officiating feel.

### [Update] Material Design (MUI) layout across PWA
- Adopted Material UI with a shared theme, top app bars, bottom navigation, cards, and form controls so screens follow consistent Material patterns on mobile.

## 2026-04-15

### [Decision] PWA POC then Flutter production
- See decision doc: `.design/decisions/2026-04-15-pwa-poc-strategy.md`
- Building React PWA first to validate concept in 2-3 weeks
- Will rebuild as Flutter native app after validation
- Faster to user feedback, lower risk approach

### [Discussion] Public vs private matches as default
- See decision doc: `.design/decisions/2026-04-15-public-by-default.md`
- Decided matches should be public and searchable by default

### [Decision] Communication layer only
- Scoped refOpenMic to voice communication and match discovery only
- Match timers, event logging, and referee workflows belong in reflog (separate app)
- Maintains focus and enables integration with other apps

### [Decision] Spectator mode as core feature
- Spectators can listen to referee communications (receive-only)
- Supports transparency and community engagement
- Match creators can disable if needed for private events

### [Update] Removed push-to-talk from MVP
- Decided on full-duplex (always-on) voice for MVP
- Simpler UX, matches traditional referee radio behavior
- Push-to-talk may be added as optional mode in Phase 2

### [Decision] Accept cellular dependency trade-off
- App requires cellular/WiFi connection (no mesh networking in MVP)
- Trade-off: Lower cost and use existing hardware vs offline capability
- Acceptable because most fields have coverage and grassroots refs are primary users

### [Update] Initial PWA implementation scaffolded
- Built all MVP screens: home (live/upcoming tabs), create match, match detail, match room, join by code, login, profile
- Mobile-first layout with bottom navigation, sticky headers, and safe-area support
- Dark theme for in-match room to reduce distraction during field use

### [Decision] Bottom navigation with 4 tabs
- Home, Create, Join (by code), Profile/Sign In
- Create tab only visible when authenticated
- Matches accessible principle: browse without auth, join requires sign-in

### [Update] Match room UI designed for field conditions
- Large touch targets for mute/leave controls (64px circular buttons)
- Dark background to reduce screen glare on field
- Audio visualization bars to confirm connection is active
- Minimal UI to avoid distraction during officiating

## 2026-04-15 (update 2)

### [Update] Added "My Matches" tab to home screen
- Three-tab home: Live Now, Upcoming, My Matches
- My Matches shows all matches the user created or joined
- Only visible when signed in

### [Update] Pre-match referee lobby on match detail
- Referees can see who has connected before match starts
- Shows green connection status for each ref
- Creator/admin badges visible in lobby

### [Decision] Admin role system for match rooms
- Match creator can grant admin rights to any referee in the room
- Admins can: see all participants, mute/unmute individuals, mute all, remove participants
- Only the original creator can grant/revoke admin rights
- Admin panel slides down from header in match room

### [Update] Removed match level from creation form
- Simplified create match flow by removing the level dropdown

## 2026-04-15 (update 3)

### [Decision] Ref Code access model — separating refs from spectators
- See decision doc: `.design/decisions/2026-04-15-ref-code-access-model.md`
- Every match gets a 6-character Ref Code shared with the officiating crew
- Only refs with the code get microphone access; spectators listen freely from public listing
- Replaced the "public vs private" match model — all matches are now discoverable
- Matches the real-world workflow: "text your crew the ref code"

### [Update] Waiting room for upcoming matches
- Refs who enter a Ref Code before the match starts land in a waiting room
- Waiting room visible on match detail page to organizer and waiting refs
- All waiting room refs auto-connect when the organizer starts the match

### [Update] Notify Me When Live
- Spectators can tap "Notify Me When Live" on upcoming matches
- On match start, console notification logged (browser push notifications deferred to Flutter phase)
- Button toggles between subscribed/unsubscribed states

### [Update] Redesigned join flow
- Bottom nav "Join" renamed to "Ref Code" with microphone icon
- Ref Code entry page explains the flow: enter code → waiting room (upcoming) or direct connect (live)
- Match detail page: spectators join directly, refs need the code
- Removed "Join as Referee" button from match detail (requires Ref Code instead)

### [Update] Removed Private Match toggle
- Matches are always public/discoverable
- The Ref Code handles access control for the mic channel
- Simplifies match creation form

## 2026-04-15 (update 4)

### [Decision] Dual-code system: Ref Code + Spectator Code
- Every match always gets a **Ref Code** (for officiating crew, full-duplex audio)
- Private events also get a **Spectator Code** (for invited spectators to listen)
- Public matches: spectators find and listen from the home screen, no code needed
- Private matches: hidden from public listing, spectators need the code to access
- Updated decision doc: `.design/decisions/2026-04-15-ref-code-access-model.md`

### [Update] Configurable max referees
- Organizer can set max refs from 1–10 (default 5) at match creation
- Adjustable on the match detail page before match starts (admin only)
- Accommodates different crew sizes across sports and levels

### [Update] Re-introduced Private Event toggle
- Brought back "Private Event" toggle on create match form
- Private: hidden from public listing, spectators need a Spectator Code
- Public (default): visible on home screen, anyone can listen
- Different from the original "Private Match" — now only affects spectator visibility, not ref access

### [Update] Join Code page handles both code types
- Renamed nav tab from "Ref Code" to "Join Code"
- Code entry page auto-detects whether the entered code is a ref code or spectator code
- Ref code → join as referee (waiting room or direct connect)
- Spectator code → navigate to match detail to listen
- Explainer text at bottom distinguishes the two code types

## 2026-04-15 (update 5)

### [Update] Moved "My Events" from home screen to profile
- Home screen simplified to two tabs: Live Now, Upcoming
- Profile page now has two tabs: Profile (account info + sign out), My Events (user's matches)
- My Events badge shows count when user has matches
- Keeps the home screen focused on discovery
