# refOpenMic - Technical Specification

**Version:** 1.0
**Last Updated:** 2026-04-15
**Status:** POC Phase - PWA Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [POC Strategy](#poc-strategy)
3. [Technical Constraints](#technical-constraints)
4. [User Roles](#user-roles)
5. [Feature Requirements](#feature-requirements)
6. [User Flows](#user-flows)
7. [Data Models](#data-models)
8. [Technical Architecture](#technical-architecture)
9. [API Specifications](#api-specifications)
10. [Security & Privacy](#security--privacy)
11. [Performance Requirements](#performance-requirements)
12. [Future Considerations](#future-considerations)

---

## Overview

refOpenMic is a mobile-first platform that enables real-time voice communication for referee teams using existing smartphones and Bluetooth headsets. Matches are public and discoverable by default. Referees join via a shared **Ref Code**; spectators can listen from the public listing.

### Core Use Case
A referee creates a match for "Oak Park HS vs Lincoln" and gets a Ref Code (e.g. `HX7K9P`). They text their crew: "here's the ref code, connect when you get to the field." Four refs enter the code in the app and land in a waiting room. When the match starts, all waiting refs auto-connect with full-duplex voice. Meanwhile, 23 spectators browse the public match list, find the match, and listen to the referee communications in real-time.

---

## POC Strategy

**Decision:** Build PWA first to validate concept, then rebuild as Flutter native app.
**Rationale:** See `.design/decisions/2026-04-15-pwa-poc-strategy.md`

### Phase 0: PWA Proof of Concept (2-3 weeks)

**Tech Stack:**
- **Frontend:** React + TypeScript + Vite
- **UI:** Material UI (MUI) + Emotion (Material Design layout and components)
- **Auth:** Firebase Authentication
- **Database:** Cloud Firestore
- **Voice:** LiveKit React SDK
- **Hosting:** Vercel or Firebase Hosting

**Goals:**
- Validate audio quality over cellular/WiFi
- Test spectator mode (listen-only) reliability
- Validate public match discovery model
- Measure real-world latency
- Identify critical UX issues

**Scope:**
- Core MVP features only
- 5-10 local refs testing during real matches
- Basic UI (mobile-optimized web)
- No app store submission

**Success Criteria:**
1. Audio latency <500ms (acceptable for officiating)
2. 5+ refs test during actual matches
3. Spectator mode works without dropouts
4. Refs say they would use this over radios
5. No critical UX blockers

### Phase 1: Flutter Production App (4-6 weeks)

**Tech Stack:**
- **Frontend:** Flutter (iOS + Android)
- **Auth:** Firebase Authentication (same)
- **Database:** Cloud Firestore (same)
- **Voice:** LiveKit Flutter SDK
- **Distribution:** App Store + Google Play

**Migration:**
- Firebase backend stays identical
- LiveKit configuration stays identical
- Data models reuse from POC
- UI/client code rewritten in Flutter

**Improvements over POC:**
- Full Bluetooth headset optimization
- Background audio support
- Native performance
- App store presence
- Phase 2 features based on POC learnings

### Why This Approach

**Advantages:**
- Faster to user feedback (1-2 weeks vs 4-6 weeks)
- Lower risk (validate before major investment)
- Learn what refs actually need
- Informed Flutter build (build the right thing)

**Trade-offs:**
- Rebuild work after POC
- PWA limitations during testing (Bluetooth, background audio)
- No app store presence initially

---

## Technical Constraints

### Hard Limits (MVP)

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max active refs per match | 10 (default 5) | Configurable by organizer. Default covers Ref + 2 ARs + TMO + reserve |
| Max spectators per match | 100 | Start conservative, scale based on testing |
| Audio latency target | <300ms | Acceptable for real-time officiating |
| Minimum supported iOS | 14.0 | WebRTC support |
| Minimum supported Android | 8.0 (API 26) | WebRTC support |
| Network requirement | Cellular data or WiFi | No mesh networking in MVP |

### Accepted Trade-offs

**We Accept:**
- Dependency on cellular/WiFi coverage
- Potential for network dropouts
- Battery drain from continuous audio

**We Do NOT Accept:**
- High audio latency (>500ms unusable)
- Frequent disconnections
- Poor audio quality
- Complex setup flows

---

## User Roles

### 1. Match Creator (Organizer)
**Capabilities:**
- Create matches (always public/discoverable)
- Configure match metadata and spectator access
- Share Ref Code with officiating crew
- Grant/revoke admin rights to other refs
- Start/end match
- Remove participants, mute individuals or all

**Limitations:**
- Same audio permissions as other refs
- Cannot modify match after it goes live (MVP)

### 2. Admin (Delegated by Creator)
**Capabilities:**
- Start/end match
- See all participants, mute/unmute, remove people
- Same full-duplex audio as regular refs

**Limitations:**
- Cannot grant admin to others (only creator can)
- Cannot remove the creator

### 3. Referee (Active Participant)
**Capabilities:**
- Join match using Ref Code (6-character code shared by organizer)
- Pre-join waiting room for upcoming matches (auto-connect on match start)
- Full-duplex voice transmission and reception
- See connection status of other participants
- Leave match

**Limitations:**
- Max 5 per match
- Requires Ref Code — cannot self-promote from spectator to ref

### 4. Spectator (Listener)
**Capabilities:**
- Browse public matches (live and upcoming)
- Join live matches as listener (no code needed)
- Subscribe to "Notify Me When Live" for upcoming matches
- Receive audio stream from refs
- Leave match

**Limitations:**
- Zero transmission capability (receive-only)
- Subject to max spectator limit per match

### 5. Unauthenticated User
**Capabilities:**
- Browse public matches (read-only)
- View match details

**Limitations:**
- Cannot join matches (audio)
- Cannot create matches

---

## Feature Requirements

### MVP (Must-Have)

#### Authentication
- [ ] Sign in with Email/Password (Firebase Auth)
- [ ] Sign in with Google (Firebase Auth)
- [ ] Sign in with Phone Number (Firebase Auth)
- [ ] Basic user profile (name, avatar)
- [ ] Anonymous browsing (no auth required to view match list)

#### Match Management
- [ ] Create match (public by default, always discoverable)
- [ ] Every match gets a unique Ref Code (6-char alphanumeric)
- [ ] Set match metadata (title, location, scheduled time)
- [ ] Configure spectator access (on/off)
- [ ] Admin role: creator can delegate admin to other refs
- [ ] Admin controls: mute/unmute individuals, mute all, remove participants
- [ ] Start/end match (creator or admin)
- [ ] Match status: `upcoming`, `live`, `ended`

#### Match Discovery
- [ ] Browse live matches
- [ ] Browse upcoming matches
- [ ] "My Matches" tab (created, joined, or waiting-room matches)
- [ ] View match details (metadata, participant count, spectator count)
- [ ] "Notify Me When Live" button on upcoming matches

#### Joining
- [ ] Enter Ref Code to join as referee (full-duplex audio)
- [ ] If match is upcoming: placed in waiting room, auto-connect on start
- [ ] If match is live: connect immediately as referee
- [ ] Join as spectator directly from match detail (no code needed)
- [ ] Pre-join waiting room for upcoming matches

#### Audio Communication
- [ ] Full-duplex voice for refs (always-on, no push-to-talk)
- [ ] Receive-only audio for spectators
- [ ] Bluetooth headset support
- [ ] Connection status indicators
- [ ] Automatic reconnection on network drop
- [ ] Mute/unmute self (refs only)

#### UI/UX
- [ ] Home screen with live/upcoming matches
- [ ] Match creation flow
- [ ] Join match flow (ref vs spectator selection)
- [ ] In-match view (participant list, connection status)
- [ ] Simple, clean interface optimized for field use

### Phase 2 (Post-MVP)

#### Enhanced Discovery
- [ ] Search matches by title, location, level
- [ ] Filter by match level (MLR, club, youth, etc.)
- [ ] Geolocation-based discovery ("matches near me")
- [ ] Follow specific referees

#### Match Features
- [ ] Edit match metadata before going live
- [x] Notify me when live (browser notifications for upcoming matches) — moved to MVP
- [ ] Push notifications (native, requires service worker or Flutter)
- [ ] Match history (past matches you participated in)

#### Audio Enhancements
- [ ] Audio quality settings (bandwidth optimization)
- [ ] Echo cancellation tuning
- [ ] Background noise suppression controls

#### Monetization
- [ ] Spectator mode pricing (first X minutes free, then $1)
- [ ] Creator can charge for spectator access
- [ ] Payment processing (Stripe)

### Future (Not Planned Yet)

- [ ] Match recording/archives
- [ ] Spectator chat (text)
- [ ] Integration API for reflog
- [ ] Multi-language support
- [ ] Desktop/web client
- [ ] Offline mode with sync

---

## User Flows

### Flow 1: Create Match (Organizer)

```
1. User opens app
2. Taps "Create Match"
3. Enters match details:
   - Title (required)
   - Location (required)
   - Scheduled time (required)
4. Toggle "Allow Spectators" (default: ON)
5. Taps "Create Match"
6. Match is created → status: "upcoming"
7. User sees match detail with:
   - Match details
   - Ref Code (e.g. "HX7K9P") with "Copy" button
   - Waiting room (shows pre-joined refs)
   - "Start Match" button
8. User shares Ref Code with officiating crew
9. Taps "Start Match"
10. Waiting room refs auto-connect → match status → "live"
11. LiveKit room created
12. All connected refs get full-duplex audio
13. Match appears in public "Live Now" list
```

### Flow 2: Join as Referee (via Ref Code)

```
1. Organizer texts crew: "Ref code HX7K9P, connect when you're at the field"
2. Ref opens app → taps "Ref Code" in nav
3. Enters 6-character Ref Code: "HX7K9P"
4. If match is upcoming:
   - Added to waiting room
   - Sees "You're in the waiting room" confirmation
   - Auto-connected when match starts
5. If match is live:
   - Joins immediately as referee
   - Full-duplex audio enabled
6. Ref connects Bluetooth headset
7. Starts communicating with other refs
```

### Flow 3: Join as Spectator (Public)

```
1. User opens app (no auth required for browsing)
2. Browses "Live Now" matches
3. Taps match: "Oak Park HS vs Lincoln"
4. Views match details (23 spectators listening)
5. If not authenticated:
   - Prompted to sign in
   - Continues after auth
6. Taps "Listen as Spectator"
7. Joins LiveKit room as receive-only participant
8. Hears referee communications
9. Can leave at any time
```

### Flow 4: Notify Me When Live

```
1. User browses "Upcoming" matches
2. Taps match to view details
3. Taps "Notify Me When Live"
4. When organizer starts match:
   - User gets browser notification (future: push)
   - Can tap notification to enter as spectator
```

### Flow 5: End Match (Creator / Admin)

```
1. Creator taps "End Match"
2. Confirmation dialog: "End match for all participants?"
3. Confirms
4. Match status → "ended"
5. LiveKit room closed
6. All participants disconnected
7. Match moves to "Past Matches" (future feature)
```

---

## Data Models

### User

```typescript
interface User {
  id: string;                    // Firebase Auth UID
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Profile
  displayName: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;

  // Stats (future)
  matchesCreated?: number;
  matchesJoined?: number;
  totalListeningTime?: number;

  // Saved matches (bookmark from discovery; same matches still appear in the public list)
  savedMatchIds?: string[];
}
```

### Match

```typescript
interface Match {
  id: string;                    // Auto-generated
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Basic Info
  title: string;                 // "Oak Park HS vs Lincoln"
  level: MatchLevel;             // "MLR" | "club" | "youth" | "high-school" | "other"
  location: string;              // "Seattle, WA" or "Oak Park Field 2"
  scheduledTime: Timestamp;
  eventPhotoUrl?: string;         // Optional cover: HTTPS URL or hosted image (see POC)

  // Status
  status: MatchStatus;           // "upcoming" | "live" | "ended"
  startedAt?: Timestamp;         // When match went live
  endedAt?: Timestamp;           // When match ended

  // Access
  isPublic: boolean;             // true = listed publicly; false = private event
  isPrivate: boolean;            // Inverse of isPublic for clarity
  allowSpectators: boolean;      // Default: true
  refCode: string;               // 6-char alphanumeric, shared with ref crew (always)
  spectatorCode?: string;        // 6-char code for private events (spectator access)

  // Participants
  creatorId: string;             // User ID of creator
  adminIds: string[];            // User IDs with admin rights (includes creator)
  activeRefs: string[];          // Array of ref User IDs (max 5)
  waitingRoom: string[];         // Refs who pre-joined before match started
  notifyList: string[];          // Users who want notification when match goes live
  spectatorCount: number;        // Real-time spectator count

  // LiveKit
  roomId: string;                // LiveKit room identifier
  roomName: string;              // Human-readable room name

  // Limits
  maxRefs: number;               // Default: 5, configurable 1–10 by organizer
  maxSpectators: number;         // Default: 100

  // Future
  isPaid?: boolean;
  spectatorPrice?: number;       // USD cents
}

type MatchLevel = "MLR" | "club" | "youth" | "high-school" | "other";
type MatchStatus = "upcoming" | "live" | "ended";
```

### Participant

```typescript
interface Participant {
  id: string;                    // Auto-generated
  matchId: string;
  userId: string;

  // Role
  role: ParticipantRole;         // "creator" | "referee" | "spectator"

  // Status
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  isConnected: boolean;          // Real-time audio connection status

  // Audio
  isMuted?: boolean;             // Only for refs
  audioQuality?: "good" | "poor" | "disconnected";
}

type ParticipantRole = "creator" | "referee" | "spectator";
```

### LiveKitRoom (Ephemeral - not stored in Firestore)

```typescript
interface LiveKitRoom {
  roomId: string;
  matchId: string;

  // Participants
  publishers: string[];          // Ref User IDs (can transmit)
  subscribers: string[];         // Spectator User IDs (receive only)

  // Settings
  maxPublishers: 5;
  maxSubscribers: 100;
  audioCodec: "opus";
  videEnabled: false;
}
```

---

## Technical Architecture

### Tech Stack

#### POC (Current Phase)

**Frontend (PWA):**
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **State Management:** React Context + Hooks
- **Audio:** LiveKit React SDK
- **UI:** Tailwind CSS (mobile-first)
- **PWA:** Vite PWA Plugin

**Backend:**
- **Auth:** Firebase Authentication (Google, Phone)
- **Database:** Cloud Firestore
- **Cloud Functions:** Firebase Functions (match management logic)
- **Voice Infrastructure:** LiveKit Cloud

**Deployment:**
- **Hosting:** Vercel or Firebase Hosting
- **Analytics:** Firebase Analytics

#### Production (After POC)

**Frontend (Mobile App):**
- **Framework:** Flutter (cross-platform)
- **State Management:** Riverpod or Provider
- **Audio:** LiveKit Flutter SDK
- **UI:** Material Design 3

**Backend:** (Same as POC)
- **Auth:** Firebase Authentication (Google, Phone)
- **Database:** Cloud Firestore
- **Cloud Functions:** Firebase Functions (match management logic)
- **Voice Infrastructure:** LiveKit Cloud (MVP) → Self-hosted (future)

**Distribution:**
- **iOS:** App Store
- **Android:** Google Play Store
- **Analytics:** Firebase Analytics
- **Crash Reporting:** Firebase Crashlytics

### Architecture Diagram

**POC Architecture (Current):**

```
┌─────────────────┐
│   React PWA     │
│ (Mobile Browser)│
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────────┐
│ Firebase Auth   │  │ Cloud Firestore  │
│ (User Auth)     │  │ (Match Data)     │
└─────────────────┘  └──────────────────┘
         │                 │
         │                 ▼
         │        ┌──────────────────┐
         │        │ Cloud Functions  │
         │        │ (Business Logic) │
         │        └──────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         LiveKit Cloud               │
│  ┌──────────────────────────────┐   │
│  │  Match Room (Live)           │   │
│  │  - Publishers: 5 refs        │   │
│  │  - Subscribers: 100 specs    │   │
│  │  - Codec: Opus               │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Data Flow

**1. Match Creation**
```
User → Flutter App → Cloud Function (createMatch)
                  → Firestore (create Match doc)
                  → LiveKit API (create room)
                  → Return match ID to app
```

**2. Join Match (Referee)**
```
User → Flutter App → Cloud Function (joinMatch)
                  → Verify: match exists, <5 refs
                  → Firestore (add to activeRefs)
                  → Generate LiveKit token (publisher)
                  → Flutter connects to LiveKit room
                  → Start transmitting/receiving audio
```

**3. Join Match (Spectator)**
```
User → Flutter App → Cloud Function (joinMatchAsSpectator)
                  → Verify: spectators allowed, <100 specs
                  → Firestore (increment spectatorCount)
                  → Generate LiveKit token (subscriber)
                  → Flutter connects to LiveKit room
                  → Start receiving audio (no transmission)
```

**4. Browse Matches**
```
User → Flutter App → Firestore query:
                     WHERE status == "live"
                     AND isPublic == true
                     ORDER BY scheduledTime DESC
                  → Display list
```

---

## API Specifications

### Cloud Functions

#### `createMatch`
**Trigger:** HTTPS Callable
**Auth:** Required

**Input:**
```typescript
{
  title: string;
  location: string;
  scheduledTime: Timestamp;
  isPrivate: boolean;
  allowSpectators: boolean;
  maxRefs: number;             // 1–10, default 5
}
```

**Output:**
```typescript
{
  matchId: string;
  roomId: string;
  refCode: string;             // Always generated
  spectatorCode?: string;      // Only if isPrivate
}
```

**Logic:**
1. Validate user is authenticated
2. Generate unique match ID
3. Generate 6-char Ref Code (always)
4. If private, generate 6-char Spectator Code
5. Create LiveKit room
6. Create Match document in Firestore
7. Add creator to activeRefs and adminIds
8. Return match data with codes

---

#### `startMatch`
**Trigger:** HTTPS Callable
**Auth:** Required (must be creator or admin)

**Input:**
```typescript
{
  matchId: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  liveKitToken: string;  // JWT for LiveKit
}
```

**Logic:**
1. Verify user is match creator or admin
2. Update match status to "live"
3. Set startedAt timestamp
4. Move all waitingRoom users into activeRefs (up to maxRefs)
5. Clear waitingRoom array
6. Trigger notifications for notifyList users
7. Generate LiveKit token for creator (publisher role)
8. Return token

---

#### `joinWithRefCode`
**Trigger:** HTTPS Callable
**Auth:** Required

**Input:**
```typescript
{
  refCode: string;  // 6-char code shared by organizer
}
```

**Output:**
```typescript
{
  success: boolean;
  matchId: string;
  status: "upcoming" | "live";
  liveKitToken?: string;  // Only if match is live
}
```

**Logic:**
1. Look up match by refCode
2. Verify match is not ended
3. If match is upcoming:
   - Add user to waitingRoom
   - Return matchId + status (no token yet)
4. If match is live:
   - Check activeRefs.length < 5
   - Add user to activeRefs
   - Generate token with publisher permissions
   - Return token
5. Create Participant document

---

#### `joinAsSpectator`
**Trigger:** HTTPS Callable
**Auth:** Required

**Input:**
```typescript
{
  matchId: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  liveKitToken: string;
  participantId: string;
}
```

**Logic:**
1. Verify match exists and is live
2. Check allowSpectators === true
3. Check spectatorCount < maxSpectators
4. Increment spectatorCount
5. Generate token with subscriber permissions (receive-only)
6. Create Participant document
7. Return token

---

#### `leaveMatch`
**Trigger:** HTTPS Callable
**Auth:** Required

**Input:**
```typescript
{
  matchId: string;
  participantId: string;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Logic:**
1. Get Participant document
2. If role === "referee":
   - Remove from activeRefs
3. If role === "spectator":
   - Decrement spectatorCount
4. Update Participant.leftAt
5. Set isConnected = false

---

#### `endMatch`
**Trigger:** HTTPS Callable
**Auth:** Required (must be creator)

**Input:**
```typescript
{
  matchId: string;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Logic:**
1. Verify user is creator
2. Update match status to "ended"
3. Set endedAt timestamp
4. Close LiveKit room
5. Disconnect all participants
6. Return success

---

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      allow read: if true;  // Public profiles
      allow write: if request.auth.uid == userId;  // Own profile only
    }

    // Matches collection
    match /matches/{matchId} {
      // Anyone can read public matches
      allow read: if resource.data.isPublic == true || request.auth != null;

      // Only authenticated users can create
      allow create: if request.auth != null;

      // Only creator can update/delete
      allow update, delete: if request.auth.uid == resource.data.creatorId;
    }

    // Participants sub-collection
    match /matches/{matchId}/participants/{participantId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;  // Managed by Cloud Functions
    }
  }
}
```

---

## Security & Privacy

### Authentication
- Firebase Authentication required to join matches
- Anonymous browsing allowed (read-only)
- No social features in MVP (no following, no DMs)

### Codes
- Both Ref Codes and Spectator Codes are 6 characters (alphanumeric, case-insensitive, excluding ambiguous chars like 0/O, 1/I/L)
- ~800 million possible combinations per code (31^6)
- Codes expire when match ends
- **Ref Code:** required to join as referee (full-duplex audio). Always generated.
- **Spectator Code:** required to listen to private events. Only generated when `isPrivate` is true. Public matches don't need a spectator code.

### Audio Privacy
- Spectators are receive-only (enforced by LiveKit)
- No recording in MVP
- Creators can disable spectators entirely
- Private matches require explicit code sharing

### Data Privacy
- User emails/phone numbers never exposed publicly
- Only display names visible in match
- No PII in match metadata
- GDPR/CCPA compliance (future)

---

## Performance Requirements

### Audio Quality
- **Latency:** <300ms end-to-end (target)
- **Codec:** Opus (48kHz, stereo)
- **Bitrate:** Adaptive (16-64 kbps)
- **Packet Loss Tolerance:** Up to 10% graceful degradation

### Network Requirements
- **Minimum bandwidth:** 50 kbps up/down per participant
- **Recommended:** 100+ kbps up/down
- **Jitter tolerance:** <30ms

### App Performance
- **Cold start:** <3 seconds
- **Match list load:** <1 second
- **Join match:** <2 seconds from tap to audio
- **Memory usage:** <150 MB typical
- **Battery:** <10% drain per hour (audio streaming)

### Scalability (MVP Targets)
- **Concurrent matches:** 100+
- **Total users:** 10,000+
- **Peak concurrent users:** 1,000+

---

## Future Considerations

### Phase 2 Enhancements
- Match recording and playback
- Advanced search/filtering
- Geolocation-based discovery
- Payment processing for paid events
- Web client (spectator mode)

### Integration API
- REST API for reflog integration
- Webhook events (match started, match ended)
- OAuth for third-party apps

### Platform Expansion
- Multi-sport support (soccer, basketball, etc.)
- Desktop client
- Offline mode with sync
- Mesh networking fallback (advanced)

### Analytics & Insights
- Match quality metrics
- Audio quality monitoring
- User engagement tracking
- Retention analysis

---

## Open Questions

**To Be Decided:**

1. **Match visibility window**
   - How long before scheduled time should upcoming matches appear?
   - Recommendation: 24 hours

2. **Abandoned matches**
   - Auto-end matches if no activity after X minutes?
   - Recommendation: 15 minutes after scheduled time

3. **User moderation**
   - Report/block features?
   - Not in MVP, add if abuse emerges

4. **Match editing**
   - Can creators edit metadata after creation?
   - Recommendation: Yes, but only before match starts

5. **Spectator notifications**
   - "Notify Me When Live" button added to MVP
   - Push notifications (native) deferred to Flutter phase

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-15 | Initial specification |
| 1.1 | 2026-04-15 | Ref Code access model, waiting room, notify when live, admin roles |
| 1.2 | 2026-04-15 | Dual-code system (ref + spectator), configurable maxRefs, private events |

---

**This spec is a living document. As we build and learn, it will evolve.**
