CHANGELOG.md

All significant SafarBuddy V2 changes are recorded here.

2026-08-12 — ADMIN-10 / ROOM-01 — Hotel Room Type Management

Status: COMPLETE — Frozen — Deployment Ready

Created

src/app/admin/hotels/[id]/rooms/page.tsx

src/app/admin/hotels/[id]/rooms/[roomId]/edit/page.tsx

src/components/admin/rooms/RoomTypeForm.tsx

src/lib/actions/room-type.actions.ts

src/lib/repositories/room-type.repository.ts

src/lib/validations/room-type.schema.ts

Modified

src/app/admin/hotels/[id]/page.tsx

src/components/admin/hotels/HotelTable.tsx

src/lib/validations/index.ts

src/components/admin/layout/AdminSidebar.tsx

Scope

ROOM-01 implements hotel room types only.

Deferred:

ROOM-02 — Room Images

ROOM-03 — Room Rates

ROOM-04 — Room Inventory / Availability

ROOM-05 — Booking-Room Linkage

Fixes

Fixed missing RoomTypeForm export.

Fixed RoomTypeFormProps mode mismatch.

Fixed room-list return-shape TypeScript mismatch.

Architecture

Existing repository/action/form architecture retained. No unrelated frozen milestone intentionally reopened.

2026-08-12 — PAY-03 — Admin Payment Management UI

Status: COMPLETE — Frozen

Added:

src/app/admin/payments/page.tsx

src/app/admin/payments/[id]/page.tsx

Modified:

src/app/admin/page.tsx

PAY-01/PAY-02 were already implemented and were documented as Completed/Frozen. PAY-03 added the missing read-only admin UI. No schema change and no new payment mutation.

2026-08-09 — VENDOR-01 — ADMIN-09 Field-Mapping Correction

Status: COMPLETE — Frozen

Reconciled Vendor Management with the live public.vendors columns. No SQL/schema/data migration.

Documentation rule

Every completed milestone updates:

PROJECT_STATUS.md

SESSION_HANDOFF.md

CHANGELOG.md

Completed milestones are frozen under DEVELOPMENT_BIBLE.md RULE 20.
