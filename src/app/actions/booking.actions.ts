"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  requireRole,
  getAuthUser,
} from "@/lib/auth/session";

import {
  BookingRepository,
  BookingRecord,
  BookingStatus,
  BookingType,
} from "@/lib/repositories/booking.repository";

import { HotelRepository } from "@/lib/repositories/hotel.repository";
import { PackageRepository } from "@/lib/repositories/package.repository";

// -----------------------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------------------

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

const dateString =
  z
    .string()
    .regex(
      DATE_PATTERN,
      "Invalid date (expected YYYY-MM-DD)"
    );

const createBookingBaseSchema =
  z.object({
    booking_type:
      z.enum([
        "hotel",
        "package",
      ]),

    hotel_id:
      z.string()
        .uuid()
        .nullable()
        .optional(),

    package_id:
      z.string()
        .uuid()
        .nullable()
        .optional(),

    check_in_date:
      dateString
        .nullable()
        .optional(),

    check_out_date:
      dateString
        .nullable()
        .optional(),

    travel_date:
      dateString
        .nullable()
        .optional(),

    num_guests:
      z.number()
        .int()
        .min(
          1,
          "At least 1 guest is required"
        ),
  });

const createBookingSchema =
  createBookingBaseSchema.superRefine(
    (val, ctx) => {
      if (
        val.booking_type ===
        "hotel"
      ) {
        if (!val.hotel_id) {
          ctx.addIssue({
            code: "custom",
            path: ["hotel_id"],
            message:
              "hotel_id is required for hotel bookings",
          });
        }

        if (val.package_id) {
          ctx.addIssue({
            code: "custom",
            path: ["package_id"],
            message:
              "package_id must not be set for hotel bookings",
          });
        }

        if (!val.check_in_date) {
          ctx.addIssue({
            code: "custom",
            path: ["check_in_date"],
            message:
              "check_in_date is required for hotel bookings",
          });
        }

        if (!val.check_out_date) {
          ctx.addIssue({
            code: "custom",
            path: ["check_out_date"],
            message:
              "check_out_date is required for hotel bookings",
          });
        }

        if (
          val.check_in_date &&
          val.check_out_date &&
          val.check_out_date <=
            val.check_in_date
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["check_out_date"],
            message:
              "check_out_date must be after check_in_date",
          });
        }

        if (val.travel_date) {
          ctx.addIssue({
            code: "custom",
            path: ["travel_date"],
            message:
              "travel_date must not be set for hotel bookings",
          });
        }
      }

      if (
        val.booking_type ===
        "package"
      ) {
        if (!val.package_id) {
          ctx.addIssue({
            code: "custom",
            path: ["package_id"],
            message:
              "package_id is required for package bookings",
          });
        }

        if (val.hotel_id) {
          ctx.addIssue({
            code: "custom",
            path: ["hotel_id"],
            message:
              "hotel_id must not be set for package bookings",
          });
        }

        if (!val.travel_date) {
          ctx.addIssue({
            code: "custom",
            path: ["travel_date"],
            message:
              "travel_date is required for package bookings",
          });
        }

        if (
          val.check_in_date ||
          val.check_out_date
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["check_in_date"],
            message:
              "check_in_date/check_out_date must not be set for package bookings",
          });
        }
      }
    }
  );

export type CreateBookingInput =
  z.infer
    typeof createBookingBaseSchema
  >;

const cancelBookingSchema =
  z.object({
    id:
      z.string().uuid(),

    reason:
      z.string()
        .min(
          1,
          "A cancellation reason is required"
        )
        .max(500),
  });

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

