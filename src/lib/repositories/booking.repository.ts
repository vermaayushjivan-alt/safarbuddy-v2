// lib/repositories/booking.repository.ts
// BOOKING-01 — mirrors HotelRepository/PackageRepository/OfferRepository:
// BaseRepository<T> + hand-written *Record interface, direct Supabase
// client access (bookings is a content table per DATABASE_BIBLE.md, not
// a Drizzle-managed table, even though src/db/schema.ts also defines it
// as the migration/type source of truth per BOOKING-01 approval).

import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord, FilterOptions } from './types';

export type BookingType = 'hotel' | 'package';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface BookingRecord extends DatabaseRecord {
  id: string;
  user_id: string;
  booking_type: BookingType;
  hotel_id: string | null;
  package_id: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  travel_date: string | null;
  num_guests: number;
  price_snapshot: number;
  currency: string;
  status: BookingStatus;
  cancellation_reason: string | null;
  cancelled_at: string | null;
}

export class BookingRepository extends BaseRepository<BookingRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'bookings',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  // --- Create ---

  async createBooking(
    data: Parameters<BaseRepository<BookingRecord>['create']>[0]
  ): Promise<BookingRecord> {
    return this.create(data);
  }

  // --- Read ---

  async getBookingById(id: string): Promise<BookingRecord | null> {
    return this.findById(id);
  }

  async getMyBookings(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    return this.findWithPagination({
      filters: [{ column: 'user_id', operator: 'eq', value: userId }],
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }

  async getAllBookings(
    page: number = 1,
    limit: number = 20,
    status?: BookingStatus
  ) {
    const filters: FilterOptions[] = status
      ? [{ column: 'status', operator: 'eq', value: status }]
      : [];

    return this.findWithPagination({
      filters,
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }

  // --- Status transitions ---
  // Each method updates only the fields relevant to that transition —
  // never trusts the caller to pass arbitrary status/date fields.

  async cancelBooking(
    id: string,
    reason: string
  ): Promise<BookingRecord> {
    return this.update(id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    } as Parameters<BaseRepository<BookingRecord>['update']>[1]);
  }

  async confirmBooking(id: string): Promise<BookingRecord> {
    return this.update(id, {
      status: 'confirmed',
    } as Parameters<BaseRepository<BookingRecord>['update']>[1]);
  }

  async completeBooking(id: string): Promise<BookingRecord> {
    return this.update(id, {
      status: 'completed',
    } as Parameters<BaseRepository<BookingRecord>['update']>[1]);
  }
}
