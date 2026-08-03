import { SupabaseClient } from '@supabase/supabase-js';

export type SupabaseClientType = SupabaseClient;

export interface DatabaseRecord {
  id: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  deleted_at?: string | Date | null;
  [key: string]: unknown;
}

export interface BaseRepositoryConfig {
  tableName: string;
  softDelete?: boolean;
  softDeleteColumn?: string;
}

export interface FilterOptions {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: unknown;
}

export interface SortOptions {
  column: string;
  ascending?: boolean;
}

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

export interface SelectOptions {
  columns?: string;
  filters?: FilterOptions[];
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

export type InsertData<T> = Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type UpdateData<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;
