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

export interface FilterOptions {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
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
