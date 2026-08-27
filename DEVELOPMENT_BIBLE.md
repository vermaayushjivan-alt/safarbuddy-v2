# DEVELOPMENT_BIBLE.md (v2)

Supersedes v1. v1's core rules are preserved below unchanged in spirit —
v2 adds the categories v1 never covered (testing, security, secrets,
migration safety, performance, monitoring, and a real Definition of
Done). This file governs `safarbuddy-v2`. `DATABASE_BIBLE.md` governs
schema-level rules and cross-references several rules here.

Changelog of this file itself:
- v2 (2026-08-27) — added RULE 21–38 after an audit found an entire
  undocumented milestone (CONTACT-01) shipped with a build-breaking
  missing dependency and an undocumented required env var, none of
  which v1 had any rule to catch.

---

## A. Core Engineering Rules (v1, unchanged)

RULE 1 — Never create duplicate code.
RULE 2 — Always inspect existing implementation before writing new code.
RULE 3 — Repository = Data Layer only. No business logic, no auth checks.
RULE 4 — Server Action = Validation + Auth + Business Logic.
RULE 5 — Always use Zod for input validation.
RULE 6 — Always use requireRole() for protected actions.
RULE 7 — Never invent schema. If a column's existence or shape is
  unknown, confirm against the live database first.
RULE 8 — Never invent enums.
RULE 9 — Reuse existing architecture/patterns rather than introducing
  a new one for the same kind of problem.
RULE 10 — Never modify a completed (Frozen) milestone unless it's a
  confirmed bug or regression.
RULE 11 — One milestone at a time. Do not blend scope across
  milestones without explicit sign-off.
RULE 12 — No assumptions. If intent or requirement is ambiguous, stop
  and ask rather than guessing.
RULE 13 — If schema is unknown → STOP. Do not proceed on a guess.
RULE 14 — Inspect first, always, even for "small" changes.
RULE 15 — Before coding, always provide: Existing Architecture, Root
  Cause, Files, Why, Minimal Plan.
RULE 16 — See Section F (Definition of Done) — this replaces v1's
  original checklist, which only required Files/Build/TypeScript
  status and did not catch CONTACT-01's failure mode.
RULE 17 — Always update CHANGELOG.md.
RULE 18 — Always update PROJECT_STATUS.md.
RULE 19 — Never skip self-review before declaring a milestone done.
RULE 20 — Completed milestones become Frozen (see RULE 10).

---

## B. Testing & Verification

RULE 21 — "Verified" means more than `tsc`/`eslint` passing. Every
  milestone that touches a user-facing flow (booking, payment, auth,
  notifications) requires a documented manual functional walkthrough
  — the actual steps taken and actual result — recorded in
  SESSION_HANDOFF.md, not just a green build.

RULE 22 — Payment and booking mutation paths (anything that writes to
  `bookings`, `payments`, or triggers a notification) require an
  end-to-end walkthrough — real request through the real UI or a
  script hitting the real Server Action — before the milestone is
  marked Frozen. A clean `tsc --noEmit` does not catch a missing
  runtime dependency (this is exactly how CONTACT-01 shipped broken).

RULE 23 — When a milestone cannot be fully walked through in the
  current environment (e.g. sandboxed network, missing prod
  credentials), that gap must be named explicitly in SESSION_HANDOFF
  as "Not verified: X" — never silently omitted, and never implied to
  be covered by a passing typecheck.

---

## C. Security

RULE 24 — Every new table gets Row Level Security enabled, and its
  policy is documented in `DATABASE_BIBLE.md` in the same session that
  creates the table — before any client or Server Action code reads
  or writes it.

RULE 25 — Any user-supplied string that ends up in an email, WhatsApp
  message, or other rendered/sent output (e.g. guest name, special
  requests) must be treated as untrusted: escape/sanitize before
  interpolating into HTML or templates.

RULE 26 — Any inbound webhook (payment provider, future integrations)
  must verify its signature before the payload is trusted or acted
  on. No processing happens on an unverified webhook body.

RULE 27 — Role/permission checks are server-side only. A client-side
  role check is a UX convenience, never a security boundary — every
  Server Action re-verifies via `requireRole()` regardless of what the
  UI already checked (this is already the pattern; this rule makes it
  explicit and non-negotiable).

RULE 28 — Ownership checks (e.g. `verifyRoomOwnership`) are required
  on every mutation where a row belongs to a specific vendor/hotel —
  a `hotel_owner` role must never be able to mutate another hotel's
  data by role alone; the specific row's ownership is always checked.

