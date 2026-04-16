# refOpenMic

**Professional-quality referee communication for everyone.**

refOpenMic turns smartphones and existing Bluetooth headsets into a platform for transparent, community-driven sports officiating. No $400 radios required.

---

## Current Status

**Phase:** POC (Proof of Concept)
**Tech Stack:** React PWA
**Timeline:** 2-3 weeks to validation

We're building a PWA first to validate the concept with real referees before committing to a native app. See our [POC strategy decision](.design/decisions/2026-04-15-pwa-poc-strategy.md) for details.

---

## The Vision

Local referees earn ~$100 per game but traditional referee radios cost $400+ per unit. The economics don't work. Meanwhile, everyone already has Bluetooth headsets and smartphones.

refOpenMic eliminates the economic barrier to quality referee communication by using hardware people already own.

**For Referees:**
- $0 equipment cost
- Full-duplex voice communication
- Simple: create match, connect headset, talk

**For Spectators:**
- Browse live matches
- Listen to referee communications
- Deeper connection to the game

**Read more:** [VISION.md](VISION.md)

---

## Documentation

### Core Documents
- **[VISION.md](VISION.md)** - The north star: why this exists, guiding principles, what refOpenMic is and isn't
- **[SPEC.md](SPEC.md)** - Technical specification: features, data models, architecture, POC strategy
- **[.design/README.md](.design/README.md)** - Design history and decision tracking guidelines

### Design Decisions
Key decisions documented in [`.design/decisions/`](.design/decisions/):
- [PWA POC Strategy](.design/decisions/2026-04-15-pwa-poc-strategy.md) - Why PWA first, Flutter later
- [Public by Default](.design/decisions/2026-04-15-public-by-default.md) - Why matches are public/searchable

### Visual theme
- **[.design/theme.md](.design/theme.md)** — Color tokens (purple/cyan) and usage rules for MUI + CSS.

---

## Live demo (GitHub Pages)

Pushes to `main` trigger [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), which builds the Vite app (with base path `/refAudio/`) and deploys to GitHub Pages.

**URL:** [https://justinxhale.github.io/refAudio/](https://justinxhale.github.io/refAudio/)

**First-time setup:** In the GitHub repo, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions** (not “Deploy from a branch”). The first workflow run after that will publish the site.

---

## POC Roadmap

### Week 1-2: Build
- [ ] Set up Firebase project (Auth, Firestore)
- [ ] Set up LiveKit account
- [ ] Scaffold React PWA
- [ ] Implement core features:
  - [ ] Authentication (Google, Phone)
  - [ ] Create match
  - [ ] Join match (referee, spectator)
  - [ ] Browse live/upcoming matches
  - [ ] Full-duplex voice (LiveKit)
  - [ ] Spectator listen-only mode
- [ ] Deploy to test URL

### Week 3-4: Test
- [ ] 5-10 local refs test during real matches
- [ ] Measure audio latency
- [ ] Gather feedback on UX
- [ ] Identify critical issues

### Week 5: Decide
- [ ] Evaluate POC success criteria
- [ ] Go/no-go decision on Flutter build
- [ ] Document learnings

### Week 6-11: Flutter (if POC successful)
- [ ] Rebuild as native app
- [ ] Optimize Bluetooth headsets
- [ ] Add Phase 2 features
- [ ] Submit to app stores

---

## POC Success Criteria

The POC is successful if:
1. ✅ Audio latency is <500ms (acceptable for officiating)
2. ✅ 5+ refs test it during actual matches
3. ✅ Spectator mode works reliably (no dropouts)
4. ✅ Refs say "I would use this instead of radios"
5. ✅ No critical UX blockers identified

---

## Tech Stack (POC)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool + PWA)
- Tailwind CSS (mobile-first)
- LiveKit React SDK (voice)

**Backend:**
- Firebase Authentication
- Cloud Firestore
- Firebase Functions
- LiveKit Cloud

**Deployment:**
- **GitHub Pages** (automatic from `main` via Actions)
- Optional: Vercel or Firebase Hosting for custom domains / previews

---

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase account
- LiveKit account

### Setup (Coming Soon)
```bash
# Clone repo
git clone https://github.com/yourusername/refOpenMic.git
cd refOpenMic

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Firebase and LiveKit credentials

# Run dev server
npm run dev
```

**Note:** Full setup instructions will be added once we start building.

---

## Core Principles

refOpenMic has one job: **make voice communication accessible and transparent for grassroots referees.**

**What refOpenMic IS:**
- Voice communication platform
- Match discovery/browsing
- Spectator listen-only mode
- Public by default, private as opt-in

**What refOpenMic IS NOT:**
- Match timers or score tracking
- Event logging or incident tracking
- Referee workflow management
- Game statistics

Everything beyond communication belongs in other apps (like reflog).

See [VISION.md](VISION.md) for full principles.

---

## Contributing

### Before Making Changes

**Read these first:**
1. [VISION.md](VISION.md) - Understand what we're building and why
2. [SPEC.md](SPEC.md) - Know the technical requirements
3. [.cursorrules](.cursorrules) - Understand the development guardrails

### Design Changes

When making UI/UX changes, record them in design history:
- Check [.design/feature-mapping.md](.design/feature-mapping.md) for correct file
- Add brief entry (1-2 sentences) to `design-history.md`
- See [.design/README.md](.design/README.md) for format

For significant discussions, create a decision doc in `.design/decisions/`.

---

## License

TBD

---

## Contact

**Project Lead:** [Your Name]
**Questions:** [Create an issue](https://github.com/yourusername/refOpenMic/issues)

---

**Built with the belief that economic barriers shouldn't determine who gets professional tools.**
