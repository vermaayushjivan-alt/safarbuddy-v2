import { BaseRepository } from "./base.repository";
import {
  SupabaseClientType,
  DatabaseRecord,
  FilterOptions,
} from "./types";

export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export interface PaymentRecord extends DatabaseRecord {
  id: string;
  booking_id: string;
  user_id: string;
  gateway_order_id: string;
  gateway_payment_id: string | null;
  payment_gateway: string;
  amount: number;
  currency_code: string;
  status: PaymentStatus;
  gateway_payment_status: string | null;
  payment_method: string | null;
  failure_reason: string | null;
  initiated_at: string | null;
  completed_at: string | null;
  // PAY-04 — Manual Settlement Tracking. Snapshot, computed once at
  // payment-success time via src/lib/payments/commission.ts. Both stay
  // null for payments that never reach "success".
  platform_commission_amount: number | null;
  vendor_payout_amount: number | null;
}

type PaymentUpdateData =
  Parameters<BaseRepository<PaymentRecord>["update"]>[1];

export interface UpdatePaymentStatusData {
  status: PaymentStatus;
  gateway_payment_id?: string | null;
  gateway_payment_status?: string | null;
  payment_method?: string | null;
  failure_reason?: string | null;
  completed_at?: string | null;
  // PAY-04 — only ever passed by the webhook handler on a "success"
  // transition; omitted (left undefined) on every other status update.
  platform_commission_amount?: number | null;
  vendor_payout_amount?: number | null;
}

