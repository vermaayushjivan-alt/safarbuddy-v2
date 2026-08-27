// lib/repositories/hotel-facility.repository.ts
// VENDOR-03 (M1) — Hotel Facilities schema foundation.
//
// Field names match public.hotel_facilities / public.hotel_facility_links
// created by src/db/sql/011_vendor03_hotel_facilities.sql. Two tables,
// two repositories, same BaseRepository pattern as
// vendor.repository.ts / vendor-payout.repository.ts (RULE 9 — reuse
// existing architecture rather than inventing a new one).
//
// This file is data-layer only (RULE 3) — no auth checks, no business
// logic. Server Actions consuming this (M2) are responsible for
// requireRole()/ownership checks.

import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface HotelFacilityRecord extends DatabaseRecord {
  id: string;
  code: string;
  label: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

export interface HotelFacilityLinkRecord extends DatabaseRecord {
  id: string;
  hotel_id: string;
  facility_id: string;
}

// --- Master catalog (admin-managed, publicly readable) ---

export class HotelFacilityRepository extends BaseRepository<HotelFacilityRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'hotel_facilities',
      softDelete: false,
    });
  }

  // Active catalog, ordered for stable UI rendering (checklist order
  // in both the admin edit form and the public "List Your Property"
  // form must match — both read this same method).
  async getActiveFacilities(): Promise<HotelFacilityRecord[]> {
    const { data, error } = await this.supabase
      .from('hotel_facilities')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as HotelFacilityRecord[];
  }
}

// --- Per-hotel selection (junction) ---

export class HotelFacilityLinkRepository extends BaseRepository<HotelFacilityLinkRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'hotel_facility_links',
      softDelete: false,
    });
  }

  async getFacilityIdsForHotel(hotelId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('hotel_facility_links')
      .select('facility_id')
      .eq('hotel_id', hotelId);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => row.facility_id as string);
  }

  // Replaces the full facility set for a hotel in one call — used by
  // both the admin edit form and the M2 "List Your Property" form so
  // a resubmission doesn't require the caller to diff old vs new
  // selections themselves. Delete-then-insert inside a single
  // logical operation; not wrapped in a DB transaction because
  // BaseRepository has no transaction primitive (RULE 9 — not
  // inventing one here; if this needs atomicity guarantees beyond
  // "acceptable to briefly have zero links," that's a follow-up
  // migration to a Postgres function, out of scope for M1).
  async setFacilitiesForHotel(
    hotelId: string,
    facilityIds: string[]
  ): Promise<void> {
    const { error: deleteError } = await this.supabase
      .from('hotel_facility_links')
      .delete()
      .eq('hotel_id', hotelId);

    if (deleteError) {
      throw deleteError;
    }

    if (facilityIds.length === 0) {
      return;
    }

    const rows = facilityIds.map((facilityId) => ({
      hotel_id: hotelId,
      facility_id: facilityId,
    }));

    const { error: insertError } = await this.supabase
      .from('hotel_facility_links')
      .insert(rows);

    if (insertError) {
      throw insertError;
    }
  }
}

