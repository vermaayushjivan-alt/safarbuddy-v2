## VENDOR-01 — ADMIN-09 Field-Mapping Correction
**Date:** 2026-08-09

### Root cause
`VendorRecord`, `vendorInputSchema`, and the vendor admin UI targeted column
names (`business_name`, `user_id`, `gst_number`, `is_approved`,
`approved_at`) that do not exist on the live `public.vendors` table. The
live table uses `vendor_name`, `vendor_type`, `owner_user_id`,
`business_email`, `business_phone`, `gstin`, `pan_number`, `status`. The
`vendors` query itself was always correct (right table, all 3 live rows
returned) — only the field mapping was wrong, which is why vendor names
rendered blank in `/admin/vendors` while the total count was correct.

### Modified
- `src/lib/repositories/vendor.repository.ts` — `VendorRecord` interface
  reconciled to the live column names.
- `src/app/actions/vendor.actions.ts` — `vendorInputSchema` (Zod)
  reconciled to the live column names. `owner_user_id` kept
  optional/nullable (nullability unverified beyond existing rows having
  it null); `status` validated as a non-empty string with no enum
  invented (allowed values unverified).
- `src/components/admin/vendors/VendorForm.tsx` — form fields renamed to
  match; "Approved" checkbox replaced with a plain "Status" text field
  since no boolean approval column exists live.
- `src/app/admin/vendors/page.tsx` — list table renamed to match.
- `src/app/admin/vendors/[id]/branches/page.tsx` — heading renamed to
  match (direct consequence of the `VendorRecord` rename).

### Not changed (explicitly out of scope for this milestone)
- No SQL, no migration, no schema change, no data change.
- `vendor_branches` table/methods untouched.
- Existing 3 vendor UUIDs untouched (Golden Sands Hospitality, Grand
  Palace Hospitality Group, SafarBuddy Holidays Pvt Ltd).
- Hotel `vendor_id` creation gap — unresolved, separate issue.
- `findWithPagination` empty-message production error — unresolved,
  needs log evidence.
- Google OAuth `unexpected_failure` — unresolved, likely a Supabase/
  Google dashboard config issue outside this codebase.

### Frozen files/milestones untouched
- `src/lib/repositories/booking.repository.ts` (BOOKING-01)
- `src/lib/actions/payment.actions.ts` / `payment.repository.ts` (PAY-01)
- `src/lib/cashfree/cashfree.client.ts` (PAY-01)
- `src/app/api/public/cashfree/webhook/route.ts` (PAY-01)
- `src/lib/auth/session.ts` (AUTH-05)
- `middleware.ts` (AUTH-06)
- `src/app/actions/hotel.actions.ts`, `src/components/admin/hotels/HotelForm.tsx` (ADMIN-02 — intentionally not touched this milestone)

### Verification
- TypeScript (`npx tsc --noEmit`): PASS, 0 errors.
- ESLint (`npx eslint .`): PASS, 0 errors, 1 pre-existing unrelated
  warning (`components/layout/ProfileMenu.tsx`, `<img>` usage).
- Production build (`npm run build`): blocked by the same pre-existing
  sandbox-only Google Fonts network restriction documented in prior
  entries — not a code error, not introduced by this change.
