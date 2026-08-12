import { BaseRepository } from './base.repository';
import {
  SupabaseClientType,
  DatabaseRecord,
  FilterOptions,
} from './types';

export type PaymentStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export interface PaymentRecord extends DatabaseRecord {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency_code: string;
  payment_gateway: 'cashfree' | 'razorpay' | 'stripe' | 'phonepe';
  payment_method: string | null;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  status: PaymentStatus;
  initiated_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
}

type PaymentUpdateData =
  Parameters<BaseRepository<PaymentRecord>['update']>[1];

export interface UpdatePaymentStatusData {
  status: PaymentStatus;
  gateway_payment_id?: string | null;
  payment_method?: string | null;
  failure_reason?: string | null;
  completed_at?: string | null;
}

export class PaymentRepository extends BaseRepository<PaymentRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'payments',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  async createPayment(
    data: Parameters<BaseRepository<PaymentRecord>['create']>[0]
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
        column: 'gateway_order_id',
        operator: 'eq',
        value: gatewayOrderId,
      },
    ]);
  }

  async getPaymentsByBookingId(bookingId: string): Promise<PaymentRecord[]> {
    return this.findMany({
      filters: [{ column: 'booking_id', operator: 'eq', value: bookingId }],
      sort: { column: 'initiated_at', ascending: false },
    });
  }

  async getLatestPaymentForBooking(
    bookingId: string
  ): Promise<PaymentRecord | null> {
    const results = await this.findMany({
      filters: [{ column: 'booking_id', operator: 'eq', value: bookingId }],
      sort: { column: 'initiated_at', ascending: false },
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
      ? [{ column: 'status', operator: 'eq', value: status }]
      : [];

    return this.findWithPagination({
      filters,
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }
}
