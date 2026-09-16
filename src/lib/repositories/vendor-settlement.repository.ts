// src/lib/repositories/vendor-settlement.repository.ts
// PAY-04 — Manual Settlement Tracking.
//
// One row per manual payout an admin has logged after actually sending
// money to a vendor (bank/UPI, outside the app). See migration 013 for
// the schema decision — this table exists purely to give the vendor a
// receipt trail and the admin a "how much is still due" number, while
// the real Cashfree Payouts flow (vendor_payout_details, migration 010)
// remains unwired.

import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface VendorSettlementRecord extends DatabaseRecord {
  id: string;
  vendor_id: string;
  amount: number;
  receipt_number: string;
  reference_note: string | null;
  paid_at: string;
  created_by: string | null;
}

export interface VendorSettlementWithVendorName extends VendorSettlementRecord {
  vendor: { vendor_name: string } | null;
}

export class VendorSettlementRepository extends BaseRepository<VendorSettlementRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'vendor_settlements',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  async createSettlement(data: {
    vendor_id: string;
    amount: number;
    reference_note: string | null;
    paid_at: string;
    created_by: string | null;
  }): Promise<VendorSettlementRecord> {
    return this.create(data);
  }

  async getSettlementsByVendorId(
    vendorId: string,
    page: number = 1,
    limit: number = 20
  ) {
    return this.findWithPagination({
      filters: [{ column: 'vendor_id', operator: 'eq', value: vendorId }],
      sort: { column: 'paid_at', ascending: false },
      pagination: { page, limit },
    });
  }

  // Sum of every settlement ever logged for a vendor — subtracted from
  // getSuccessfulVendorPayoutTotal() (payment.repository.ts) to get the
  // amount still due. Same "fetch and reduce" approach as that method,
  // for the same reason (small row counts at current scale).
  async getTotalSettledForVendor(vendorId: string): Promise<number> {
    const rows = await this.findMany({
      filters: [{ column: 'vendor_id', operator: 'eq', value: vendorId }],
    });

    return rows.reduce((sum, row) => {
      const value = Number(row.amount ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  // Admin-facing list across all vendors, newest first, with the
  // vendor's display name embedded (same embed pattern as
  // booking.repository.ts's currency_record join).
  async getAllSettlementsAdmin(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: VendorSettlementWithVendorName[];
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const { data, error, count } = await this.supabase
      .from('vendor_settlements')
      .select('*, vendor:vendors(vendor_name)', { count: 'exact' })
      .is('deleted_at', null)
      .order('paid_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[vendor_settlements] getAllSettlementsAdmin failed', error);
      throw error;
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      data: (data ?? []) as VendorSettlementWithVendorName[],
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    };
  }
}

