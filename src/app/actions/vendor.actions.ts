'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import {
  VendorRepository,
  VendorRecord,
  VendorBranchRecord,
} from '@/lib/repositories/vendor.repository';

// --- ADMIN-09: Vendor Management (CRUD) ---

// Field names reflect the live public.vendors table (see VENDOR-01
// audit/plan). owner_user_id nullability is unverified (existing live
// rows currently have it null), so it stays optional/nullable rather
// than a required uuid. status enum values are unverified beyond the
// column existing, so it is validated as a non-empty string only —
// no enum is invented (Bible Rule 8).
const vendorInputSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.string().nullable().optional(),
  owner_user_id: z.string().uuid('Owner user ID must be a valid UUID').nullable().optional(),
  business_email: z.string().email('Must be a valid email').nullable().optional(),
  business_phone: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  pan_number: z.string().nullable().optional(),
  status: z.string().min(1, 'Status is required'),
});

export type VendorInput = z.infer<typeof vendorInputSchema>;

export async function getAllVendorsAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.getAllVendors(page, limit);
}

export async function getVendorByIdAdmin(id: string): Promise<VendorRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.getVendorById(id);
}

export async function createVendorAdmin(input: VendorInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = vendorInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.createVendor(parsed);
}

export async function updateVendorAdmin(id: string, input: VendorInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = vendorInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.updateVendor(id, parsed);
}

export async function deleteVendorAdmin(id: string): Promise<boolean> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.deleteVendor(id);
}

// -----------------------------------------------------------------------------
// Vendor Branch Management
// -----------------------------------------------------------------------------

const vendorBranchInputSchema = z.object({
  branch_name: z.string().min(1, 'Branch name is required'),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type VendorBranchInput = z.infer<typeof vendorBranchInputSchema>;

export async function getVendorBranchesAdmin(
  vendorId: string
): Promise<VendorBranchRecord[]> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new VendorRepository(supabase);

  return repo.listVendorBranches(vendorId);
}

export async function createVendorBranchAdmin(
  vendorId: string,
  input: VendorBranchInput
) {
  await requireRole(['admin', 'super_admin']);

  const parsed = vendorBranchInputSchema.parse(input);

  const supabase = await createClient();
  const repo = new VendorRepository(supabase);

  return repo.createVendorBranch(vendorId, parsed);
}

export async function updateVendorBranchAdmin(
  branchId: string,
  input: Partial<VendorBranchInput>
) {
  await requireRole(['admin', 'super_admin']);

  const parsed = vendorBranchInputSchema
    .partial()
    .parse(input);

  const supabase = await createClient();
  const repo = new VendorRepository(supabase);

  return repo.updateVendorBranch(branchId, parsed);
}

export async function deleteVendorBranchAdmin(
  branchId: string
): Promise<void> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new VendorRepository(supabase);

  await repo.deleteVendorBranch(branchId);
}
