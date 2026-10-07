// ROOT PATH: src/lib/repositories/partner-terms.repository.ts
// PARTNER-TERMS-01 — Hotel-owner agreement to the Partner Terms and the
// platform commission. Data layer only (RULE 3).
//
// Table: public.partner_terms_acceptances — created by
// src/db/sql/031_partner_terms_acceptances.sql. RLS is enabled with no
// policy, so callers must pass a createServiceRoleClient() instance.

import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface PartnerTermsAcceptanceRecord extends DatabaseRecord {
  id: string;
  user_id: string;
  vendor_id: string | null;
  terms_version: string;
  commission_percent: number;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface RecordAcceptanceInput {
  user_id: string;
  terms_version: string;
  commission_percent: number;
  ip_address: string | null;
  user_agent: string | null;
}

export class PartnerTermsRepository extends BaseRepository<PartnerTermsAcceptanceRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, { tableName: 'partner_terms_acceptances', softDelete: false });
  }

  // Append-only: always inserts a new row (re-acceptance of a newer
  // version is a new row, never an overwrite).
  async recordAcceptance(
    input: RecordAcceptanceInput
  ): Promise<PartnerTermsAcceptanceRecord> {
    const { data, error } = await this.supabase
      .from('partner_terms_acceptances')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('[partner-terms] recordAcceptance failed', error);
      throw error;
    }
    return data as PartnerTermsAcceptanceRecord;
  }

  async linkVendor(acceptanceId: string, vendorId: string): Promise<void> {
    const { error } = await this.supabase
      .from('partner_terms_acceptances')
      .update({ vendor_id: vendorId })
      .eq('id', acceptanceId);

    if (error) {
      console.error('[partner-terms] linkVendor failed', error);
      throw error;
    }
  }

  async getLatestForUser(
    userId: string
  ): Promise<PartnerTermsAcceptanceRecord | null> {
    const { data, error } = await this.supabase
      .from('partner_terms_acceptances')
      .select('*')
      .eq('user_id', userId)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[partner-terms] getLatestForUser failed', error);
      throw error;
    }
    return (data as PartnerTermsAcceptanceRecord) ?? null;
  }
}
