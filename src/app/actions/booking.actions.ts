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
import { RoomTypeRepository } from "@/lib/repositories/room-type.repository";
import { RoomPriceRepository } from "@/lib/repositories/room-price.repository";

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
async function getPublicUserId(
  supabase: Awaited<
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
  supabase: Awaited<
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
    