---

## D. Secrets & Environment Variables

RULE 29 — Any new environment variable is added to `.env.example`
  *and* to `serverEnvSchema`/`clientEnvSchema` in `src/lib/config/env.ts`
  in the same session that introduces code depending on it. Code that
  reads `process.env.X` directly without `X` existing in both places
  is treated as incomplete, not done — regardless of typecheck status.

RULE 30 — For every third-party integration (payment, email, WhatsApp,
  future ones), document in code comments and in PROJECT_STATUS: (a)
  what happens if its credentials are missing — fails loud, fails
  silent-but-logged, or feature is gated off — and (b) its current
  status: active / interim-provider / deferred-no-provider-chosen.

RULE 31 — Real secrets never get committed. `.gitignore` coverage for
  `.env*` is verified at the start of any session that touches env
  config, not assumed.

---

## E. Migration Safety

RULE 32 — A migration file claimed as "created" in SESSION_HANDOFF or
  CHANGELOG must actually exist in `src/db/sql/` in the delivered
  state of the repo. A session never ends with a migration referenced
  in prose but absent from disk (this exact failure happened with
  `008_room05_booking_room_linkage.sql`).

RULE 33 — Migrations are idempotent where practical (`IF NOT EXISTS` /
  `IF EXISTS` guards) so a migration can be safely re-run if its
  "was this actually applied in production?" status is uncertain.

RULE 34 — Before running a destructive change against production
  (`DROP COLUMN`, `DROP TABLE`, data-mutating `UPDATE`/`DELETE`
  migrations), CHANGELOG.md gets an explicit pre-run note: what's
  being dropped/changed, and confirmation that the person running it
  has read it. No destructive migration is run silently.

RULE 35 — After any manually-run migration, SESSION_HANDOFF.md is
  updated to say whether it has been confirmed run against production
  — "not yet confirmed run" is an acceptable state, but it must be
  stated, not left ambiguous.

---

## F. Performance & Scale

RULE 36 — List/table-reading queries expected to grow (bookings,
  rooms, prices, images) are paginated or otherwise bounded. No
  unbounded `select *` on a table with unbounded growth.

RULE 37 — No N+1 query patterns — a loop that issues one Supabase
  call per iteration over a list is flagged and batched/joined instead
  before a milestone is marked done.

---

## G. Monitoring & Observability

RULE 38 — A `catch` block that swallows an error and continues (e.g.
  "must never throw into the caller") must still `console.error` (or
  equivalent) with enough context — which entity, which operation — to
  diagnose from logs later. A silent catch with no logging is not
  acceptable, even when the design intentionally prevents the error
  from propagating.

RULE 39 — Failures on critical paths (payment webhook, booking
  insert, notification dispatch) get a `// TODO: alerting` marker
  where a real alerting integration (Sentry or similar) would
  eventually hook in. Building the alerting system itself is out of
  scope until explicitly milestoned, but the hook points are marked as
  they're written, not retrofitted later.

---

## H. Documentation Debt Register

RULE 40 — If, during any session, code is discovered in the repo that
  implements a real feature but has no corresponding entry in
  PROJECT_STATUS.md/CHANGELOG.md/SESSION_HANDOFF.md, it is not adopted
  silently as "already done." It is logged immediately in
  `DOC_DEBT.md` (create if absent) with: what the code does, what
  files, and an explicit status of "undocumented — needs a backfill
  session or a removal decision." This is what should have caught
  CONTACT-01 the moment it was written.

---

## F2. Definition of Done (replaces v1 RULE 16)

A milestone is only marked Frozen when ALL of the following are true
and recorded in SESSION_HANDOFF.md:

1. Files Modified / Files Created — explicit list.
2. TypeScript (`tsc --noEmit`): PASS/FAIL.
3. ESLint: PASS/FAIL.
4. Functional walkthrough: what was manually tested end-to-end, and
   the actual result — not just "should work."
5. New environment variables, if any: confirmed present in both
   `.env.example` and the Zod env schema (RULE 29).
6. New tables, if any: RLS enabled and policy documented (RULE 24).
7. New/claimed migration files: confirmed to exist on disk (RULE 32)
   and their production-run status stated (RULE 35).
8. Pending Issues — anything knowingly deferred or unverified.
9. PROJECT_STATUS.md and CHANGELOG.md updated in the same session
   (RULE 17/18) — not deferred to "later."

If any of 1–9 cannot be completed (e.g. sandbox can't reach a live
service), that item is explicitly marked "not verified — reason X,"
never silently skipped.
