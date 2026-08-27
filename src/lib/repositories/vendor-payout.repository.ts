// lib/repositories/vendor-payout.repository.ts
// VENDOR-02 — Hotel Owner Payout KYC Capture.
//
// Field names match the new public.vendor_payout_details table created by
// src/db/sql/010_vendor02_payout_kyc.sql. This table is separate from
// public.vendors by design (see that migration's header comment) — PAN
// stays on vendors (VendorRecord.pan_number), only bank/UPI/beneficiary
// data lives here.
import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface VendorPayoutDetailsRecord extends DatabaseRecord {
  id: string;
  vendor_id: string;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  upi_id: string | null;
  cashfree_beneficiary_id: string | null;
  payout_status: string;
}

export class VendorPayoutRepository extends BaseRepository<VendorPayoutDetailsRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'vendor_payout_details',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  async getByVendorId(
    vendorId: string
  ): Promise<VendorPayoutDetailsRecord | null> {
    return this.findOne([
      { column: 'vendor_id', operator: 'eq', value: vendorId },
    ]);
  }

  // One row per vendor (unique index on vendor_id at the DB level — see
  // migration 010). This upserts at the application level: create if no
  // row exists yet, otherwise update the existing row.
  async upsertForVendor(
    vendorId: string,
    data: Partial<
      Pick<
        VendorPayoutDetailsRecord,
        'bank_account_number' | 'bank_ifsc' | 'upi_id'
      >
    >
  ): Promise<VendorPayoutDetailsRecord> {
    const existing = await this.getByVendorId(vendorId);

    if (existing) {
      return this.update(existing.id, data);
    }

    return this.create({ vendor_id: vendorId, ...data });
  }
}

