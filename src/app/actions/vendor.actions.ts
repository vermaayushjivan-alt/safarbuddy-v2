'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import {
  VendorRepository,
  VendorRecord,
  VendorBranchRecord,
} from '@/lib/repositories/vendor.repository';
import { runAction, emptyToNull, type ActionResult } from '@/lib/actions/action-result';

// --- ADMIN-09: Vendor Management (CRUD) ---

const vendorInputSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.preprocess(emptyToNull, z.string().nullable().optional()),
  // P1 fix: blank input ("") is neither null nor undefined, so it used to
  // fail optional UUID validation. Normalize blank -> null first.
  owner_user_id: z.preprocess(
    emptyToNull,
    z.string().uuid('Owner user ID must be a valid UUID').nullable().optional()
  ),
  business_email: z.preprocess(
    emptyToNull,
    z.string().email('Must be a valid email').nullable().optional()
  ),
  business_phone: z.preprocess(emptyToNull, z.string().nullable().optional()),
  // GSTIN stays optional at the application level — see P1 findings.
  gstin: z.preprocess(emptyToNull, z.string().nullable().optional()),
  pan_number: z.preprocess(emptyToNull, z.string().nullable().optional()),
  status: z.string().min(1, 'Status is required'),
});

export type VendorInput = z.infer<typeof vendorInputSchema>;

export async function getAllVendorsAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.getAllVendors(page, limit);
}

// ---------------------------------------------------------------------------
// Dropdown-optimised vendor list — returns only the fields the hotel form
// needs: id (the UUID that gets stored as vendor_id) and vendor_name
// (the human-readable label shown to the admin). No pagination — all
// active vendors are returned so the dropdown is complete.
// ---------------------------------------------------------------------------

export async function getAllVendorsForDropdown(): Promise<
  { id: string; vendor_name: string }[]
> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);

  // getAllVendors with a large limit returns all non-deleted vendors.
  // The repository applies softDelete filter (deleted_at IS NULL).
  const result = await repo.getAllVendors(1, 200);

  return result.data.map((v) => ({
    id: v.id,
    vendor_name: v.vendor_name,
  }));
}

export async function getVendorByIdAdmin(id: string): Promise<VendorRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorRepository(supabase);
  return repo.getVendorById(id);
}

export async function createVendorAdmin(
  input: VendorInput
): Promise<ActionResult<VendorRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = vendorInputSchema.parse(input);
    const supabase = await createClient();
    const repo = new VendorRepository(supabase);
    return repo.createVendor(parsed);
  });
}

export async function updateVendorAdmin(
  id: string,
  input: VendorInput
): Promise<ActionResult<VendorRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = vendorInputSchema.parse(input);
    const supabase = await createClient();
    const repo = new VendorRepository(supabase);
    return repo.updateVendor(id, parsed);
  });
}

export async function deleteVendorAdmin(id: string): Promise<ActionResult<boolean>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const supabase = await createClient();
    const repo = new VendorRepository(supabase);
    return repo.deleteVendor(id);
  });
}

// -----------------------------------------------------------------------------
// Vendor Branch Management
// -----------------------------------------------------------------------------

const vendorBranchInputSchema = z.object({
  branch_name: z.string().min(1, 'Branch name is required'),
  address: z.preprocess(emptyToNull, z.string().nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().nullable().optional()),
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
): Promise<ActionResult<VendorBranchRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = vendorBranchInputSchema.parse(input);
    const supabase = await createClient();
    const repo = new VendorRepository(supabase);
    return repo.createVendorBranch(vendorId, parsed);
  });
}

export async function updateVendorBranchAdmin(
  branchId: string,
  input: Partial<VendorBranchInput>
): Promise<ActionResult<VendorBranchRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = vendorBranchInputSchema.partial().parse(input);
    const supabase = await createClient();
    const repo = new VendorRepository(supabase);
    return repo.updateVendorBranch(branchId, parsed);
  });
}

export async function deleteVendorBranchAdmin(
  branchId: string
): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const supabase = await createClient();
    const repo = new VendorRepository(supabase);
    await repo.deleteVendorBranch(branchId);
  });
}
