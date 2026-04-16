# .design Folder Specification

**Version 1.0**

This folder captures design context, rationale, and history for refOpenMic. It serves as a living record that helps AI assistants and humans understand the "why" behind design decisions.

**Visual theme (colors, surfaces, tokens):** See **[theme.md](./theme.md)** — keep in sync with `src/theme/muiTheme.ts` and `src/index.css`.

## Purpose

The `.design` folder stores:
- Design rationale and decision history
- Discussion summaries and decisions
- Feature evolution over time

**Key principle:** Focus on *design* decisions and *user experience* updates, not code implementation details.

## Folder Structure

```
.design/
├── README.md              # This file
├── feature-mapping.md     # Maps code paths to design features
├── decisions/             # Design decision discussions
│   └── {YYYY-MM-DD}-{topic}.md
└── features/              # Feature-specific design context
    └── {feature-name}/
        └── design-history.md
```

## Features Folder

Each subfolder in `features/` represents a distinct feature area (e.g., `match-creation/`, `audio-engine/`, `spectator-mode/`).

### design-history.md

A chronological record of design evolution. This captures the full story of how a feature's design developed over time.

**What to include:**
- Key design decisions and their rationale
- Major UI/UX updates and the thinking behind them
- Scope changes (features added, descoped, or deferred)
- User flow changes
- Visual/interaction design updates

**What NOT to include:**
- Code refactoring or file restructuring
- Bug fixes unrelated to design
- Linting or formatting changes
- Technical implementation details

**Format:**

```markdown
# Design History

## 2026-04-15

### [Decision] Made matches public by default
- Changed default from private to public to support transparency vision
- Private matches now require explicit opt-in

### [Update] Simplified match creation flow
- Reduced from 3 screens to 2 screens
- Removed unnecessary fields from initial form

## 2026-04-14

### [Update] Redesigned browse screen
- Added live/upcoming tabs for better discovery
- Increased match card size for easier tap targets
```

**Entry Types:**
- `[Decision]` - Significant design choices with rationale
- `[Update]` - UI/UX changes
- `[Descoped]` - Features removed or deferred
- `[Feedback]` - User testing or stakeholder input
- `[Discussion]` - Design exploration (reference decision doc in `/decisions/`)

## Decisions Folder

When there's significant discussion about a design approach, create a decision document:

**Filename format:** `YYYY-MM-DD-{topic-in-kebab-case}.md`

**Example:** `2026-04-15-spectator-limit-strategy.md`

**Template:**

```markdown
# {Decision Title}

**Date:** YYYY-MM-DD
**Status:** Decided | Under Discussion | Deferred

## Context
What prompted this decision? What problem are we solving?

## Options Considered

### Option 1: {Name}
- Pros: ...
- Cons: ...

### Option 2: {Name}
- Pros: ...
- Cons: ...

## Decision
What we decided and why.

## Consequences
What this means for the product, users, or future decisions.

## References
- Link to VISION.md principles
- Link to SPEC.md requirements
- External resources
```

## AI Assistant Guidelines

### When to Update design-history.md

**Add entries when:**
- Major UI screens are added, removed, or significantly changed
- Design decisions are made (especially with rationale)
- Features are descoped or deferred
- New user flows are introduced
- Visual design updates (colors, spacing, layouts)

**Do NOT add entries for:**
- Code refactoring
- Bug fixes
- Linting/formatting
- Test updates
- Performance optimizations

### When to Create a Decision Document

**Create a decision doc when:**
- There are multiple valid approaches to consider
- The decision has significant impact on user experience
- You need to think through trade-offs
- The discussion itself is valuable context

**Reference the decision doc in design-history.md:**
```markdown
### [Discussion] Spectator limit strategy
- See decision doc: `.design/decisions/2026-04-15-spectator-limit-strategy.md`
```

### Writing Style

**Brevity is essential.** Each entry should be 1-2 sentences maximum.

- Keep entries concise—just enough to remember what happened
- Focus on *user experience* impact, not implementation details
- **Never include:** Widget types, state management details, API specifics
- **Skip rationale for obvious changes:** Only explain "why" when non-obvious
- Use past tense ("Added...", "Changed...", "Decided...")
- **Group related changes:** Multiple small tweaks = one entry

### Example: Good vs. Too Detailed

**Good:**
```markdown
### [Update] Simplified match creation
- Reduced form fields to essential info only
- Streamlined flow from 3 steps to 2
```

**Too Detailed:**
```markdown
### [Update] Simplified match creation
- Removed optional fields: venue capacity, weather conditions, pitch type
- Changed CreateMatchScreen.dart to use FormBuilder with 5 fields instead of 12
- Updated CreateMatchViewModel to handle simplified state
- Modified Firestore schema to make fields optional
```

## Creating a New Feature Folder

When making design changes to code that isn't in [feature-mapping.md](feature-mapping.md):

1. Choose a **feature slug** in kebab-case (e.g., `match-creation`, `audio-engine`)
2. Add a row to `feature-mapping.md`:
   - Code Path: The directory or feature area (e.g., `lib/features/match_creation/`)
   - Design Feature: Readable name (e.g., "Match Creation")
   - Design History: `.design/features/{slug}/design-history.md`
3. Create folder `.design/features/{slug}/`
4. Create `design-history.md` inside it:

```markdown
# Design History

This file contains a chronological record of key design updates and decisions for {feature name}. See `.design/README.md` for format guidelines.

---

## {today's date in YYYY-MM-DD}

### [Update] Initial design created
- Brief description of initial design
```

5. Add your design-history entry for the change you just made

## Reference
- Vision: [VISION.md](../VISION.md)
- Technical spec: [SPEC.md](../SPEC.md)
- Feature mapping: [feature-mapping.md](feature-mapping.md)
