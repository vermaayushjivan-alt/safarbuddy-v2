'use server';

// VENDOR-03 (M2) — Self-service "List Your Property" submission.
//
// RULE 15 decision (recorded in chat session, mirrored here per
// project convention): this action is intentionally NOT gated by
// requireRole() — the whole point is that a brand-new visitor with
// no role yet can submit a listing. Safety instead comes from:
//   1. Every write happens through createServiceRoleClient() (RLS
//      bypass, trusted-server-operation pattern already established
//      for the Cashfree webhook — see supabase/server.ts), not the
//      caller-supplied session client.
//   2. The auth user id acted on is always the id returned by THIS
//      action's own supabase.auth.signUp() call, never a client-
//      supplied id.
//   3. grantSelfServiceRole() is hardcoded to hotel_owner/vendor only
//      (src/lib/auth/roles.ts) — this action cannot grant admin.
//   4. The created hotel always starts status='pending' — a
//      self-service submission is never auto-published (ADMIN-02's
//      approval queue, M4, is what flips it to 'active').
//
// One consolidated Zod schema covers all four sections the person
// fills in a single page (owner account, property details,
// facilities, payout/contact) — no multi-step wizard, per explicit
// project-owner request.

import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { grantSelfServiceRole } from '@/lib/auth/roles';
import { resolvePublicUserId } from '@/lib/auth/session';
import { HotelRepository } from '@/lib/repositories/hotel.repository';
import { VendorRepository } from '@/lib/repositories/vendor.repository';
import { VendorPayoutRepository } from '@/lib/repositories/vendor-payout.repository';
import {
  VendorKycRepository,
  VENDOR_KYC_BUCKET,
} from '@/lib/repositories/vendor-kyc.repository';
import {
  HotelFacilityRepository,
  HotelFacilityLinkRepository,
} from '@/lib/repositories/hotel-facility.repository';
import { sendEmail } from '@/lib/notifications/email.client';
import { runAction, emptyToNull, type ActionResult } from '@/lib/actions/action-result';
import { slugify } from '@/lib/utils/format';

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

// Same bound as hotel.actions.ts's MAX_BOOKING_AMOUNT — starting_price
// ultimately feeds the same numeric(10,2) column.
const MAX_STARTING_PRICE = 99_999_999.99;

const propertyListingSchema = z
  .object({
    // --- Section 1: owner account ---
    ownerFullName: z.string().min(2, 'Full name is too short.'),
    ownerEmail: z.string().email('Enter a valid email address.'),
    ownerPhone: z
      .string()
      .trim()
      .min(7, 'Enter a valid phone number.')
      .max(20, 'Phone number is too long.'),
    // Optional at the schema level: required only for a brand-new
    // visitor. An already-logged-in submitter (see ALREADY-AUTH-01
    // branch in submitPropertyListing below) skips account creation
    // entirely, so these are validated conditionally in the action,
    // not here — a shared object-level refine can't see the session.
    password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
    confirmPassword: z.string().optional(),

    // --- Section 2: property details ---
    hotelName: z.string().min(2, 'Property name is required.'),
    description: z.preprocess(emptyToNull, z.string().nullable().optional()),
    propertyCity: z.string().min(1, 'City is required.'),
    propertyState: z.preprocess(emptyToNull, z.string().nullable().optional()),
    propertyCountry: z.string().min(1, 'Country is required.'),
    propertyAddress: z.string().min(1, 'Address is required.'),
    starRating: z.preprocess(
      emptyToNull,
      z.number().min(0).max(5).nullable().optional()
    ),
    startingPrice: z.preprocess(
      emptyToNull,
      z
        .number()
        .min(0)
        .max(MAX_STARTING_PRICE, 'The amount is too large.')
        .nullable()
        .optional()
    ),

    // --- Section 3: facilities (ids from hotel_facilities catalog) ---
    facilityIds: z.array(z.string().uuid()).default([]),

    // --- Section 4: payout + booking-contact details ---
    bankAccountNumber: z.preprocess(emptyToNull, z.string().nullable().optional()),
    bankIfsc: z.preprocess(emptyToNull, z.string().nullable().optional()),
    upiId: z.preprocess(emptyToNull, z.string().nullable().optional()),
    contactPhone: z
      .string()
      .trim()
      .min(7, 'Enter a valid contact phone number.')
      .max(20, 'Phone number is too long.'),
    contactEmail: z.string().email('Enter a valid contact email address.'),
    website: z.preprocess(
      emptyToNull,
      z.string().trim().url('Enter a valid URL, e.g. https://example.com').nullable().optional()
    ),
  })
  .refine((data) => Boolean(data.bankAccountNumber && data.bankIfsc) || Boolean(data.upiId), {
    message: 'Provide either bank account + IFSC, or a UPI ID.',
    path: ['upiId'],
  });

