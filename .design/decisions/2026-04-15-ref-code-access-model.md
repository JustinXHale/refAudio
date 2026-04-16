# Ref Code Access Model

**Date:** 2026-04-15
**Status:** Decided
**Deciders:** Product owner

## Context

We needed to separate referees from the general public in the joining flow. The original model had "public" and "private" matches, where private matches used a join code for all access. This didn't align with the real-world use case: matches should still be discoverable (public listing for spectators), but only the officiating crew should have microphone access.

## Options Considered

### Option A: Approval Queue
- Organizer manually approves each person who requests to join as referee.
- Pros: Fine-grained control.
- Cons: Adds friction at match time when refs are busy setting up on the field. Requires organizer to be actively managing the queue.

### Option B: Ref Code (Selected)
- Every match gets a 6-character Ref Code. Only people with the code can join as referee.
- Spectators join directly from the public listing — no code needed.
- Pros: Matches real-world workflow ("text your crew the code"). No approval friction. Simple to understand.
- Cons: Code could be shared beyond intended crew. Mitigated by max 5 refs limit and ability to remove people.

### Option C: Invite List
- Organizer pre-selects specific users who can ref.
- Pros: Most secure. No code to leak.
- Cons: Requires all refs to have accounts first. Doesn't work for pickup games or last-minute crew changes. High friction.

## Decision

**Option B: Ref Code.** It matches how refs actually coordinate — "here's the code, connect when you get to the field." Combined with the waiting room and admin controls (remove/mute), it provides enough control without adding friction.

## Implementation Details

### Dual-Code System
Every match gets two types of codes serving different purposes:

1. **Ref Code** (always generated) — shared with the officiating crew. Grants full-duplex audio.
2. **Spectator Code** (only if private) — shared with invited spectators for private events.

### Public vs Private
- **Public matches** (default): visible on the home screen. Anyone can listen. Refs still need the Ref Code.
- **Private matches** (opt-in): hidden from public listings. Spectators need the Spectator Code to find and listen. Refs still use the Ref Code.

### Configurable Max Refs
The organizer can set the maximum number of referees (1–10) at creation time and adjust it before the match starts. Default is 5 (typical crew: Ref + 2 ARs + TMO + Reserve).

### Code Entry
The "Join Code" page accepts either code type. It auto-detects whether the entered code is a ref code (→ joins as referee) or spectator code (→ navigates to match detail to listen).

### Waiting Room
- Entering a Ref Code for an upcoming match places the ref in a **waiting room**.
- All waiting room refs auto-connect when the organizer starts the match.
- Entering a Ref Code for a live match connects the ref immediately.

## Related Changes

- Added `refCode`, `spectatorCode?`, `waitingRoom: string[]`, `notifyList: string[]`, `isPrivate` to Match data model.
- `maxRefs` is now configurable (1–10) instead of fixed at 5.
- Added "Notify Me When Live" button for spectators on upcoming public matches.
- "Join Code" page handles both code types with auto-detection.
- Match detail page shows Ref Code to crew and Spectator Code to admins (private matches only).
