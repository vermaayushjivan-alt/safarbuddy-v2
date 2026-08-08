// src/lib/repositories/payment.repository.ts
// PAY-01 — mirrors BookingRepository/BaseRepository pattern exactly.
// Repository = persistence layer only (DEVELOPMENT_BIBLE.md RULE 3).
// No auth, no Zod, no Cashfree API calls, no business logic.
// All public methods wrap BaseRepository protected methods.

import { BaseRepository } from './base.repository';
import {
  SupabaseClientType,
  DatabaseRecord,
  FilterOptions,
} from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaymentStatus =
  | 'initiated'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'flagged';

export interface PaymentRecord extends DatabaseRecord {
  id: string;
  booking_id: string;
  user_id: string;
  cf_order_id: string;
  cf_payment_id: string | null;
  payment_session_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  cf_payment_status: string | null;
  payment_method: string | null;
  failure_reason: string | null;
  initiated_at: string;
  completed_at: string | null;
  // created_at, updated_at, deleted_at, created_by, updated_by
  // are inherited from DatabaseRecord — not redeclared.
  // Matches BookingRecord pattern exactly.
}

// ---------------------------------------------------------------------------
// UpdatePaymentStatusData
// Exact fields the webhook handler and action layer are permitted to update.
// No other payment fields are exposed for mutation through this method.
// ---------------------------------------------------------------------------

export interface UpdatePaymentStatusData {
  status: PaymentStatus;
  cf_payment_id?: string | null;
  cf_payment_status?: string | null;
  failure_reason?: string | null;
  completed_at?: string | null;
}

// ---------------------------------------------------------------------------
// PaymentRepository
// ---------------------------------------------------------------------------

export class PaymentRepository extends BaseRepository<PaymentRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'payments',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  // --- Create ---

  /**
   * Insert a new payment row.
   * Called by payment.actions.ts on Cashfree order creation.
   * data must include all NOT NULL fields: booking_id, user_id,
   * cf_order_id, amount. currency and status default at DB level
   * but are always supplied explicitly by the action layer.
   */
  async createPayment(
    data: Parameters<BaseRepository<PaymentRecord>['create']>[0]
  ): Promise<PaymentRecord> {
    return this.create(data);
  }

  // --- Read ---

  /**
   * Fetch a single payment by its primary key.
   * Used by admin detail view and webhook fallback lookup.
   */
  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    return this.findById(id);
  }

  /**
   * Fetch a single payment by the merchant-supplied Cashfree order ID
   * (cf_order_id). This is the primary lookup used by the Cashfree
   * webhook handler — the webhook payload carries cf_order_id and
   * the handler must resolve the payments row from it.
   * Returns null if no matching row exists.
   */
  async getPaymentByOrderId(
    cfOrderId: string
  ): Promise<PaymentRecord | null> {
    return this.findOne([
      {
        column: 'cf_order_id',
        operator: 'eq',
        value: cfOrderId,
      },
    ]);
  }

  /**
   * Fetch all payment rows for a given booking, newest first.
   * Used by the customer payment status page and the retry guard
   * in payment.actions.ts (which checks for an existing 'paid' row).
   */
  async getPaymentsByBookingId(
    bookingId: string
  ): Promise<PaymentRecord[]> {
    return this.findMany({
      filters: [
        {
          column: 'booking_id',
          operator: 'eq',
          value: bookingId,
        },
      ],
      sort: {
        column: 'initiated_at',
        ascending: false,
      },
    });
  }

  /**
   * Fetch only the most recent payment row for a given booking.
   * Used for customer-facing "current payment status" display.
   * Returns null if no payment has ever been initiated for the booking.
   */
  async getLatestPaymentForBooking(
    bookingId: string
  ): Promise<PaymentRecord | null> {
    const results = await this.findMany({
      filters: [
        {
          column: 'booking_id',
          operator: 'eq',
          value: bookingId,
        },
      ],
      sort: {
        column: 'initiated_at',
        ascending: false,
      },
      pagination: {
        page: 1,
        limit: 1,
      },
    });

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update the status and Cashfree fields of an existing payment row.
   * Called exclusively by the webhook handler via payment.actions.ts.
   * Only the fields defined in UpdatePaymentStatusData are permitted —
   * amount, booking_id, user_id, and cf_order_id are never mutated
   * after creation.
   */
  async updatePaymentStatus(
    id: string,
    data: UpdatePaymentStatusData
  ): Promise<PaymentRecord> {
    return this.update(
      id,
      data as Parameters<BaseRepository<PaymentRecord>['update']>[1]
    );
  }

  // --- Admin ---

  /**
   * Paginated list of all payment rows for admin view.
   * Optional status filter mirrors the getAllBookings pattern in
   * BookingRepository exactly.
   */
  async getAllPayments(
    page: number = 1,
    limit: number = 20,
    status?: PaymentStatus
  ) {
    const filters: FilterOptions[] = status
      ? [{ column: 'status', operator: 'eq', value: status }]
      : [];

    return this.findWithPagination({
      filters,
      sort: {
        column: 'created_at',
        ascending: false,
      },
      pagination: { page, limit },
    });
  }
}
