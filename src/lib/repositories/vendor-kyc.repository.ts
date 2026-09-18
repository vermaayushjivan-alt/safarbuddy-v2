// lib/repositories/vendor-kyc.repository.ts
// VENDOR-03 (M2 follow-up) — Owner KYC document capture.
//
// Field names match public.vendor_kyc_documents created by
// src/db/sql/018_vendor03_kyc_documents.sql. Stores storage PATHS only
// — never a public URL. Reading a document back always goes through
// createSignedUrlForDocument() below (short-lived, admin-only), never
// storage.getPublicUrl().

import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export const KYC_STATUS_VALUES = ['pending', 'verified', 'rejected'] as const;
export type KycStatus = (typeof KYC_STATUS_VALUES)[number];

export interface VendorKycDocumentsRecord extends DatabaseRecord {
  id: string;
  vendor_id: string;
  aadhar_storage_path: string | null;
  pan_storage_path: string | null;
  passbook_storage_path: string | null;
  kyc_status: KycStatus;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
}

// Private bucket — created manually via the Supabase dashboard, NOT by
// a SQL migration (same as the existing `room-images` bucket). Must be
// created with "Public bucket" left OFF before any upload below will
// succeed — see migration 018's header comment.
export const VENDOR_KYC_BUCKET = 'vendor-kyc-documents';

export class VendorKycRepository extends BaseRepository<VendorKycDocumentsRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'vendor_kyc_documents',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  async getByVendorId(
    vendorId: string
  ): Promise<VendorKycDocumentsRecord | null> {
    return this.findOne([
      { column: 'vendor_id', operator: 'eq', value: vendorId },
    ]);
  }

  // One row per vendor (unique index on vendor_id — migration 018).
  // Upserts at the application level, same pattern as
  // VendorPayoutRepository.upsertForVendor(). Only overwrites the
  // paths actually passed in — uploading just the Aadhar photo today
  // and the passbook photo next week must not null out the PAN path
  // already on file.
  async upsertDocumentPaths(
    vendorId: string,
    paths: Partial<
      Pick<
        VendorKycDocumentsRecord,
        'aadhar_storage_path' | 'pan_storage_path' | 'passbook_storage_path'
      >
    >
  ): Promise<VendorKycDocumentsRecord> {
    const existing = await this.getByVendorId(vendorId);

    if (existing) {
      return this.update(existing.id, paths);
    }

    return this.create({
      vendor_id: vendorId,
      kyc_status: 'pending',
      ...paths,
    });
  }

  // Admin-only — see kyc.actions.ts requireRole gate. Setting either
  // status also stamps verified_by/verified_at; rejectionReason is
  // cleared on 'verified' (a stale rejection reason must never linger
  // once an admin approves the same vendor on a later resubmission).
  async setStatus(
    vendorId: string,
    status: Extract<KycStatus, 'verified' | 'rejected'>,
    adminUserId: string,
    rejectionReason: string | null
  ): Promise<VendorKycDocumentsRecord> {
    const existing = await this.getByVendorId(vendorId);

    if (!existing) {
      throw new Error('No KYC documents have been uploaded for this vendor yet.');
    }

    return this.update(existing.id, {
      kyc_status: status,
      rejection_reason: status === 'rejected' ? rejectionReason : null,
      verified_by: adminUserId,
      verified_at: new Date().toISOString(),
    });
  }

  // Short-lived (5 min) signed URL for admin review — the bucket is
  // private, so a plain storage_path is never directly viewable. Never
  // call this from a public-facing action; always gate the caller with
  // requireRole(['admin','super_admin']) first (see kyc.actions.ts).
  async createSignedUrlForDocument(
    storagePath: string
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(VENDOR_KYC_BUCKET)
      .createSignedUrl(storagePath, 300);

    if (error || !data) {
      throw new Error(
        `Failed to create a signed URL for this document: ${error?.message ?? 'unknown error'}`
      );
    }

    return data.signedUrl;
  }
}

