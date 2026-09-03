// src/lib/repositories/booking.repository.ts

import { BaseRepository } from "./base.repository";
import {
  SupabaseClientType,
  DatabaseRecord,
  FilterOptions,
} from "./types";

/**
 * Actual database-backed booking status.
 */
export type BookingType = "hotel" | "package";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

/**
 * This interface intentionally keeps the application-facing names
 * used by the existing booking UI/actions while mapping them to the
 * actual database columns internally.
 */
export interface BookingRecord extends DatabaseRecord {
  id: string;

  /**
   * Application-level aliases.
   */
  user_id: string;
  booking_type: BookingType;

  hotel_id: string | null;
  package_id: string | null;

  // ROOM-05: the specific hotel_rooms row linked to this booking.
  // Real column (public.bookings.room_id), added via
  // src/db/sql/008_room05_booking_room_linkage.sql — unlike hotel_id/
  // package_id above, this is read/written directly rather than
  // through the `notes` metadata blob.
  room_id: string | null;

  check_in_date: string | null;
  check_out_date: string | null;
  travel_date: string | null;

  num_guests: number;
  price_snapshot: number;

  currency: string;
  status: BookingStatus;

  cancellation_reason: string | null;
  cancelled_at: string | null;

  /**
   * Actual database fields.
   */
  booking_number: string;
  customer_id: string;
  vendor_id: string | null;

  booking_status: BookingStatus;
  payment_status: string;
  currency_id: string;

  subtotal: number;
  taxes: number;
  discount: number;
  coupon_discount: number;
  wallet_used: number;
  convenience_fee: number;
  grand_total: number | null;

  booking_date: string;
  travel_start_date: string | null;
  travel_end_date: string | null;

