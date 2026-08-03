import { SupabaseClient } from '@supabase/supabase-js';
import { UserRepository } from './UserRepository';

/**
 * Repository factory to create repository instances with Supabase client
 */
export class RepositoryFactory {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  getUserRepository(): UserRepository {
    return new UserRepository(this.supabase);
  }
}

/**
 * Create a new repository factory instance
 */
export function createRepositories(supabase: SupabaseClient): RepositoryFactory {
  return new RepositoryFactory(supabase);
}
