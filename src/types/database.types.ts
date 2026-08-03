export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface User {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface CreateUserInput {
  auth_user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  status?: UserStatus;
  is_verified?: boolean;
  created_by?: string | null;
}

export interface UpdateUserInput {
  full_name?: string;
  email?: string;
  phone?: string | null;
  status?: UserStatus;
  is_verified?: boolean;
  updated_by?: string | null;
}

export interface UserSearchFilters {
  email?: string;
  phone?: string;
  status?: UserStatus;
  is_verified?: boolean;
  search?: string; // Search in full_name or email
}
