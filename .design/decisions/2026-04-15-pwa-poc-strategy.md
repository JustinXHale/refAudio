# PWA for POC, Flutter for Production

**Date:** 2026-04-15
**Status:** Decided

## Context

Need to validate the core refOpenMic concept (phone-based referee communication with spectator mode) before committing to a full native app build. The key questions to validate:

1. Is audio quality acceptable over cellular/WiFi?
2. Does the spectator mode (listen-only) work reliably?
3. Do refs actually use Bluetooth headsets this way?
4. Is the public match discovery model appealing?
5. What latency is acceptable for real-time officiating?

Building a native Flutter app first would take 4-6 weeks before getting any user feedback. Need a faster path to validation.

## Options Considered

### Option 1: Flutter Native from Day 1
**How it works:**
- Build full Flutter app (iOS + Android)
- Optimize for native performance and Bluetooth
- Submit to app stores

**Pros:**
- No rebuild work later
- Best performance from the start
- Full hardware access (Bluetooth optimization)
- App store presence immediately

**Cons:**
- 4-6 weeks before testable with users
- Significant investment before validation
- Harder to iterate on design quickly
- Longer feedback loop

### Option 2: PWA POC → Flutter Production (CHOSEN)
**How it works:**
- Build Progressive Web App first (React + LiveKit)
- Test with 5-10 local refs over 2-3 weeks
- Validate core concept and gather feedback
- Rebuild as Flutter native app with learnings

**Pros:**
- Testable in 1-2 weeks
- Faster iteration during early feedback
- Lower risk (validate before big investment)
- Can pivot quickly if UX needs change
- LiveKit React SDK is mature

**Cons:**
- Rebuild work later (but informed by real usage)
- PWA limitations during POC (Bluetooth less reliable, background audio harder)
- No app store presence during POC

### Option 3: React Native (Middle Ground)
**How it works:**
- Build with React Native (native performance + web knowledge)
- Ship to app stores

**Pros:**
- Faster than Flutter (if team knows React)
- Native performance
- Could pivot to PWA easily

**Cons:**
- Still 3-4 weeks to first testable version
- Less performant than Flutter for audio
- More complex than PWA for POC needs

## Decision

**Go with Option 2: PWA POC → Flutter Production**

### Rationale

**Aligned with VISION.md:**
1. **Removes barriers** - Faster to user feedback = faster learning
2. **Simplicity** - Build minimal viable test, not full product
3. **Serves grassroots refs** - Get it in their hands fast to validate

**Risk mitigation:**
- Validate audio quality before committing months to native
- Learn what refs actually need vs what we think they need
- Find UX friction points early when cheap to fix

**Acceptable trade-offs:**
- PWA limitations during POC (Bluetooth, background audio)
  - Mitigation: Most refs can test with phone speaker or wired headsets
- Rebuild work later
  - Mitigation: Will have validated concept and user feedback to build right thing

### POC Success Criteria

**POC is successful if:**
1. Audio latency is <500ms (acceptable for ref comms)
2. 5+ refs test it during actual matches
3. Spectator mode works reliably (no dropouts)
4. Refs say "I would use this instead of radios"
5. No critical UX blockers identified

**If successful → Rebuild in Flutter**
**If unsuccessful → Pivot or kill project (saved months of wasted work)**

## Consequences

### For Development

**POC Phase (2-3 weeks):**
- Tech stack: React + Vite + Firebase + LiveKit
- Deploy to: Vercel or Firebase Hosting
- Features: Core MVP only (create/join/browse matches, audio)
- Testing: 5-10 local refs, low-stakes matches

**Production Phase (4-6 weeks after POC):**
- Rebuild as Flutter native app
- Optimize Bluetooth headset support
- Add Phase 2 features based on POC learnings
- Submit to app stores

### For Users

**During POC:**
- Access via mobile browser (no app install)
- "Add to home screen" for app-like experience
- Limited Bluetooth support (may need wired headsets)
- Some refs may not be able to test (older phones)

**After Flutter rebuild:**
- Native app experience
- Full Bluetooth optimization
- App store distribution
- Background audio support

### For Product Roadmap

**POC validates/invalidates:**
- Audio quality over cellular
- Spectator mode viability
- Public match discovery appeal
- Latency tolerance for officiating
- Key UX friction points

**Learnings inform Flutter build:**
- Which features matter most
- What UX flows work/don't work
- Where to optimize performance
- What Phase 2 features to prioritize

## Technical Implications

### PWA Stack
- **Frontend:** React + TypeScript
- **Build tool:** Vite (fast dev, easy PWA setup)
- **Auth:** Firebase Auth
- **Database:** Firestore
- **Voice:** LiveKit React SDK
- **Deployment:** Vercel (fast, free tier)

### Migration Path to Flutter
- Firebase stays the same (Auth, Firestore)
- LiveKit stays the same (just different SDK)
- Core data models reusable
- API contracts stay stable
- Only UI/client code is rewritten

## Timeline

**Week 1-2: Build POC**
- Set up project
- Implement core features (match creation, join, audio)
- Deploy to test URL

**Week 3-4: Test with Refs**
- 5-10 refs use during real matches
- Gather feedback, measure latency
- Identify critical issues

**Week 5: Decide**
- Evaluate POC success criteria
- Go/no-go decision on Flutter build
- Document learnings

**Week 6-11: Flutter Build** (if POC successful)
- Rebuild based on validated design
- Add Phase 2 features
- Submit to app stores

## References
- VISION.md: "Simplicity Wins", "Accessibility First"
- SPEC.md: Technical architecture (will update with POC section)
- Decision framework: "Does this remove barriers?" (Yes - faster to validation)