/**
 * The authenticated Supabase user ID is auth.users.id.
 *
 * bookings.customer_id stores public.users.id (the row's own primary
 * key) — NOT auth.users.id directly. The two are linked via a separate
 * `public.users.auth_user_id` column, confirmed live via
 * information_schema.columns (2026-08-17 production audit):
 *   id uuid, auth_user_id uuid, full_name text, email text, phone text,
 *   status text, is_verified boolean, created_at/updated_at timestamptz,
 *   created_by/updated_by uuid, deleted_at timestamptz.
 * This is also independently confirmed by the live RLS policy
 * `users_select_self` (`auth_user_id = auth.uid()`), pulled via
 * pg_policies in the same audit.
 *
 * CORRECTION (supersedes the previous comment in this function, and the
 * "Auth architecture (LOCKED)" section of DATABASE_BIBLE.md, both of
 * which incorrectly stated public.users.id === auth.users.id with no
 * auth_user_id column): a prior session changed this filter from
 * `.eq("auth_user_id", authUserId)` to `.eq("id", authUserId)` based on
 * that incorrect documentation. Since `id` and `auth_user_id` are
 * different columns/values, that query correctly ran but matched zero
 * rows for every real user (RLS enforces `auth_user_id = auth.uid()`,
 * so a query filtered on `id` finds nothing), which this function then
 * throws as USER_PROFILE_NOT_FOUND — surfacing to the client as the
 * reported production 500 on every hotel/package booking attempt.
 * Reverted to filter on `auth_user_id`, and the returned value remains
 * `data.id` (public.users.id, the primary key), which is what
 * bookings.customer_id actually expects.
 *
 * Exported (2026-08-17) so payment.actions.ts and any other server
 * action that needs to resolve auth.users.id -> public.users.id can
 * reuse this single implementation instead of re-deriving it
 * (DEVELOPMENT_BIBLE RULE 1 — never create duplicate code). This is
 * the same bug class that made payment.actions.ts compare
 * booking.user_id (public.users.id) directly against authUser.id
 * (auth.users.id) and insert authUser.id into payments.user_id, which
 * has a foreign key to public.users(id) — both fixed in this pass by
 * routing through this function instead.
 */
export async function getPublicUserId(
  supabase: Awaited
    ReturnType<typeof createClient>
  >,
  authUserId: string
): Promise<string> {
  const {
    data,
    error,
  } = await supabase
    .from("users")
    .select("id")
    .eq(
      "auth_user_id",
      authUserId
    )
    .is(
      "deleted_at",
      null
    )
    .maybeSingle();

  // TEMPORARY DIAGNOSTIC — safe fields only (no keys/tokens/secrets).
  // Remove once the production root cause is confirmed from Vercel logs.
  console.error(
    "[booking-debug] getPublicUserId",
    {
      userExists: Boolean(authUserId),
      data: data ? { id: data.id } : null,
      error: error
        ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          }
        : null,
    }
  );

  if (error) {
    console.error(
      "[booking] getPublicUserId failed",
      error
    );

    throw new Error(
      "Unable to load your user profile."
    );
  }

  if (!data?.id) {
    throw new Error(
      "USER_PROFILE_NOT_FOUND"
    );
  }

  return data.id;
}

/**
 * Resolve INR currency.
 *
 * bookings.currency_id is NOT nullable, so we cannot simply put "INR"
 * into the booking row.
 *
 * CORRECTION: a previous pass changed this filter to
 * `.eq("is_active", true)`, based on a sibling query in
 * room-price.repository.ts. That was wrong — the actual live
 * public.currencies schema (confirmed via production SQL: id, code,
 * name, symbol, created_at, updated_at, created_by, updated_by,
 * deleted_at) has no `is_active` column at all. Reverted to
 * `.is("deleted_at", null)`, which matches the real schema and matches
 * the confirmed-live INR row (deleted_at IS NULL).
 *
 * Since the INR row is confirmed to exist and is not soft-deleted, but
 * production still threw INR_CURRENCY_NOT_FOUND, the remaining
 * candidates are outside what static code inspection can prove:
 * `currencies` RLS silently returning zero rows for the
 * anon/authenticated role this Server Action runs as (RLS filters
 * rows rather than erroring), a production env var pointing at a
 * different Supabase project, or deployed code lagging behind this
 * source. The diagnostic log below (safe — no keys/tokens/passwords)
 * captures exactly which of those it is from the next real request,
 * without weakening RLS or hardcoding the known UUID as a fallback.
 */
