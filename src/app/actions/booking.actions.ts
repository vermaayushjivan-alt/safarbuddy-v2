// PATH: src/app/actions/booking.actions.ts  (PART 1 of 2 — lines 1–450)
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

// -----------------------------------------------------------------------------
// FIXED: Correct Zod inference syntax
// -----------------------------------------------------------------------------

export type CreateBookingInput =
  z.infer<typeof createBookingBaseSchema>;

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
 * Resolve the authenticated Supabase auth.users.id
 * to the corresponding public.users.id.
 *
 * bookings.customer_id stores public.users.id,
 * not auth.users.id.
 *
 * public.users.auth_user_id -> auth.users.id
 * public.users.id           -> bookings.customer_id
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
 * bookings.currency_id is NOT nullable.
 *
 * The live currencies schema uses deleted_at
 * for soft deletion and does not contain is_active.
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
    .select(
      "id, code, deleted_at"
    )
    .eq(
      "code",
      "INR"
    )
    .is(
      "deleted_at",
      null
    )
    .maybeSingle();

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
  const authUser =
    await getAuthUser();

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
      "[booking] booking payload validation failed",
      validationError
    );

    throw new Error(
      "Invalid booking details. Please check the form and try again."
    );
  }

  const supabase =
    await createClient();

  // ---------------------------------------------------------------------------
  // Resolve public.users.id, INR currency, and the hotel/package price
  // snapshot together. These three reads are fully independent of one
  // another (none needs another's result), so they are fetched in
  // parallel instead of one-after-another to cut round-trip latency on
  // this hot path. The subsequent booking insert still runs only after
  // all three have resolved, preserving the original ordering/validation
  // guarantees.
  // ---------------------------------------------------------------------------

  const hotelRepo =
    parsed.booking_type === "hotel"
      ? new HotelRepository(supabase)
      : null;

  const packageRepo =
    parsed.booking_type === "package"
      ? new PackageRepository(supabase)
      : null;

  const [customerId, currencyId, hotel, pkg] =
    await Promise.all([
      getPublicUserId(supabase, authUser.id),
      getInrCurrencyId(supabase),
      hotelRepo
        ? hotelRepo.getHotelById(parsed.hotel_id as string)
        : Promise.resolve(null),
      packageRepo
        ? packageRepo.getPackageById(parsed.package_id as string)
        : Promise.resolve(null),
    ]);

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
    if (!hotel) {
      throw new Error(
        "Hotel not found"
      );
    }

    priceSnapshot =
      Number(
        hotel.starting_price ??
          0
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
    if (!pkg) {
      throw new Error(
        "Package not found"
      );
    }

    priceSnapshot =
      Number(
        pkg.starting_price ??
          0
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
