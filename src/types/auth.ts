import { User, Session } from '@supabase/supabase-js';

export type UserRole = 
  | 'super_admin'
  | 'admin'
  | 'hotel_owner'
  | 'travel_agent'
  | 'customer'
  | 'vendor';

export interface AuthUser extends User {
  user_metadata: {
    role?: UserRole;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface AuthSession extends Session {
  user: AuthUser;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export interface AuthGuardOptions {
  allowedRoles?: UserRole[];
  requireVerified?: boolean;
  redirectTo?: string;
}
