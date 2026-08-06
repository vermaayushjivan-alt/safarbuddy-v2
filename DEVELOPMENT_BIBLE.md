# DEVELOPMENT_BIBLE.md

RULE 1 — Never create duplicate code.
RULE 2 — Always inspect existing implementation.
RULE 3 — Repository = Data Layer only.
RULE 4 — Server Action = Validation + Auth + Business Logic.
RULE 5 — Always use Zod.
RULE 6 — Always use requireRole().
RULE 7 — Never invent schema.
RULE 8 — Never invent enums.
RULE 9 — Reuse existing architecture.
RULE 10 — Never modify completed milestone unless bug.
RULE 11 — One milestone at a time.
RULE 12 — No assumptions.
RULE 13 — If schema unknown → STOP.
RULE 14 — Inspect first.
RULE 15 — Before coding always provide: Existing Architecture, Root Cause, Files, Why, Minimal Plan.
RULE 16 — After completion provide: Files Modified, Files Created, Build Status, TypeScript Status, Pending Issues, Project Status Update.
RULE 17 — Always update CHANGELOG.
RULE 18 — Always update PROJECT_STATUS.
RULE 19 — Never skip self review.
RULE 20 — Completed milestones become Frozen.

## Known architecture debt (flagged, not fixed — outside milestone scope per RULE 10/11)
- `src/lib/repository/` (singular) is a dead/unused duplicate of `src/lib/repositories/` (plural, active). Violates RULE 1. Needs a dedicated cleanup milestone with explicit sign-off before deletion.
- `src/lib/repositories/hotel.repository.ts ts` — stray duplicate file (note the space in the filename) sitting alongside the real `hotel.repository.ts`. Unused, but should be deleted in a dedicated cleanup pass.
