import { BaseRepository } from "./base.repository";
import {
  SupabaseClientType,
  DatabaseRecord,
  FilterOptions,
} from "./types";

export type PaymentStatus =
  | "initiated"
  | "processing"
  | "paid"
  | "failed"
  | "flagged";

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
}

type PaymentUpdateData =
  Parameters<BaseRepository<PaymentRecord>["update"]>[1];

export interface UpdatePaymentStatusData {
  status: PaymentStatus;
  cf_payment_status?: string | null;
  cf_payment_id?: string | null;
  payment_method?: string | null;
  failure_reason?: string | null;
  completed_at?: string | null;
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
    orderId: string
  ): Promise<PaymentRecord | null> {
    return this.findOne([
      { column: "cf_order_id", operator: "eq", value: orderId },
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
    const updateData: PaymentUpdateData = {
      status: data.status,
    };

    if (data.cf_payment_status !== undefined) {
      updateData.cf_payment_status = data.cf_payment_status;
    }

    if (data.cf_payment_id !== undefined) {
      updateData.cf_payment_id = data.cf_payment_id;
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

    return this.update(id, updateData);
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
}
