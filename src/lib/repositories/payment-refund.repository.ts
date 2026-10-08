// ROOT PATH: src/lib/repositories/payment-refund.repository.ts
// GOLIVE-07 — access to public.payment_refunds (service-role only, RLS on,
// no policies). Every state change goes through the two SQL functions from
// migration 033 so the money maths is atomic and idempotent.

import type { SupabaseClientType } from "./types";
import type { RefundStatus } from "@/lib/payments/refund-status";

export interface PaymentRefundRecord {
  id: string;
  payment_id: string;
  booking_id: string;
  refund_id: string;
  cf_refund_id: string | null;
  amount: number;
  currency_code: string;
  status: RefundStatus;
  reason: string;
  gateway_status: string | null;
  gateway_message: string | null;
  platform_commission_reversed: number;
  vendor_payout_reversed: number;
  requested_by: string | null;
  requested_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Error codes raised by create_refund_request (see migration 033).
export type RefundRequestErrorCode =
  | "INVALID_AMOUNT"
  | "REASON_REQUIRED"
  | "PAYMENT_NOT_FOUND"
  | "NOT_REFUNDABLE"
  | "AMOUNT_EXCEEDS_REMAINING";

export class RefundRequestError extends Error {
  constructor(public readonly code: RefundRequestErrorCode) {
    super(code);
    this.name = "RefundRequestError";
  }
}

const KNOWN_CODES: RefundRequestErrorCode[] = [
  "INVALID_AMOUNT",
  "REASON_REQUIRED",
  "PAYMENT_NOT_FOUND",
  "NOT_REFUNDABLE",
  "AMOUNT_EXCEEDS_REMAINING",
];

export class PaymentRefundRepository {
  constructor(private readonly supabase: SupabaseClientType) {}

  // Atomically reserves `amount` against the payment (row-locked in SQL) and
  // inserts the "pending" refund row. Throws RefundRequestError for the
  // business-rule failures, a plain Error for anything unexpected.
  async createRefundRequest(input: {
    paymentId: string;
    amount: number;
    reason: string;
    requestedBy: string | null;
    refundId: string;
  }): Promise<PaymentRefundRecord> {
    const { data, error } = await this.supabase.rpc("create_refund_request", {
      p_payment: input.paymentId,
      p_amount: input.amount,
      p_reason: input.reason,
      p_requested_by: input.requestedBy,
      p_refund_id: input.refundId,
    });

    if (error) {
      const code = KNOWN_CODES.find((c) => error.message?.includes(c));
      if (code) throw new RefundRequestError(code);
      console.error("[refunds] create_refund_request failed", {
        code: error.code,
        message: error.message,
      });
      throw new Error("Could not create the refund request.");
    }

    return data as PaymentRefundRecord;
  }

  // Moves a pending refund to its final state, exactly once. `applied` is
  // true only for the call that actually changed it.
  async finalizeRefund(input: {
    refundRowId: string;
    newStatus: Exclude<RefundStatus, "pending">;
    cfRefundId: string | null;
    gatewayStatus: string | null;
    message: string | null;
  }): Promise<{ applied: boolean; finalStatus: RefundStatus }> {
    const { data, error } = await this.supabase.rpc("finalize_refund", {
      p_refund_row: input.refundRowId,
      p_new_status: input.newStatus,
      p_cf_refund_id: input.cfRefundId,
      p_gateway_status: input.gatewayStatus,
      p_message: input.message,
    });

    if (error) {
      console.error("[refunds] finalize_refund failed", {
        refundRowId: input.refundRowId,
        code: error.code,
        message: error.message,
      });
      throw new Error("Could not update the refund.");
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { applied: boolean; final_status: RefundStatus }
      | null
      | undefined;

    if (!row) throw new Error("finalize_refund returned no row");
    return { applied: row.applied, finalStatus: row.final_status };
  }

  // Records Cashfree's id for a refund that is still pending (no state change).
  async attachCashfreeIds(
    refundRowId: string,
    cfRefundId: string | null,
    gatewayStatus: string | null
  ): Promise<void> {
    const { error } = await this.supabase
      .from("payment_refunds")
      .update({
        cf_refund_id: cfRefundId,
        gateway_status: gatewayStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", refundRowId)
      .eq("status", "pending");

    if (error) {
      console.error("[refunds] attachCashfreeIds failed", { refundRowId, error });
      throw error;
    }
  }

  async getByRefundId(refundId: string): Promise<PaymentRefundRecord | null> {
    const { data, error } = await this.supabase
      .from("payment_refunds")
      .select("*")
      .eq("refund_id", refundId)
      .maybeSingle();

    if (error) {
      console.error("[refunds] getByRefundId failed", error);
      throw error;
    }
    return (data as PaymentRefundRecord) ?? null;
  }

  async listByPayment(paymentId: string): Promise<PaymentRefundRecord[]> {
    const { data, error } = await this.supabase
      .from("payment_refunds")
      .select("*")
      .eq("payment_id", paymentId)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("[refunds] listByPayment failed", error);
      throw error;
    }
    return (data ?? []) as PaymentRefundRecord[];
  }

  // Refunds still "pending" that were requested before `olderThanIso`.
  async getPendingOlderThan(
    olderThanIso: string,
    limit: number
  ): Promise<PaymentRefundRecord[]> {
    const { data, error } = await this.supabase
      .from("payment_refunds")
      .select("*")
      .eq("status", "pending")
      .lt("requested_at", olderThanIso)
      .order("requested_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[refunds] getPendingOlderThan failed", error);
      throw error;
    }
    return (data ?? []) as PaymentRefundRecord[];
  }

  // Sum of vendor_payout_reversed for SUCCESSFUL refunds on a vendor's
  // bookings. Subtracted from the vendor's due amount (settlement stays correct).
  async getVendorPayoutReversedTotal(vendorId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("payment_refunds")
      .select(
        "vendor_payout_reversed, booking:bookings!payment_refunds_booking_id_fkey!inner(vendor_id)"
      )
      .eq("status", "success")
      .eq("booking.vendor_id", vendorId);

    if (error) {
      console.error("[refunds] getVendorPayoutReversedTotal failed", error);
      throw error;
    }

    return ((data ?? []) as { vendor_payout_reversed: number | string | null }[])
      .reduce((sum, row) => {
        const v = Number(row.vendor_payout_reversed ?? 0);
        return sum + (Number.isFinite(v) ? v : 0);
      }, 0);
  }
}
