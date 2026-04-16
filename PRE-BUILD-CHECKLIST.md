# Pre-Build Checklist

Before we start coding the POC, complete these setup tasks.

---

## 1. Firebase Setup

### Create Firebase Project
- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Click "Add Project"
- [ ] Name: `refOpenMic-poc` (or similar)
- [ ] Disable Google Analytics (not needed for POC)
- [ ] Click "Create Project"

### Enable Authentication
- [ ] In Firebase Console, go to **Authentication**
- [ ] Click "Get Started"
- [ ] Enable **Google** sign-in provider
- [ ] Enable **Phone** sign-in provider
  - Add test phone numbers if needed for development

### Create Firestore Database
- [ ] In Firebase Console, go to **Firestore Database**
- [ ] Click "Create Database"
- [ ] Choose **Test mode** (we'll add security rules later)
- [ ] Choose location: `us-central` (or closest to your target users)
- [ ] Click "Enable"

### Get Firebase Config
- [ ] In Firebase Console, go to **Project Settings** (gear icon)
- [ ] Scroll to "Your apps"
- [ ] Click the **Web** icon (`</>`)
- [ ] Register app: `refOpenMic-web`
- [ ] Copy the config object (you'll need this later)

```javascript
// Save this somewhere - you'll add it to .env later
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### Install Firebase CLI (Optional for now)
```bash
npm install -g firebase-tools
firebase login
```

---

## 2. LiveKit Setup

### Create LiveKit Account
- [ ] Go to [LiveKit Cloud](https://livekit.io/)
- [ ] Sign up for free account
- [ ] Verify email

### Create Project
- [ ] In LiveKit Console, click "Create Project"
- [ ] Name: `refOpenMic-poc`
- [ ] Region: Choose closest to your users
- [ ] Click "Create"

### Get API Credentials
- [ ] Go to **Settings** → **Keys**
- [ ] Click "Generate Key"
- [ ] Save these securely (you'll need them):
  - **API Key** (starts with `API...`)
  - **API Secret** (long string - shown only once!)

```bash
# Save these somewhere secure - you'll add to .env later
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_URL=wss://your-project.livekit.cloud
```

### Understanding the Free Tier
- 10,000 participant-minutes per month (free)
- For POC with 5-10 refs testing:
  - Each 1-hour test = 5 refs × 60 min = 300 participant-minutes
  - Free tier = ~33 hours of testing
  - More than enough for POC validation

---

## 3. Development Environment

### Node.js
- [ ] Verify Node.js 18+ installed:
```bash
node --version
# Should be v18.0.0 or higher
```
- [ ] If not installed, download from [nodejs.org](https://nodejs.org/)

### Code Editor
- [ ] VS Code (recommended) or Cursor installed
- [ ] Extensions installed (if using VS Code):
  - [ ] ESLint
  - [ ] Prettier
  - [ ] Tailwind CSS IntelliSense
  - [ ] Firebase (optional)

### Git
- [ ] Verify Git installed:
```bash
git --version
```
- [ ] Configure Git (if not done):
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 4. Project Initialization

### Initialize Git (Already Done)
- [x] Git repo created
- [ ] Commit the foundation docs:
```bash
git add .
git commit -m "Initial project foundation: VISION, SPEC, design system"
```

### Create GitHub Repo (Optional but Recommended)
- [ ] Create new repo on GitHub: `refOpenMic`
- [ ] Push local repo:
```bash
git remote add origin https://github.com/JustinXHale/refOpenMic.git
git push -u origin main
```

---

## 5. Environment Variables Template

Create `.env.example` (template for others):
- [ ] We'll create this when we scaffold the project

Should contain:
```bash
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# LiveKit
VITE_LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

---

## 6. Deployment Platform (Choose One)

### Option A: Vercel (Recommended for POC)
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign up with GitHub
- [ ] Install Vercel CLI (optional):
```bash
npm install -g vercel
```

**Why Vercel:**
- Instant deploys
- Free tier generous
- Auto-preview URLs for testing
- Easy environment variable management

### Option B: Firebase Hosting
- [ ] Already have Firebase project
- [ ] Will use Firebase CLI for deployment

**Why Firebase Hosting:**
- Already using Firebase for backend
- One platform for everything
- Good free tier

---

## 7. Testing Devices

### For Development
- [ ] Modern smartphone (iOS 14+ or Android 8+)
- [ ] Bluetooth headset (AirPods, etc.) - optional for initial testing
- [ ] Can start with phone speaker/wired headphones

### For POC Testing
- [ ] Line up 5-10 referees willing to test
- [ ] Identify 2-3 low-stakes matches for testing
- [ ] Confirm field locations have cellular coverage

---

## 8. Optional: Design Tools

### For Mockups/Prototypes (if you want to design first)
- [ ] Figma account (free tier)
- [ ] Tailwind UI components (optional - paid)

**Note:** We can also design directly in code with Tailwind.

---

## Summary

**Required before coding:**
- ✅ Firebase project created
- ✅ Firebase Auth enabled (Google, Phone)
- ✅ Firestore database created
- ✅ Firebase config saved
- ✅ LiveKit account created
- ✅ LiveKit API keys saved
- ✅ Node.js 18+ installed
- ✅ Development environment ready

**Ready to start when all checkboxes above are complete.**

---

## Next Steps

Once this checklist is complete:
1. Let me know you're ready
2. We'll scaffold the React + Vite + TypeScript project
3. Set up Firebase + LiveKit integration
4. Start building core features

**Estimated time to complete checklist:** 30-45 minutes

---

## Questions?

If you get stuck on any step:
1. Check the official docs (Firebase, LiveKit)
2. Ask me for clarification
3. We can troubleshoot together

**Let's build this thing.** 🏉