export class PaymentRepository extends BaseRepository<PaymentRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: "payments",
      softDelete: true,
      softDeleteColumn: "deleted_at",
    });
  }

  async createPayment(
    data: Parameters<BaseRepository<PaymentRecord>["create"]>[0]
  ): Promise<PaymentRecord> {
    return this.create(data);
  }

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    return this.findById(id);
  }

  async getPaymentByOrderId(
    gatewayOrderId: string
  ): Promise<PaymentRecord | null> {
    return this.findOne([
      {
        column: "gateway_order_id",
        operator: "eq",
        value: gatewayOrderId,
      },
    ]);
  }

  async getPaymentsByBookingId(bookingId: string): Promise<PaymentRecord[]> {
    return this.findMany({
      filters: [{ column: "booking_id", operator: "eq", value: bookingId }],
      sort: { column: "initiated_at", ascending: false },
    });
  }

  async getLatestPaymentForBooking(
    bookingId: string
  ): Promise<PaymentRecord | null> {
    const results = await this.findMany({
      filters: [{ column: "booking_id", operator: "eq", value: bookingId }],
      sort: { column: "initiated_at", ascending: false },
      pagination: { page: 1, limit: 1 },
    });

    return results[0] ?? null;
  }

  async updatePaymentStatus(
    id: string,
    data: UpdatePaymentStatusData
  ): Promise<PaymentRecord> {
    const updateData: PaymentUpdateData = { status: data.status };

    if (data.gateway_payment_id !== undefined) {
      updateData.gateway_payment_id = data.gateway_payment_id;
    }

    if (data.gateway_payment_status !== undefined) {
      updateData.gateway_payment_status = data.gateway_payment_status;
    }

    if (data.payment_method !== undefined) {
      updateData.payment_method = data.payment_method;
    }

    if (data.failure_reason !== undefined) {
      updateData.failure_reason = data.failure_reason;
    }

    if (data.completed_at !== undefined) {
      updateData.completed_at = data.completed_at;
    }

    if (data.platform_commission_amount !== undefined) {
      updateData.platform_commission_amount =
        data.platform_commission_amount;
    }

    if (data.vendor_payout_amount !== undefined) {
      updateData.vendor_payout_amount = data.vendor_payout_amount;
    }

    return this.update(id, updateData);
  }

  // GOLIVE-02 — atomic, conditional status change.
  //
  // Updates the row ONLY IF its current status is one of `fromStatuses`,
  // in a single SQL statement, and returns the updated row — or null when
  // the row was not in an allowed state (someone else already moved it).
  // This replaces "read the row, decide in JS, then update" in the webhook,
  // which let two concurrent webhooks both think they were first, and let a
  // late FAILED webhook overwrite a SUCCESS written a moment earlier.
  // updatePaymentStatus() above is kept for non-racing callers.
  async transitionPaymentStatus(
    id: string,
    fromStatuses: PaymentStatus[],
    data: UpdatePaymentStatusData
  ): Promise<PaymentRecord | null> {
    const updateData: Record<string, unknown> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    if (data.gateway_payment_id !== undefined) {
      updateData.gateway_payment_id = data.gateway_payment_id;
    }
    if (data.gateway_payment_status !== undefined) {
      updateData.gateway_payment_status = data.gateway_payment_status;
    }
    if (data.payment_method !== undefined) {
      updateData.payment_method = data.payment_method;
    }
    if (data.failure_reason !== undefined) {
      updateData.failure_reason = data.failure_reason;
    }
    if (data.completed_at !== undefined) {
      updateData.completed_at = data.completed_at;
    }
    if (data.platform_commission_amount !== undefined) {
      updateData.platform_commission_amount = data.platform_commission_amount;
    }
    if (data.vendor_payout_amount !== undefined) {
      updateData.vendor_payout_amount = data.vendor_payout_amount;
    }

    const { data: row, error } = await this.supabase
      .from("payments")
      .update(updateData)
      .eq("id", id)
      .in("status", fromStatuses)
      .is("deleted_at", null)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[payments] transitionPaymentStatus failed", { id, error });
      throw error;
    }

    return (row as PaymentRecord) ?? null;
  }

  // GOLIVE-03 — reconciliation queries (read-only).
  //
  // Payments still "pending" that were started between `newerThanIso` and
  // `olderThanIso`: old enough that a webhook should have arrived, recent
  // enough to be worth asking Cashfree about. Oldest first.
  async getStalePendingPayments(
    olderThanIso: string,
    newerThanIso: string,
    limit: number
  ): Promise<PaymentRecord[]> {
    const { data, error } = await this.supabase
      .from("payments")
      .select("*")
      .eq("status", "pending")
      .lt("initiated_at", olderThanIso)
      .gt("initiated_at", newerThanIso)
      .is("deleted_at", null)
      .order("initiated_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[payments] getStalePendingPayments failed", error);
      throw error;
    }
    return (data ?? []) as PaymentRecord[];
  }

  // Successful payments completed since `sinceIso`; the job checks whether
  // each one's booking is still pending. Newest first.
  async getRecentSuccessfulPayments(
    sinceIso: string,
    limit: number
  ): Promise<PaymentRecord[]> {
    const { data, error } = await this.supabase
      .from("payments")
      .select("*")
      .eq("status", "success")
      .gte("completed_at", sinceIso)
      .is("deleted_at", null)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[payments] getRecentSuccessfulPayments failed", error);
      throw error;
    }
    return (data ?? []) as PaymentRecord[];
  }

  async getAllPayments(
    page: number = 1,
    limit: number = 20,
    status?: PaymentStatus
  ) {
    const filters: FilterOptions[] = status
      ? [{ column: "status", operator: "eq", value: status }]
      : [];

    return this.findWithPagination({
      filters,
      sort: { column: "created_at", ascending: false },
      pagination: { page, limit },
    });
  }

  // -------------------------------------------------------------------
  // PAY-04 — Manual Settlement Tracking
  // -------------------------------------------------------------------

  // Total amount owed to a vendor across every successful payment for
  // their bookings, computed from the vendor_payout_amount snapshot
  // (never re-derived from the live commission rate). Joins through
  // bookings.vendor_id — payments has no vendor_id column of its own.
  //
  // Fetches all matching rows and sums in application code rather than
  // a Postgres aggregate: at the current/expected scale (a handful of
  // hotels, well under a thousand successful payments per vendor) this
  // is simpler and avoids adding an RPC function for one query. Revisit
  // with a real SUM() query if that scale assumption stops holding.
  async getSuccessfulVendorPayoutTotal(vendorId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("payments")
      .select(
        "vendor_payout_amount, booking:bookings!payments_booking_id_fkey(vendor_id)"
      )
      .eq("status", "success")
      .is("deleted_at", null)
      .eq("booking.vendor_id", vendorId);

    if (error) {
      console.error(
        "[payments] getSuccessfulVendorPayoutTotal failed",
        error
      );
      throw error;
    }

    type Row = {
      vendor_payout_amount: number | string | null;
    };

    return ((data ?? []) as Row[]).reduce((sum, row) => {
      const value = Number(row.vendor_payout_amount ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }
  }
