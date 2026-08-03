import { SupabaseClient } from '@supabase/supabase-js';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SortOptions {
  column: string;
  ascending?: boolean;
}

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';

export interface FilterOptions {
  column: string;
  operator: FilterOperator;
  value: string | number | boolean | null | Array<string | number>;
}

export interface SelectOptions {
  columns?: string;
  filters?: FilterOptions[];
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

export interface SoftDeleteFields {
  deletedAt: string;
  deletedBy?: string;
}

export interface BaseRepositoryConfig {
  tableName: string;
  softDelete?: boolean;
  softDeleteColumn?: string;
}

export type SupabaseClientType = SupabaseClient;

// Type helper for database records - MORE FLEXIBLE
// Only requires id, allows any other fields
export type DatabaseRecord = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

// Type helper for insert data (partial without id, created_at, updated_at)
export type InsertData<T> = Omit<T, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Type helper for update data (partial without created_at)
export type UpdateData<T> = Partial<Omit<T, 'id' | 'created_at'>> & {
  updated_at?: string;
};
