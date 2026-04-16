# Design History

This file contains a chronological record of key design updates and decisions for Authentication. See `.design/README.md` for format guidelines.

---

## 2026-04-15

### [Update] Initial auth flow implemented
- Google sign-in via Firebase Auth popup
- Profile auto-created on first sign-in with display name and photo from Google
- Anonymous browsing supported: match list visible without auth, join requires sign-in
