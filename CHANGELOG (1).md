CHANGELOG.md

All significant SafarBuddy V2 changes are recorded here.

2026-08-16 — ROOM-03 — Room Rates / Pricing

Status: COMPLETE — Frozen — Deployment Ready

Audit finding: RoomPriceRepository (src/lib/repositories/room-price.repository.ts), room-price.actions.ts, and RoomPriceManager.tsx were already fully implemented and verified against the live public.room_prices schema by a prior, undocumented session — but RoomPriceManager was never imported by any page (dead code), and no PROJECT_STATUS/CHANGELOG/SESSION_HANDOFF entry existed for it.

Created

src/app/admin/hotels/[id]/rooms/[roomId]/pricing/page.tsx — wires the pre-existing RoomPriceManager into the route already referenced by the rooms list, room edit, and room images pages' navigation.

Modified

None. No repository, action, schema, or RLS files were changed — the existing backend was already correct.

Confirmed live public.room_prices columns (per repository comments, verified via production information_schema): id, room_id, price_date, base_price, discount_amount, tax_amount, final_price, currency_id, created_at, updated_at, created_by, updated_by, deleted_at. Parent table for room_id is hotel_rooms.

Verification

TypeScript: PASS (0 errors).

ESLint: PASS (0 errors, 1 pre-existing unrelated warning).

Build: blocked only by sandbox Google Fonts network restriction (environment-only, not a code defect).

Scope

ROOM-03 implements per-day room pricing only.

Also audited but explicitly deferred: ROOM-04 (room_inventory) has a similarly complete, undocumented backend (RoomInventoryRepository) but no CRUD actions or admin page — flagged as the next milestone, not implemented this session, per RULE 11 (one milestone at a time).

Architecture

Existing repository/action/component architecture retained. No new abstraction layers introduced.

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