export type PropertyListingInput = z.infer<typeof propertyListingSchema>;

// KYC-01: the three identity documents, kept as a separate parameter
// (not part of the Zod-validated object above) — a File is not a
// value Zod's .parse() output should be carrying around, same reason
// uploadRoomImageAdmin() keeps its `file: File` parameter outside its
// own Zod schema. All three are optional at the type level so a
// submitter can send only the ones they have ready; this action never
// blocks a listing on missing documents — an owner can finish KYC
// later (dashboard upload flow not yet built — flagged, not silently
// assumed).
export interface PropertyListingKycFiles {
  aadharFile?: File | null;
  panFile?: File | null;
  passbookFile?: File | null;
}

const KYC_ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const KYC_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type PropertyListingResult = {
  hotelId: string;
  vendorId: string;
  status: 'pending';
  // ALREADY-AUTH-01: false when this submission reused an existing
  // logged-in session instead of creating a new auth account — the
  // form uses this to decide whether to show the "check your email
  // to confirm" message (only relevant when a new account was made).
  accountCreated: boolean;
  // KYC-01: which of the three documents actually got uploaded and
  // saved. A failed individual upload does not fail the whole
  // submission (see uploadKycDocument below) — the form uses this to
  // tell the owner exactly which document(s) to retry, instead of a
  // vague "something went wrong" after the listing already succeeded.
  kycUploaded: {
    aadhar: boolean;
    pan: boolean;
    passbook: boolean;
  };
};

/* -------------------------------------------------------------------------- */
/* Public read: facility catalog for the form's checklist                    */
/* -------------------------------------------------------------------------- */

export async function getFacilityCatalog() {
  const supabase = await createClient();
  const repo = new HotelFacilityRepository(supabase);
  return repo.getActiveFacilities();
}

/* -------------------------------------------------------------------------- */
/* KYC document upload helper                                                */
/* -------------------------------------------------------------------------- */

function kycExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      throw new Error(`Unsupported KYC document type: ${mimeType}`);
  }
}