  cancellation_status: string;
  notes: string | null;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

type DatabaseBookingRow = {
  id: string;
  booking_number: string;
  customer_id: string;
  vendor_id: string | null;

  booking_type: BookingType;
  booking_status: BookingStatus;
  payment_status: string;

  // ROOM-05: real column, see BookingRecord.room_id above.
  room_id: string | null;

  currency_id: string;

  subtotal: number | string;
  taxes: number | string;
  discount: number | string;
  coupon_discount: number | string;
  wallet_used: number | string;
  convenience_fee: number | string;
  grand_total: number | string | null;

  booking_date: string;
  travel_start_date: string | null;
  travel_end_date: string | null;

  cancellation_status: string;
  cancellation_reason: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;

  /**
   * Joined currency information when requested.
   */
  currency_record?: {
    code: string;
    symbol: string;
    name: string;
  } | null;
};

type BookingMetadata = {
  hotel_id?: string | null;
  package_id?: string | null;

  check_in_date?: string | null;
  check_out_date?: string | null;
  travel_date?: string | null;

  num_guests?: number;

  price_snapshot?: number;
};

function toNumber(
  value: number | string | null
): number {
  if (value == null) {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

// ROOM-05: same night-enumeration rule used by createBooking() /
// cancelBookingAdmin() in booking.actions.ts and
// getBookableRoomsForHotel() in room-availability.actions.ts
// (check-in inclusive, check-out exclusive) — kept as a local copy
// rather than a shared import so this repository has no dependency on
// "use server" action modules.
function getBookingStayNights(
  checkInDate: string,
  checkOutDate: string
): string[] {
  const nights: string[] = [];

  let cursor = new Date(`${checkInDate}T00:00:00Z`);
  const end = new Date(`${checkOutDate}T00:00:00Z`);

  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return nights;
}

function parseMetadata(
  notes: string | null
): BookingMetadata {
  if (!notes) {
    return {};
  }

  try {
    const parsed = JSON.parse(notes);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as BookingMetadata;
    }

    return {};
  } catch {
    return {};
  }
}

function mapBooking(
  row: DatabaseBookingRow
): BookingRecord {
  const metadata = parseMetadata(row.notes);

  const priceSnapshot =
    metadata.price_snapshot ??
    toNumber(row.grand_total) ??
    toNumber(row.subtotal);

  return {
    id: row.id,

    user_id: row.customer_id,

    booking_type: row.booking_type,

    hotel_id:
      metadata.hotel_id ?? null,

    package_id:
      metadata.package_id ?? null,

    // ROOM-05: real column, not metadata — see BookingRecord.room_id.
    room_id:
      row.room_id ?? null,

    check_in_date:
      metadata.check_in_date ??
      row.travel_start_date ??
      null,

    check_out_date:
      metadata.check_out_date ??
      row.travel_end_date ??
      null,

    travel_date:
      metadata.travel_date ??
      null,

    num_guests:
      metadata.num_guests ??
      1,

    price_snapshot: priceSnapshot,

    currency:
      row.currency_record?.code ??
      "INR",

    status: row.booking_status,

    cancellation_reason:
      row.cancellation_reason,

    cancelled_at:
      row.cancellation_status !==
      "not_cancelled"
        ? row.updated_at
        : null,

    booking_number:
      row.booking_number,

    customer_id:
      row.customer_id,

    vendor_id:
      row.vendor_id,

    booking_status:
      row.booking_status,

    payment_status:
      row.payment_status,

    currency_id:
      row.currency_id,

    subtotal:
      toNumber(row.subtotal),

    taxes:
      toNumber(row.taxes),

    discount:
      toNumber(row.discount),

    coupon_discount:
      toNumber(row.coupon_discount),

    wallet_used:
      toNumber(row.wallet_used),

    convenience_fee:
      toNumber(row.convenience_fee),

    grand_total:
      row.grand_total == null
        ? null
        : toNumber(row.grand_total),

    booking_date:
      row.booking_date,

    travel_start_date:
      row.travel_start_date,

    travel_end_date:
      row.travel_end_date,

    cancellation_status:
      row.cancellation_status,

    notes:
      row.notes,

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,

    created_by:
      row.created_by,

    updated_by:
      row.updated_by,

    deleted_at:
      row.deleted_at,
  };
}

export class BookingRepository extends BaseRepository<BookingRecord> {
  constructor(
    supabase: SupabaseClientType
  ) {
    super(supabase, {
      tableName: "bookings",
      softDelete: true,
      softDeleteColumn: "deleted_at",
    });
  }

  // -------------------------------------------------------------------------
  // CREATE
  // -------------------------------------------------------------------------

  async createBooking(
    data: {
      customer_id: string;
      vendor_id?: string | null;
      booking_type: BookingType;

      hotel_id?: string | null;
      package_id?: string | null;

      // ROOM-05: real column, see BookingRecord.room_id above.
      room_id?: string | null;

      check_in_date?: string | null;
      check_out_date?: string | null;
      travel_date?: string | null;

      num_guests: number;
      price_snapshot: number;

      currency_id: string;
      status?: BookingStatus;

      cancellation_reason?: string | null;
      created_by?: string | null;
      updated_by?: string | null;
    }
  ): Promise<BookingRecord> {
    try {
      const bookingNumber =
        this.generateBookingNumber();

      const bookingStatus =
        data.status ?? "pending";

      const startDate =
        data.booking_type === "hotel"
          ? data.check_in_date ?? null
          : data.travel_date ?? null;

      const endDate =
        data.booking_type === "hotel"
          ? data.check_out_date ?? null
          : null;

      const notes = JSON.stringify({
        hotel_id:
          data.hotel_id ?? null,

        package_id:
          data.package_id ?? null,

        check_in_date:
          data.check_in_date ?? null,

        check_out_date:
          data.check_out_date ?? null,

        travel_date:
          data.travel_date ?? null,

        num_guests:
          data.num_guests,

        price_snapshot:
          data.price_snapshot,
      });

      const insertData = {
        booking_number:
          bookingNumber,

        customer_id:
          data.customer_id,

        vendor_id:
          data.vendor_id ?? null,

        booking_type:
          data.booking_type,

        // ROOM-05: real column, see BookingRecord.room_id above.
        room_id:
          data.room_id ?? null,

        booking_status:
          bookingStatus,

        payment_status:
          "unpaid",

        currency_id:
          data.currency_id,

        subtotal:
          data.price_snapshot,

        taxes:
          0,

        discount:
          0,

        coupon_discount:
          0,

        wallet_used:
          0,

        convenience_fee:
          0,

        // NOTE: `grand_total` is a PostgreSQL generated column
        // (derived from subtotal/taxes/discount/coupon_discount/
        // wallet_used/convenience_fee). It must never be supplied
        // in an INSERT — PostgreSQL rejects that with error 428C9
        // ("cannot insert a non-DEFAULT value into column
        // grand_total"). The post-insert `.select("*")` below
        // re-fetches the DB-computed value.

        booking_date:
          new Date().toISOString(),

        travel_start_date:
          startDate,

        travel_end_date:
          endDate,

        cancellation_status:
          "not_cancelled",

        cancellation_reason:
          data.cancellation_reason ?? null,

        notes,

        created_by:
          data.created_by ?? null,

        updated_by:
          data.updated_by ?? null,
      };

      const {
        data: result,
        error,
      } = await this.supabase
        .from("bookings")
        .insert(insertData)
        .select(`
          *,
          currency_record:currencies!bookings_currency_id_fkey(
            code,
            symbol,
            name
          )
        `)
        .single();

      if (error) {
        console.error(
          "[bookings] createBooking failed",
          error
        );

        throw error;
      }

      if (!result) {
        throw new Error(
          "Booking was created but no record was returned."
        );
      }

      return mapBooking(
        result as unknown as DatabaseBookingRow
      );
    } catch (error) {
      console.error(
        "[bookings] createBooking failed",
        error
      );

      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // READ BY ID
  // -------------------------------------------------------------------------

  async getBookingById(
    id: string
  ): Promise<BookingRecord | null> {
    if (!id || !id.trim()) {
      return null;
    }

    const {
      data,
      error,
    } = await this.supabase
      .from("bookings")
      .select(`
        *,
        currency_record:currencies!bookings_currency_id_fkey(
          code,
          symbol,
          name
        )
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error(
        "[bookings] getBookingById failed",
        error
      );

      throw error;
    }

    if (!data) {
      return null;
    }

    return mapBooking(
      data as unknown as DatabaseBookingRow
    );
  }

  // -------------------------------------------------------------------------
  // MY BOOKINGS
  // -------------------------------------------------------------------------

  async getMyBookings(
    customerId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const safePage =
      Math.max(1, page);

    const safeLimit =
      Math.min(
        Math.max(1, limit),
        100
      );

    const from =
      (safePage - 1) *
      safeLimit;

    const to =
      from +
      safeLimit -
      1;

    const {
      data,
      error,
      count,
    } = await this.supabase
      .from("bookings")
      .select(
        `
          *,
          currency_record:currencies!bookings_currency_id_fkey(
            code,
            symbol,
            name
          )
        `,
        {
          count: "exact",
        }
      )
      .eq(
        "customer_id",
        customerId
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .range(from, to);

    if (error) {
      console.error(
        "[bookings] getMyBookings failed",
        error
      );

      throw error;
    }

    const total =
      count ?? 0;

    const totalPages =
      Math.ceil(
        total /
        safeLimit
      );

    return {
      data:
        (data ?? []).map(
          (row) =>
            mapBooking(
              row as unknown as DatabaseBookingRow
            )
        ),

      total,

      page:
        safePage,

      limit:
        safeLimit,

      totalPages,

      hasNext:
        safePage <
        totalPages,

      hasPrev:
        safePage > 1,
    };
  }

  // -------------------------------------------------------------------------
  // ALL BOOKINGS - ADMIN
  // -------------------------------------------------------------------------

  async getAllBookings(
    page: number = 1,
    limit: number = 20,
    status?: BookingStatus
  ) {
    const safePage =
      Math.max(1, page);

    const safeLimit =
      Math.min(
        Math.max(1, limit),
        100
      );

    const from =
      (safePage - 1) *
      safeLimit;

    const to =
      from +
      safeLimit -
      1;

    let query =
      this.supabase
        .from("bookings")
        .select(
          `
            *,
            currency_record:currencies!bookings_currency_id_fkey(
              code,
              symbol,
              name
            )
          `,
          {
            count: "exact",
          }
        )
        .is(
          "deleted_at",
          null
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (status) {
      query =
        query.eq(
          "booking_status",
          status
        );
    }

    const {
      data,
      error,
      count,
    } =
      await query.range(
        from,
        to
      );

    if (error) {
      console.error(
        "[bookings] getAllBookings failed",
        error
      );

      throw error;
    }

    const total =
      count ?? 0;

    const totalPages =
      Math.ceil(
        total /
        safeLimit
      );

    return {
      data:
        (data ?? []).map(
          (row) =>
            mapBooking(
              row as unknown as DatabaseBookingRow
            )
        ),

      total,

      page:
        safePage,

      limit:
        safeLimit,

      totalPages,

      hasNext:
        safePage <
        totalPages,

      hasPrev:
        safePage > 1,
    };
  }

  // -------------------------------------------------------------------------
  // ALL BOOKINGS - VENDOR (own hotels/packages only)
  // -------------------------------------------------------------------------

  // VENDOR-BOOKING-01: read-only, scoped to a single vendor_id. Callers
  // must resolve vendorId themselves via requireVendorContext() — this
  // method trusts whatever vendorId it is given and does no ownership
  // check of its own (same division of responsibility as
  // assertHotelOwnedByVendor() vs. the actions that call it).
  async getBookingsByVendorId(
    vendorId: string,
    page: number = 1,
    limit: number = 20,
    status?: BookingStatus
  ) {
    const safePage =
      Math.max(1, page);

    const safeLimit =
      Math.min(
        Math.max(1, limit),
        100
      );

    const from =
      (safePage - 1) *
      safeLimit;

    const to =
      from +
      safeLimit -
      1;

    let query =
      this.supabase
        .from("bookings")
        .select(
          `
            *,
            currency_record:currencies!bookings_currency_id_fkey(
              code,
              symbol,
              name
            )
          `,
          {
            count: "exact",
          }
        )
        .eq(
          "vendor_id",
          vendorId
        )
        .is(
          "deleted_at",
          null
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (status) {
      query =
        query.eq(
          "booking_status",
          status
        );
    }

    const {
      data,
      error,
      count,
    } =
      await query.range(
        from,
        to
      );

    if (error) {
      console.error(
        "[bookings] getBookingsByVendorId failed",
        error
      );

      throw error;
    }

    const total =
      count ?? 0;

    const totalPages =
      Math.ceil(
        total /
        safeLimit
      );

    return {
      data:
        (data ?? []).map(
          (row) =>
            mapBooking(
              row as unknown as DatabaseBookingRow
            )
        ),

      total,

      page:
        safePage,

      limit:
        safeLimit,

      totalPages,

      hasNext:
        safePage <
        totalPages,

      hasPrev:
        safePage > 1,
    };
  }

  // -------------------------------------------------------------------------
  // CANCEL
  // -------------------------------------------------------------------------

  async cancelBooking(
    id: string,
    reason: string
  ): Promise<BookingRecord> {
    const {
      data,
      error,
    } = await this.supabase
      .from("bookings")
      .update({
        booking_status:
          "cancelled",

        cancellation_status:
          "cancelled",

        cancellation_reason:
          reason,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select(`
        *,
        currency_record:currencies!bookings_currency_id_fkey(
          code,
          symbol,
          name
        )
      `)
      .single();

    if (error) {
      console.error(
        "[bookings] cancelBooking failed",
        error
      );

      throw error;
    }

    return mapBooking(
      data as unknown as DatabaseBookingRow
    );
  }

  // -------------------------------------------------------------------------
  // CONFIRM
  // -------------------------------------------------------------------------

  async confirmBooking(
    id: string
  ): Promise<BookingRecord> {
    const {
      data,
      error,
    } = await this.supabase
      .from("bookings")
      .update({
        booking_status:
          "confirmed",

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select(`
        *,
        currency_record:currencies!bookings_currency_id_fkey(
          code,
          symbol,
          name
        )
      `)
      .single();

    if (error) {
      console.error(
        "[bookings] confirmBooking failed",
        error
      );

      throw error;
    }

    return mapBooking(
      data as unknown as DatabaseBookingRow
    );
  }

  // -------------------------------------------------------------------------
  // BOOKING NUMBER GENERATION
  // -------------------------------------------------------------------------
  //
  // FILE-REPAIR-01 (2026-09-03): the delivered file cut off mid-comment
  // right after this point — this method and completeBooking() below
  // were entirely missing. createBooking() above unconditionally calls
  // `this.generateBookingNumber()`, so every booking insert would throw
  // "generateBookingNumber is not a function" against this exact file
  // as delivered. No booking_number format is documented anywhere else
  // in the codebase or in DATABASE_BIBLE.md, and nothing else parses or
  // validates this string — this is a pure application-level choice,
  // not a guess against a live schema constraint (RULE 13 does not
  // block this the way it would a schema/column guess). Confirm with
  // whoever owns this project whether a specific format was originally
  // intended before treating this as final.
  private generateBookingNumber(): string {
    const datePart = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const randomPart = Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();

    return `SB-${datePart}-${randomPart}`;
  }

  // -------------------------------------------------------------------------
  // COMPLETE
  // -------------------------------------------------------------------------
  //
  // FILE-REPAIR-01: reconstructed to match the exact pattern already
  // established by confirmBooking()/cancelBooking() immediately above
  // (simple booking_status update, identical select/error-handling
  // shape) — no new business logic invented, only the missing status
  // transition that booking.actions.ts already calls.
  //
  // NOTE: the original (lost) section header here read "CONFIRM +
  // CONSUME INVENTORY (ROOM-05)", suggesting a planned inventory
  // decrement on confirm/complete that this repair does NOT attempt to
  // reconstruct — nothing in the codebase calls such a method today,
  // and inventing ROOM-04 inventory-consumption logic without a real
  // spec would risk silently double-booking rooms. Flagging as an open
  // item for its own RULE 15 audit, not guessing at it here.

  async completeBooking(
    id: string
  ): Promise<BookingRecord> {
    const {
      data,
      error,
    } = await this.supabase
      .from("bookings")
      .update({
        booking_status:
          "completed",

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select(`
        *,
        currency_record:currencies!bookings_currency_id_fkey(
          code,
          symbol,
          name
        )
      `)
      .single();

    if (error) {
      console.error(
        "[bookings] completeBooking failed",
        error
      );

      throw error;
    }

    return mapBooking(
      data as unknown as DatabaseBookingRow
    );
  }
}

