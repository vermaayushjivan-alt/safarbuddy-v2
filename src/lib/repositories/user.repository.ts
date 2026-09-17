import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface UserRecord extends DatabaseRecord {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export class UserRepository extends BaseRepository<UserRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'users',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  async findByAuthId(authUserId: string): Promise<UserRecord | null> {
    return this.findOne([{ column: 'auth_user_id', operator: 'eq', value: authUserId }]);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.findOne([{ column: 'email', operator: 'eq', value: email }]);
  }

  // INVOICE-01 Step 3a: resolves a signed-in customer's display name/
  // email/phone for the invoice snapshot (bookings.customer_id stores
  // this table's id, not the auth user id — see booking.actions.ts's
  // resolvePublicUserId() comment for the same distinction). Added here
  // rather than inline in generate-invoice.ts to match this repo's
  // existing getXById naming convention (getHotelById, getVendorById, etc.).
  async getUserById(id: string): Promise<UserRecord | null> {
    return this.findById(id);
  }
}
