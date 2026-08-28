// lib/repositories/vendor.repository.ts
import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

// Field names reflect the live public.vendors table (verified against
// production columns during VENDOR-01 audit), not the src/db/schema.ts
// Drizzle definition, which diverged from the live table outside the
// tracked migration history. owner_user_id nullability is unverified,
// so it is typed nullable rather than assumed NOT NULL. status enum
// values are unverified beyond the column existing, so it stays a
// loose string rather than an invented union type (Bible Rule 8).
export interface VendorRecord extends DatabaseRecord {
  id: string;
  vendor_name: string;
  vendor_type: string | null;
  owner_user_id: string | null;
  business_email: string | null;
  business_phone: string | null;
  gstin: string | null;
  pan_number: string | null;
  status: string;
}

export interface VendorBranchRecord extends DatabaseRecord {
  id: string;
  vendor_id: string;
  branch_name: string;
  address: string | null;
  city: string | null;
  is_active: boolean;
}

// --- ADMIN-09: Vendor Management (CRUD) ---
// Mirrors DestinationRepository (ADMIN-06/07): vendors table CRUD via
// BaseRepository, vendor_branches as a related sub-resource scoped by
// vendor_id, same shape as destination_images but without Storage
// involvement (vendor_branches has no file/image columns per
// DATABASE_BIBLE / schema.ts — DB-01). softDelete is true for both
// tables, matching their `deleted_at` audit column in schema.ts.

export class VendorRepository extends BaseRepository<VendorRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'vendors',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  // --- Vendor CRUD ---

  async getAllVendors(page: number = 1, limit: number = 20) {
    return this.findWithPagination({
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }

  async getVendorById(id: string): Promise<VendorRecord | null> {
    return this.findById(id);
  }

  // P0.3 (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 3 /
  // SESSION_HANDOFF_2026-08-28_P0_FIXES.md): needed by the new
  // owner-scoped self-service layer so a logged-in hotel_owner/vendor
  // can be resolved back to their own vendor row. `owner_user_id` here
  // must be the resolved public.users.id (from resolvePublicUserId()),
  // never the raw Supabase Auth id — see session.ts's resolvePublicUserId
  // header comment for why those two ids are different live columns.
  // Returns null (not an error) when the signed-in user has no vendor
  // row yet — callers decide how to handle that (e.g. treat as
  // "not onboarded").
  async getVendorByOwnerUserId(ownerUserId: string): Promise<VendorRecord | null> {
    const { data, error } = await this.supabase
      .from('vendors')
      .select('*')
      .eq('owner_user_id', ownerUserId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to look up vendor for owner: ${error.message}`);
    }

    return (data as VendorRecord) ?? null;
  }

  async createVendor(
    data: Parameters<BaseRepository<VendorRecord>['create']>[0]
  ) {
    return this.create(data);
  }

  async updateVendor(
    id: string,
    data: Parameters<BaseRepository<VendorRecord>['update']>[1]
  ) {
    return this.update(id, data);
  }

  async deleteVendor(id: string): Promise<boolean> {
    return this.softDeleteById(id).then(() => true);
  }

  // --- Vendor Branch CRUD (vendor_branches table, scoped by vendor_id) ---
  // Direct Supabase calls, same style as DestinationRepository's
  // destination_images methods — vendor_branches is a separate table
  // from `vendors`, so it can't go through this class's own
  // BaseRepository instance (which is bound to the `vendors` table).

  async listVendorBranches(vendorId: string): Promise<VendorBranchRecord[]> {
    const { data, error } = await this.supabase
      .from('vendor_branches')
      .select('id, vendor_id, branch_name, address, city, is_active, created_at, updated_at, deleted_at')
      .eq('vendor_id', vendorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list vendor branches: ${error.message}`);
    }

    return (data ?? []) as VendorBranchRecord[];
  }

  async getVendorBranchById(branchId: string): Promise<VendorBranchRecord | null> {
    const { data, error } = await this.supabase
      .from('vendor_branches')
      .select('id, vendor_id, branch_name, address, city, is_active, created_at, updated_at, deleted_at')
      .eq('id', branchId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get vendor branch: ${error.message}`);
    }

    return data as VendorBranchRecord;
  }

  async createVendorBranch(
    vendorId: string,
    data: { branch_name: string; address?: string | null; city?: string | null; is_active?: boolean }
  ): Promise<VendorBranchRecord> {
    const { data: result, error } = await this.supabase
      .from('vendor_branches')
      .insert({
        vendor_id: vendorId,
        branch_name: data.branch_name,
        address: data.address ?? null,
        city: data.city ?? null,
        is_active: data.is_active ?? true,
      })
      .select('id, vendor_id, branch_name, address, city, is_active, created_at, updated_at, deleted_at')
      .single();

    if (error) {
      throw new Error(`Failed to create vendor branch: ${error.message}`);
    }

    return result as VendorBranchRecord;
  }

  async updateVendorBranch(
    branchId: string,
    data: Partial<{ branch_name: string; address: string | null; city: string | null; is_active: boolean }>
  ): Promise<VendorBranchRecord> {
    const { data: result, error } = await this.supabase
      .from('vendor_branches')
      .update(data)
      .eq('id', branchId)
      .is('deleted_at', null)
      .select('id, vendor_id, branch_name, address, city, is_active, created_at, updated_at, deleted_at')
      .single();

    if (error) {
      throw new Error(`Failed to update vendor branch: ${error.message}`);
    }

    return result as VendorBranchRecord;
  }

  async deleteVendorBranch(branchId: string): Promise<void> {
    const { error } = await this.supabase
      .from('vendor_branches')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', branchId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to delete vendor branch: ${error.message}`);
    }
  }
}