// Uploads one document to the private vendor-kyc-documents bucket
// (must already exist, created manually via the Supabase dashboard
// with "Public bucket" OFF — see migration 018's header). Returns the
// storage path on success, or null on any failure — this function
// never throws, so one bad file (wrong type, too large, a transient
// Storage error) never fails the entire property listing submission
// that's already succeeded by the time KYC upload runs. Every failure
// is logged with context (RULE 38) so it is at least visible server-
// side, and reported back to the caller via PropertyListingResult.
// kycUploaded above so the form can tell the owner what to retry.
async function uploadKycDocument(
  admin: ReturnType<typeof createServiceRoleClient>,
  vendorId: string,
  label: 'aadhar' | 'pan' | 'passbook',
  file: File
): Promise<string | null> {
  if (!KYC_ALLOWED_FILE_TYPES.includes(file.type)) {
    console.error(
      `[submitPropertyListing] KYC ${label} rejected — unsupported type`,
      file.type
    );
    return null;
  }

  if (file.size > KYC_MAX_FILE_SIZE_BYTES) {
    console.error(
      `[submitPropertyListing] KYC ${label} rejected — file too large`,
      file.size
    );
    return null;
  }

  try {
    const ext = kycExtensionFromMimeType(file.type);
    const objectKey = `${vendorId}/${label}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from(VENDOR_KYC_BUCKET)
      .upload(objectKey, file, {
        contentType: file.type,
        // A resubmission (e.g. after an admin rejection) replaces the
        // same document rather than accumulating orphaned old files —
        // unlike room images, there is only ever one current Aadhar/
        // PAN/passbook per vendor.
        upsert: true,
      });

    if (uploadError) {
      console.error(
        `[submitPropertyListing] KYC ${label} upload failed`,
        uploadError.message
      );
      return null;
    }

    return objectKey;
  } catch (error) {
    console.error(`[submitPropertyListing] KYC ${label} upload threw`, error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Submission                                                                 */
/* -------------------------------------------------------------------------- */

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  );
}

export async function submitPropertyListing(
  input: PropertyListingInput,
  kycFiles?: PropertyListingKycFiles
): Promise<ActionResult<PropertyListingResult>> {
  return runAction(async () => {
    const parsed = propertyListingSchema.parse(input);

    // Step 1 — create the auth user via the session-bound client so a
    // session cookie is set for the caller when email confirmation is
    // not required by the Supabase project's auth settings. If
    // confirmation IS required, this signUp() call still succeeds and
    // returns a user id — the rest of this action does not depend on
    // an active session, precisely because it switches to the
    // service-role client below (RULE 15 decision, see file header).
    const sessionClient = await createClient();

    // ALREADY-AUTH-01 (2026-09-03): an existing SafarBuddy customer
    // (e.g. someone who already has an account from booking a trip)
    // could never list a property before this fix — signUp() always
    // ran unconditionally and Supabase Auth correctly rejects it with
    // "User already registered" for an email that already has an
    // account, hard-blocking the whole form. Checked here first so a
    // logged-in visitor reuses their existing account instead of
    // attempting a second signup.
    const {
      data: { user: existingSessionUser },
    } = await sessionClient.auth.getUser();

    let newUserId: string;
    let accountCreated: boolean;

    if (existingSessionUser) {
      newUserId = existingSessionUser.id;
      accountCreated = false;
    } else {
      // Brand-new visitor — password fields are required and must
      // match. Not enforced in the Zod schema above because the
      // schema has no visibility into session state (see comment
      // there).
      if (!parsed.password || parsed.password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      if (parsed.password !== parsed.confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      const { data: signUpData, error: signUpError } =
        await sessionClient.auth.signUp({
          email: parsed.ownerEmail,
          password: parsed.password,
          options: {
            data: { full_name: parsed.ownerFullName },
            emailRedirectTo: `${getSiteUrl()}/auth/callback`,
          },
        });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const signedUpId = signUpData.user?.id;

      if (!signedUpId) {
        throw new Error('Account creation did not return a user id.');
      }

      newUserId = signedUpId;
      accountCreated = true;
    }

    // Step 2 onward — trusted, service-role writes. Never trust a
    // user id from `input`; only ever the id just returned above.
    const admin = createServiceRoleClient();

    // P0.3 fix (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 9):
    // `newUserId` above is the raw Supabase Auth id (auth.users.id).
    // grantSelfServiceRole() writes to user_roles.user_id, which
    // references public.users.id — a DIFFERENT, independently
    // generated id (public.users has its own `id` plus a separate
    // `auth_user_id` column, confirmed live this session). Granting
    // the role against the raw auth id instead of the real
    // public.users.id would silently create a role row that never
    // matches when the new owner actually logs in and requireRole()
    // checks their roles — they'd hit "Unauthorized" on
    // /hotel-owner immediately after a "successful" signup. The
    // on_auth_user_created trigger (001_auth_sync_trigger.sql) runs
    // synchronously as part of auth.signUp() above, so the matching
    // public.users row (with auth_user_id = newUserId) is guaranteed
    // to already exist by this point.
    const ownerUserId = await resolvePublicUserId(admin, newUserId);

    const vendorRepo = new VendorRepository(admin);
    const hotelRepo = new HotelRepository(admin);
    const payoutRepo = new VendorPayoutRepository(admin);
    const kycRepo = new VendorKycRepository(admin);
    const facilityLinkRepo = new HotelFacilityLinkRepository(admin);

    // ALREADY-AUTH-01: an existing customer's account can only ever
    // list one property through this self-service form — a second
    // property for the same owner needs its own (not-yet-built) M4
    // admin/dashboard flow, not a second vendor row from this action.
    const existingVendorForOwner = await vendorRepo.getVendorByOwnerUserId(ownerUserId);
    if (existingVendorForOwner) {
      throw new Error(
        'You already have a property listed with this account. Contact support to add another property.'
      );
    }

    const vendor = await vendorRepo.createVendor({
      vendor_name: parsed.hotelName,
      vendor_type: 'hotel_owner_self_service',
      owner_user_id: ownerUserId,
      business_email: parsed.contactEmail,
      business_phone: parsed.contactPhone,
      gstin: null,
      pan_number: null,
      // Vendor itself also starts pending — an admin approves both
      // the vendor and the hotel together in M4's review queue.
      status: 'pending',
    });

    const hotel = await hotelRepo.createHotel({
      hotel_name: parsed.hotelName,
      slug: slugify(`${parsed.hotelName}-${Date.now()}`),
      description: parsed.description ?? null,
      city: parsed.propertyCity,
      state: parsed.propertyState ?? null,
      country: parsed.propertyCountry,
      address: parsed.propertyAddress,
      star_rating: parsed.starRating ?? null,
      starting_price: parsed.startingPrice ?? null,
      status: 'pending',
      vendor_id: vendor.id,
      phone: parsed.contactPhone,
      email: parsed.contactEmail,
      website: parsed.website ?? null,
      is_featured: false,
    });

    if (parsed.facilityIds.length > 0) {
      await facilityLinkRepo.setFacilitiesForHotel(hotel.id, parsed.facilityIds);
    }

    await payoutRepo.upsertForVendor(vendor.id, {
      bank_account_number: parsed.bankAccountNumber ?? null,
      bank_ifsc: parsed.bankIfsc ?? null,
      upi_id: parsed.upiId ?? null,
    });

    // KYC-01: upload whichever documents were provided. Each upload is
    // independent and best-effort (see uploadKycDocument's header) —
    // a failure here must never undo the hotel/vendor rows already
    // created above, same "never invalidate the primary record"
    // caution as the admin alert email below.
    const kycUploaded = { aadhar: false, pan: false, passbook: false };

    if (kycFiles?.aadharFile || kycFiles?.panFile || kycFiles?.passbookFile) {
      const [aadharPath, panPath, passbookPath] = await Promise.all([
        kycFiles.aadharFile
          ? uploadKycDocument(admin, vendor.id, 'aadhar', kycFiles.aadharFile)
          : Promise.resolve(null),
        kycFiles.panFile
          ? uploadKycDocument(admin, vendor.id, 'pan', kycFiles.panFile)
          : Promise.resolve(null),
        kycFiles.passbookFile
          ? uploadKycDocument(admin, vendor.id, 'passbook', kycFiles.passbookFile)
          : Promise.resolve(null),
      ]);

      if (aadharPath || panPath || passbookPath) {
        await kycRepo.upsertDocumentPaths(vendor.id, {
          ...(aadharPath ? { aadhar_storage_path: aadharPath } : {}),
          ...(panPath ? { pan_storage_path: panPath } : {}),
          ...(passbookPath ? { passbook_storage_path: passbookPath } : {}),
        });
      }

      kycUploaded.aadhar = Boolean(aadharPath);
      kycUploaded.pan = Boolean(panPath);
      kycUploaded.passbook = Boolean(passbookPath);
    }

    // Grant hotel_owner so the new user can reach /hotel-owner once
    // they confirm their email and log in. Allowlist-restricted — see
    // src/lib/auth/roles.ts header for why this call is safe here.
    // Uses the resolved public.users.id (ownerUserId), not the raw
    // auth id — see the P0.3 fix comment above `admin =
    // createServiceRoleClient()`.
    await grantSelfServiceRole(ownerUserId, 'hotel_owner');

    // Admin alert — best-effort only. A failure here must never fail
    // the listing submission itself (same "never invalidate the
    // primary record" caution as CONTACT-01's booking notifications).
    // TODO: alerting — hook a real alert (Sentry or similar) here if
    // this send fails, once that integration exists (RULE 39).
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      const emailResult = await sendEmail({
        to: adminEmail,
        subject: `New property listing submitted: ${parsed.hotelName}`,
        html: `
          <p>A new property was submitted for review via self-service onboarding.</p>
          <ul>
            <li><strong>Property:</strong> ${escapeHtml(parsed.hotelName)}</li>
            <li><strong>Owner:</strong> ${escapeHtml(parsed.ownerFullName)} (${escapeHtml(parsed.ownerEmail)})</li>
            <li><strong>City:</strong> ${escapeHtml(parsed.propertyCity)}</li>
            <li><strong>Hotel ID:</strong> ${hotel.id}</li>
            <li><strong>Vendor ID:</strong> ${vendor.id}</li>
            <li><strong>KYC documents uploaded:</strong> ${
              [
                kycUploaded.aadhar && 'Aadhar',
                kycUploaded.pan && 'PAN',
                kycUploaded.passbook && 'Bank passbook',
              ]
                .filter(Boolean)
                .join(', ') || 'None yet'
            }</li>
          </ul>
          <p>Review it in the admin dashboard under Hotels (status: pending).</p>
        `,
      });

      if (!emailResult.success) {
        // RULE 38 — swallowed error must still be logged with context.
        console.error('[submitPropertyListing] admin alert email failed:', emailResult.error);
      }
    } else {
      console.error(
        '[submitPropertyListing] ADMIN_NOTIFICATION_EMAIL not configured — skipped admin alert for hotel',
        hotel.id
      );
    }

    return {
      hotelId: hotel.id,
      vendorId: vendor.id,
      status: 'pending' as const,
      accountCreated,
      kycUploaded,
    };
  });
}

// RULE 25 — user-supplied strings interpolated into an emailed HTML
// template must be escaped first.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  }

      
