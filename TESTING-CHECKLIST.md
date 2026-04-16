# LiveKit Voice Integration — Testing Checklist

## Before You Start

### GitHub Secrets (required for deployed site)
- [ ] Go to **GitHub repo → Settings → Secrets and variables → Actions**
- [ ] Add secret: `VITE_LIVEKIT_API_KEY` = `APIEE6623VAJUfq`
- [ ] Add secret: `VITE_LIVEKIT_API_SECRET` = `Ft0XxU6LmJdpR3K6IY8WeeUk0WTyWIm3iNCvlcxaGGl`
- [ ] Trigger a redeploy (push a commit or manually run the workflow)

### Local Testing (faster feedback loop)
- [ ] Confirm `.env` has all three `VITE_LIVEKIT_*` variables set
- [ ] Run `npm run dev` and open `http://localhost:5173`
- [ ] Use a real browser (Chrome recommended) — not an embedded preview

---

## Test 1: Demo Mode (Sanity Check)

Confirm demo mode still works and LiveKit is NOT involved.

- [ ] Sign in with **Try Demo Mode**
- [ ] Tap the live event card → Event Details
- [ ] Tap **Enter Event Room**
- [ ] Confirm you see "Demo Mode — audio simulated locally" at the bottom
- [ ] Confirm "Connected" shows after ~1.5 seconds
- [ ] Tap mute/unmute — UI toggles
- [ ] Tap the red hang-up button — returns to event detail

---

## Test 2: Single-User Room (Real Firebase + LiveKit)

Test that a single ref can connect to a real LiveKit room.

- [ ] Sign in with **email/password** or **Google** (not demo mode)
- [ ] Tap **Create** → fill in event title, location, time → **Create Event**
- [ ] On the event detail page, tap **Start Event**
- [ ] Tap **Enter Event Room**
- [ ] **Browser should ask for microphone permission** → Grant it
- [ ] Status should change from "Connecting mic and audio..." → **"Connected"**
- [ ] You should see "Your mic is live" (not "Demo Mode" footer)
- [ ] Audio bars should animate (green pulsing)
- [ ] Tap the **mute button** → bars stop animating, text says "Your mic is muted"
- [ ] Tap mute again → bars resume, "Your mic is live"
- [ ] Tap the **red hang-up button** → returns to event detail
- [ ] If connection fails, note the error message displayed

---

## Test 3: Two-Way Audio (The Real Test)

This is the core POC validation. Requires **two devices** (or two browser tabs on the same machine — one in incognito).

### Device A (Creator / Ref)
- [ ] Sign in, create an event, start it, enter the room
- [ ] Confirm "Connected" and mic is live
- [ ] Note the **Ref Code** from the event detail page

### Device B (Second Ref)
- [ ] Sign in with a **different account** (or different email)
- [ ] Tap **Join Code** in the bottom nav
- [ ] Enter the Ref Code from Device A
- [ ] Navigate to the event detail → tap **Enter Event Room**
- [ ] Grant mic permission
- [ ] Confirm "Connected"

### Two-Way Audio Check
- [ ] **Speak into Device A** → Can you hear it on Device B?
- [ ] **Speak into Device B** → Can you hear it on Device A?
- [ ] Is there noticeable delay? (Target: <300ms)
- [ ] Is there echo or feedback? (Should be suppressed)
- [ ] Mute on Device A → Device B should stop hearing Device A
- [ ] Unmute on Device A → Audio resumes

---

## Test 4: Spectator Mode (Listen Only)

- [ ] On Device B (or a third device), sign in with another account
- [ ] Browse live events on the home screen
- [ ] Tap the live event → tap **Listen as Spectator**
- [ ] Enters the room with "SPECTATOR (Listen Only)" chip
- [ ] **No mute button should appear** (spectators can't transmit)
- [ ] Speak on Device A (ref) → spectator should hear it
- [ ] Spectator leaves → ref audio unaffected

---

## Test 5: Edge Cases

- [ ] **Deny mic permission** → Should show error, not crash
- [ ] **Poor network** → Does it show "Reconnecting..." and recover?
- [ ] **Close tab without leaving** → Other participants should see disconnect
- [ ] **End event while in room** → Should redirect to event detail page
- [ ] **Multiple mute/unmute rapidly** → Should not break audio state

---

## Test 6: Bluetooth Headset (Bonus)

- [ ] Connect AirPods or another Bluetooth headset
- [ ] Enter a room as a ref
- [ ] Confirm audio routes through the headset (not phone speaker)
- [ ] Confirm mic input comes from the headset

---

## Results Log

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| Demo mode sanity | | |
| Single-user connect | | |
| Two-way audio | | |
| Audio latency | | |
| Echo suppression | | |
| Spectator listen-only | | |
| Mic permission denied | | |
| Bluetooth headset | | |

---

## Known Limitations (POC)

- **Token generation is client-side** — API secret is in the browser bundle. Acceptable for POC testing with trusted users. Must move to a Cloud Function before any public release.
- **Admin controls (mute/remove others)** work in demo mode only. Wiring to Firestore + LiveKit server API is a follow-up.
- **No auto-reconnect logic beyond LiveKit's built-in retry** — if a connection permanently fails, the user needs to leave and re-enter the room.
- **Browser autoplay policies** — some mobile browsers may require a user tap before audio plays. If spectators don't hear anything, have them tap the screen first.
