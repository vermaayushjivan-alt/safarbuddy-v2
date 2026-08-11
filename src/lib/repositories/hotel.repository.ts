import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

/**
 * HotelRecord — mirrors the actual `public.hotels` table shape verified
 * against information_schema (SESSION 03). Do NOT add columns that are
 * not present in the DB (RULE 7). `thumbnail` is a computed field
 * populated by resolveImages() from hotel_images.storage_path — it is
 * NOT a real DB column.
 */
export interface HotelRecord extends DatabaseRecord {
  id: string;
  vendor_id: string | null;
  hotel_name: string;
  slug: string;
  description: string | null;

  // Foreign-key columns (all nullable as of SESSION 03 SQL migration —
  // dropdowns for these are a future milestone).
  country_id: string | null;
  state_id: string | null;
  city_id: string | null;
  destination_id: string | null;

  // Legacy plain-text location columns still present in DB.
  city: string | null;
  state: string | null;
  country: string | null;

  address: string | null;
  latitude: number | null;
  longitude: number | null;
  star_rating: 