async function getInrCurrencyId(
  supabase: Awaited
    ReturnType<typeof createClient>
  >
): Promise<string> {
  const {
    data,
    error,
  } = await supabase
    .from("currencies")
    .select("id, code, deleted_at")
    .eq("code", "INR")
    .is(
      "deleted_at",
      null
    )
    .maybeSingle();

  // TEMPORARY DIAGNOSTIC — safe fields only (no keys/tokens/secrets).
  // Remove once the production root cause is confirmed from Vercel logs.
  console.error(
    "[booking][currency-debug]",
    {
      supabaseProject: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
        : null,
      requestedCode: "INR",
      data: data
        ? {
            id: data.id,
            code: data.code,
            deleted_at: data.deleted_at,
          }
        : null,
      error: error
        ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          }
        : null,
    }
  );

  if (error) {
    console.error(
      "[booking] getInrCurrencyId failed",
      error
    );

    throw new Error(
      "Unable to load INR currency."
    );
  }

  if (!data?.id) {
    throw new Error(
      "INR_CURRENCY_NOT_FOUND"
    );
  }

  return data.id;
}

// -----------------------------------------------------------------------------
// CUSTOMER - CREATE BOOKING
// -----------------------------------------------------------------------------

export async function createBooking(
  input: CreateBookingInput
): Promise<BookingRecord> {
  // TEMPORARY DIAGNOSTIC — safe, no PII/secrets. Remove once the
  // production root cause is confirmed from Vercel logs.
  console.error(
    "[booking-debug] START",
    { booking_type: input?.booking_type }
  );

  const authUser =
    await getAuthUser();

  console.error(
    "[booking-debug] authenticated user",
    { userExists: Boolean(authUser) }
  );

  if (!authUser) {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  let parsed;

  try {
    parsed =
      createBookingSchema.parse(
        input
      );
  } catch (validationError) {
    console.error(
      "[booking-debug] booking payload validation failed",
      validationError
    );

    throw new Error(
      "Invalid booking details. Please check the form and try again."
    );
  }

  console.error(
    "[booking-debug] booking payload validation",
    { ok: true, booking_type: parsed.booking_type }
  );

  const supabase =
    await createClient();

  // ---------------------------------------------------------------------------
  // See getPublicUserId's docstring above for the full correction:
  // public.users.id !== auth.users.id (linked via auth_user_id).
  // bookings.customer_id expects public.users.id, so this resolves the
  // auth session's id to the actual public.users.id row.
  // ---------------------------------------------------------------------------

  const customerId =
    await getPublicUserId(
      supabase,
      authUser.id
    );

  // ---------------------------------------------------------------------------
  // Resolve INR
  // ---------------------------------------------------------------------------

  const currencyId =
    await getInrCurrencyId(
      supabase
    );

  console.error(
    "[booking-debug] currency lookup",
    { ok: true }
  );

  let priceSnapshot = 0;

  let vendorId:
    | string
    | null = null;

  // ---------------------------------------------------------------------------
  // HOTEL
  // ---------------------------------------------------------------------------

  if (
    parsed.booking_type ===
    "hotel"
  ) {
    const hotelRepo =
      new HotelRepository(
        supabase
      );

    const hotel =
      await hotelRepo.getHotelById(
        parsed.hotel_id as string
      );

    console.error(
      "[booking-debug] hotel lookup",
      { found: Boolean(hotel) }
    );

    if (!hotel) {
      throw new Error(
        "Hotel not found"
      );
    }

    priceSnapshot =
      Number(
        hotel.starting_price ?? 0
      );

    vendorId =
      hotel.vendor_id ??
      null;
  }

  // ---------------------------------------------------------------------------
  // PACKAGE
  // ---------------------------------------------------------------------------

  if (
    parsed.booking_type ===
    "package"
  ) {
    const packageRepo =
      new PackageRepository(
        supabase
      );

    const pkg =
      await packageRepo.getPackageById(
        parsed.package_id as string
      );

    if (!pkg) {
      throw new Error(
        "Package not found"
      );
    }

    priceSnapshot =
      Number(
        pkg.starting_price ?? 0
      );

    vendorId =
      pkg.vendor_id ??
      null;
  }

  if (
    !Number.isFinite(
      priceSnapshot
    ) ||
    priceSnapshot < 0
  ) {
    throw new Error(
      "Invalid booking price."
    );
  }

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  const bookingRepo =
    new BookingRepository(
      supabase
    );

  console.error(
    "[booking-debug] booking insert",
    {
      booking_type: parsed.booking_type,
      hasHotelId: Boolean(parsed.hotel_id),
      hasPackageId: Boolean(parsed.package_id),
    }
  );

  const created = await bookingRepo.createBooking(
    {
      customer_id:
        customerId,

      vendor_id:
        vendorId,

      booking_type:
        parsed.booking_type as BookingType,

      hotel_id:
        parsed.booking_type ===
        "hotel"
          ? parsed.hotel_id
          : null,

      package_id:
        parsed.booking_type ===
        "package"
          ? parsed.package_id
          : null,

      check_in_date:
        parsed.booking_type ===
        "hotel"
          ? parsed.check_in_date
          : null,

      check_out_date:
        parsed.booking_type ===
        "hotel"
          ? parsed.check_out_date
          : null,

      travel_date:
        parsed.booking_type ===
        "package"
          ? parsed.travel_date
          : null,

      num_guests:
        parsed.num_guests,

      price_snapshot:
        priceSnapshot,

      currency_id:
        currencyId,

      status:
        "pending",

      cancellation_reason:
        null,

      created_by:
        customerId,

      updated_by:
        customerId,
    }
  );

  console.error(
    "[booking-debug] booking insert result",
    { ok: true, id: created?.id }
  );

  console.error(
    "[booking-debug] redirect/result",
    { ok: true }
  );

  return created;
}

// -----------------------------------------------------------------------------
// CUSTOMER - MY BOOKINGS
// -----------------------------------------------------------------------------

export async function getMyBookings(
  page: number = 1,
  limit: number = 20
) {
  const authUser =
    await getAuthUser();

  if (!authUser) {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  const supabase =
    await createClient();

  const customerId =
    await getPublicUserId(
      supabase,
      authUser.id
    );

  const repo =
    new BookingRepository(
      supabase
    );

  return repo.getMyBookings(
    customerId,
    page,
    limit
  );
}

// -----------------------------------------------------------------------------
// CUSTOMER - GET ONE
// -----------------------------------------------------------------------------

export async function getMyBookingById(
  id: string
): Promise<BookingRecord | null> {
  const authUser =
    await getAuthUser();

  if (!authUser) {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  const supabase =
    await createClient();

  const customerId =
    await getPublicUserId(
      supabase,
      authUser.id
    );

  const repo =
    new BookingRepository(
      supabase
    );

  const booking =
    await repo.getBookingById(
      id
    );

  if (
    !booking ||
    booking.customer_id !==
      customerId
  ) {
    return null;
  }

  return booking;
}

// -----------------------------------------------------------------------------
// CUSTOMER - CANCEL
// -----------------------------------------------------------------------------

export async function cancelMyBooking(
  input: {
    id: string;
    reason: string;
  }
): Promise<BookingRecord> {
  const authUser =
    await getAuthUser();

  if (!authUser) {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  const parsed =
    cancelBookingSchema.parse(
      input
    );

  const supabase =
    await createClient();

  const customerId =
    await getPublicUserId(
      supabase,
      authUser.id
    );

  const repo =
    new BookingRepository(
      supabase
    );

  const existing =
    await repo.getBookingById(
      parsed.id
    );

  if (
    !existing ||
    existing.customer_id !==
      customerId
  ) {
    throw new Error(
      "Booking not found"
    );
  }

  if (
    existing.status !==
      "pending" &&
    existing.status !==
      "confirmed"
  ) {
    throw new Error(
      "Only pending or confirmed bookings can be cancelled"
    );
  }

  return repo.cancelBooking(
    parsed.id,
    parsed.reason
  );
}

// -----------------------------------------------------------------------------
// ADMIN - ALL BOOKINGS
// -----------------------------------------------------------------------------

export async function getAllBookingsAdmin(
  page: number = 1,
  limit: number = 20,
  status?: BookingStatus
) {
  await requireRole([
    "admin",
    "super_admin",
  ]);

  const supabase =
    await createClient();

  const repo =
    new BookingRepository(
      supabase
    );

  return repo.getAllBookings(
    page,
    limit,
    status
  );
}

// -----------------------------------------------------------------------------
// ADMIN - ONE BOOKING
// -----------------------------------------------------------------------------

export async function getBookingByIdAdmin(
  id: string
): Promise<BookingRecord | null> {
  await requireRole([
    "admin",
    "super_admin",
  ]);

  const supabase =
    await createClient();

  const repo =
    new BookingRepository(
      supabase
    );

  return repo.getBookingById(
    id
  );
}

// -----------------------------------------------------------------------------
// ADMIN - CONFIRM
// -----------------------------------------------------------------------------

export async function confirmBookingAdmin(
  id: string
): Promise<BookingRecord> {
  await requireRole([
    "admin",
    "super_admin",
  ]);

  const supabase =
    await createClient();

  const repo =
    new BookingRepository(
      supabase
    );

  const existing =
    await repo.getBookingById(
      id
    );

  if (!existing) {
    throw new Error(
      "Booking not found"
    );
  }

  if (
    existing.status !==
    "pending"
  ) {
    throw new Error(
      "Only pending bookings can be confirmed"
    );
  }

  return repo.confirmBooking(
    id
  );
}

// -----------------------------------------------------------------------------
// ADMIN - CANCEL
// -----------------------------------------------------------------------------

export async function cancelBookingAdmin(
  input: {
    id: string;
    reason: string;
  }
): Promise<BookingRecord> {
  await requireRole([
    "admin",
    "super_admin",
  ]);

  const parsed =
    cancelBookingSchema.parse(
      input
    );

  const supabase =
    await createClient();

  const repo =
    new BookingRepository(
      supabase
    );

  const existing =
    await repo.getBookingById(
      parsed.id
    );

  if (!existing) {
    throw new Error(
      "Booking not found"
    );
  }

  if (
    existing.status !==
      "pending" &&
    existing.status !==
      "confirmed"
  ) {
    throw new Error(
      "Only pending or confirmed bookings can be cancelled"
    );
  }

  return repo.cancelBooking(
    parsed.id,
    parsed.reason
  );
}

// -----------------------------------------------------------------------------
// ADMIN - COMPLETE
// -----------------------------------------------------------------------------

export async function completeBookingAdmin(
  id: string
): Promise<BookingRecord> {
  await requireRole([
    "admin",
    "super_admin",
  ]);

  const supabase =
    await createClient();

  const repo =
    new BookingRepository(
      supabase
    );

  const existing =
    await repo.getBookingById(
      id
    );

  if (!existing) {
    throw new Error(
      "Booking not found"
    );
  }

  if (
    existing.status !==
    "confirmed"
  ) {
    throw new Error(
      "Only confirmed bookings can be marked completed"
    );
  }

  return repo.completeBooking(
    id
  );
}
