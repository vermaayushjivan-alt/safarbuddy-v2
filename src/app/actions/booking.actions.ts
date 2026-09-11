"use server";

import { z } from "zod";

import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import {
  requireRole,
  getAuthUser,
  resolvePublicUserId,
} from "@/lib/auth/session";

import {
  BookingRepository,
  BookingRecord,
  BookingStatus,
  BookingType,
} from "@/lib/repositories/booking.repository";
import { SupabaseClientType } from "@/lib/repositories/types";

import { HotelRepository } from "@/lib/repositories/hotel.repository";
import { PackageRepository } from "@/lib/repositories/package.repository";
import { RoomTypeRepository } from "@/lib/repositories/room-type.repository";
import { RoomPriceRepository } from "@/lib/repositories/room-price.repository";
import { notifyBookingCreated } from "@/lib/notifications/dispatch";

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

    // ROOM-05: the specific hotel_rooms row being booked. Optional —
    // a hotel booking made before a room is picked (or on a hotel with
    // no rooms configured yet) still falls back to hotel.starting_price,
    // same behavior as before this field existed.
    room_id:
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

    // BOOKING-03: only read/validated when the caller has no session
    // (see the superRefine below and createBooking()). Left optional
    // here so the authenticated flow's existing payload shape keeps
    // working unchanged.
    guest_name:
      z.string()
        .trim()
        .min(2, "Enter your full name.")
        .max(120)
        .nullable()
        .optional(),

    guest_email:
      z.string()
        .trim()
        .email("Enter a valid email address.")
        .nullable()
        .optional(),

    guest_phone:
      z.string()
        .trim()
        .min(7, "Enter a valid phone number.")
        .max(20)
        .nullable()
        .optional(),
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
        if (val.room_id) {
          ctx.addIssue({
            code: "custom",
            path: ["room_id"],
            message:
              "room_id must not be set for package bookings",
          });
        }

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
// P0.2 fix (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 9): this
// used to be a private, unexported copy of this exact lookup, living
// only in this file. It's now the shared, canonical
// resolvePublicUserId() in src/lib/auth/session.ts — used consistently
// by profile.actions.ts and payment.actions.ts too, so this one real
// pattern doesn't drift into N slightly-different copies again. This
// thin wrapper is kept only so every call site below doesn't need to
// change its arguments.
// BOOKING-03: widened from the original `Awaited<ReturnType<typeof
// createClient>>` to SupabaseClientType so this also accepts the
// service-role client createBooking() now uses for a guest checkout.
// authUser is always present at every existing call site, so this
// only ever runs against the session client in practice.
async function getPublicUserId(
  supabase: SupabaseClientType,
  authUserId: string
): Promise<string> {
  return resolvePublicUserId(supabase, authUserId);
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
  supabase: SupabaseClientType
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
  // BOOKING-03: a session is no longer required. When there is no
  // authUser, this becomes a guest checkout — guest_name/email/phone
  // are required instead (validated below) and every DB call for the
  // rest of this function uses the service-role client, since a guest
  // has no session for RLS to evaluate (same trusted-server-write
  // pattern as property-listing.actions.ts's self-service submission).
  const authUser =
    await getAuthUser();

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

  if (!authUser) {
    if (
      !parsed.guest_name ||
      !parsed.guest_email ||
      !parsed.guest_phone
    ) {
      throw new Error(
        "Name, email, and phone are required to book without an account."
      );
    }
  }

  const supabase =
    authUser
      ? await createClient()
      : createServiceRoleClient();

  // ---------------------------------------------------------------------------
  // Resolve public.users.id (skipped for a guest), INR currency, and
  // the hotel/package price snapshot together. These reads are fully
  // independent of one another (none needs another's result), so they
  // are fetched in parallel instead of one-after-another to cut
  // round-trip latency on this hot path. The subsequent booking insert
  // still runs only after all of them have resolved, preserving the
  // original ordering/validation guarantees.
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
      authUser
        ? getPublicUserId(supabase, authUser.id)
        : Promise.resolve(null),
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

    // ROOM-05: when a specific room was selected, use ITS price instead
    // of the hotel-level starting_price. This is the actual root cause
    // of "price set in admin panel doesn't reflect anywhere" — before
    // this, room_prices/hotel_rooms.base_price were never consulted
    // here no matter what an admin set via RoomPriceManager.
    if (parsed.room_id) {
      const roomRepo = new RoomTypeRepository(supabase);
      const room = await roomRepo.getRoomTypeById(parsed.room_id);

      if (!room || room.hotel_id !== hotel.id) {
        throw new Error(
          "Selected room was not found for this hotel."
        );
      }

      if (room.status !== "active") {
        throw new Error(
          "Selected room is no longer available."
        );
      }

      let resolvedPrice = Number(room.base_price ?? 0);

      if (parsed.check_in_date) {
        const priceRepo = new RoomPriceRepository(supabase);
        const priceRow = await priceRepo.getPriceForDate(
          room.id,
          parsed.check_in_date
        );

        if (priceRow) {
          resolvedPrice = Number(priceRow.final_price);
        }
      }

      priceSnapshot = resolvedPrice;
    }
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

  const created =
    await bookingRepo.createBooking(
      {
        customer_id:
          customerId,

        guest_name:
          authUser ? null : parsed.guest_name,

        guest_email:
          authUser ? null : parsed.guest_email,

        guest_phone:
          authUser ? null : parsed.guest_phone,

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

        room_id:
          parsed.booking_type ===
          "hotel"
            ? parsed.room_id ?? null
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

  // NOTIFY-01 (this session): wire up CONTACT-01's notification
  // dispatch, which was fully built (dashboard alert + email to the
  // hotel/vendor contact captured at listing time) but was never
  // actually called from createBooking() — so no booking, hotel or
  // package, has ever triggered a notification. Deliberately uses its
  // own service-role client rather than the `supabase` client above:
  // this is an internal system side-effect, not a customer-facing
  // read/write, so it must work identically for a guest checkout (no
  // session at all) and a logged-in customer, without depending on
  // RLS state on the vendors/notifications tables either way.
  // notifyBookingCreated() never throws (see dispatch.ts) — a
  // notification failure must never fail a booking that already
  // succeeded.
  await notifyBookingCreated(
    createServiceRoleClient(),
    {
      bookingId: created.id,
      bookingType: parsed.booking_type as BookingType,
      itemName:
        parsed.booking_type === "hotel"
          ? (hotel?.hotel_name as string)
          : (pkg?.package_name as string),
      vendorId: vendorId,
      itemContact:
        parsed.booking_type === "hotel"
          ? { phone: hotel?.phone ?? null, email: hotel?.email ?? null }
          : null,
      guestName:
        !authUser && parsed.guest_name
          ? parsed.guest_name
          : "Registered customer",
      checkInDate:
        parsed.booking_type === "hotel" ? (parsed.check_in_date ?? null) : null,
      checkOutDate:
        parsed.booking_type === "hotel" ? (parsed.check_out_date ?? null) : null,
      travelDate:
        parsed.booking_type === "package" ? (parsed.travel_date ?? null) : null,
    }
  );

  return created;
}

// -----------------------------------------------------------------------------
// BOOKING-03 - PUBLIC GUEST CONFIRMATION
// -----------------------------------------------------------------------------

// Deliberately not gated by getAuthUser()/requireRole() — a guest who
// just checked out has no session at all. Safety comes from the
// lookup key: `id` is the booking's own UUID primary key, returned to
// the browser only once, right after createBooking() succeeds (see
// BookingForm.tsx's redirect target) — not enumerable or guessable,
// same trust model as a typical e-commerce order-confirmation link.
// Reads via the service-role client for the same reason a guest write
// does: there's no session for RLS to evaluate.
export async function getGuestBookingConfirmation(
  id: string
): Promise<BookingRecord | null> {
  if (!id || !id.trim()) {
    return null;
  }

  const supabase =
    createServiceRoleClient();

  const repo =
    new BookingRepository(
      supabase
    );

  return repo.getBookingById(
    id
  );
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
): Promise<
  BookingRecord | null
> {
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
): Promise<
  BookingRecord | null
> {
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
    
