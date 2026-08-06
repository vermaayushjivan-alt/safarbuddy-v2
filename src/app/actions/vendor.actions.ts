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
// Mirrors destination.actions.ts (ADMIN-06/07). vendors.user_id is a
// required FK to public.users(id) (schema.ts, DB-01) — the admin UI
// collects it as a UUID text field since no user-picker/search action
// exists yet in this repository (see VendorForm). gst_number is kept
// as an optional plain string (no format enum confirmed in schema.ts).

const vendorInputSchema = z.object({
  user_id: z.string().uuid('A valid user ID (UUID) is required'),
  business_name: z.string().min(1, 'Business name is required'),
  gst_number: z.string().nullable().optional(),
  is_approved: z.boolean().optional(),
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

// --- ADMIN-09: Vendor Branch Management (CRUD) ---
// vendor_branches table, scoped by vendor_id. Mirrors the
// destination_images admin-action section shape (list/create/update/
// delete) minus Storage, since vendor_branches has no file columns.

const vendorBranchInputSchema = z.object({
  branch_name: z.string().min(1, 'Branch name is required'),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type VendorBranchInput = z.infer<typeof vendorBranchInputSchema>;

export async function getVendorBranchesAdmin(vendorId: string): Promise<VendorBranchRecord[]> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.listVendorBranches(vendorId);
}

export async function createVendorBranchAdmin(vendorId: string, input: VendorBranchInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = vendorBranchInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.createVendorBranch(vendorId, parsed);
}

export async function updateVendorBranchAdmin(branchId: string, input: VendorBranchInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = vendorBranchInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.updateVendorBranch(branchId, parsed);
}

export async function deleteVendorBranchAdmin(branchId: string): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  await repo.deleteVendorBranch(branchId);
}
