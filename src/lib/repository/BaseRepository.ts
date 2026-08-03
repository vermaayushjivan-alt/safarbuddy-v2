import { SupabaseClient } from '@supabase/supabase-js';
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
  ValidationError,
  handleDatabaseError,
} from '@/lib/errors/database.errors';
import {
  PaginationOptions,
  PaginationResult,
  SortOptions,
  FilterOptions,
  SelectOptions,
  BaseRepositoryConfig,
  SupabaseClientType,
} from './types';

export abstract class BaseRepository<T> {
  protected tableName: string;
  protected softDelete: boolean;
  protected softDeleteColumn: string;
  protected supabase: SupabaseClientType;

  constructor(
    supabase: SupabaseClientType,
    config: BaseRepositoryConfig
  ) {
    this.supabase = supabase;
    this.tableName = config.tableName;
    this.softDelete = config.softDelete ?? false;
    this.softDeleteColumn = config.softDeleteColumn ?? 'deleted_at';
  }

  /**
   * Find a single record by ID
   */
  protected async findById(
    id: string,
    columns: string = '*'
  ): Promise<T | null> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(columns)
        .eq('id', id);

      if (this.softDelete) {
        query = query.is(this.softDeleteColumn, null);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw handleDatabaseError(error);
      }

      return data as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to find record by ID');
    }
  }

  /**
   * Find a single record by custom filter
   */
  protected async findOne(
    filters: FilterOptions[],
    columns: string = '*'
  ): Promise<T | null> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(columns);

      query = this.applyFilters(query, filters);

      if (this.softDelete) {
        query = query.is(this.softDeleteColumn, null);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw handleDatabaseError(error);
      }

      return data as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to find record');
    }
  }

  /**
   * Find multiple records with optional filters, sorting, and pagination
   */
  protected async findMany(options: SelectOptions = {}): Promise<T[]> {
    try {
      const columns = options.columns ?? '*';
      let query = this.supabase.from(this.tableName).select(columns);

      if (this.softDelete) {
        query = query.is(this.softDeleteColumn, null);
      }

      if (options.filters) {
        query = this.applyFilters(query, options.filters);
      }

      if (options.sort) {
        query = this.applySort(query, options.sort);
      }

      if (options.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) {
        throw handleDatabaseError(error);
      }

      return (data as T[]) ?? [];
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to find records');
    }
  }

  /**
   * Find records with pagination metadata
   */
  protected async findWithPagination(
    options: SelectOptions & { pagination: PaginationOptions }
  ): Promise<PaginationResult<T>> {
    try {
      const { pagination, ...selectOptions } = options;
      const columns = options.columns ?? '*';

      // Get total count
      let countQuery = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (this.softDelete) {
        countQuery = countQuery.is(this.softDeleteColumn, null);
      }

      if (options.filters) {
        countQuery = this.applyFilters(countQuery, options.filters);
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        throw handleDatabaseError(countError);
      }

      const total = count ?? 0;

      // Get paginated data
      const data = await this.findMany({
        ...selectOptions,
        pagination,
      });

      const totalPages = Math.ceil(total / pagination.limit);

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to find paginated records');
    }
  }

  /**
   * Create a new record
   */
  protected async create(data: Partial<T>): Promise<T> {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(data as never)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error);
      }

      if (!result) {
        throw new DatabaseError('Failed to create record - no data returned');
      }

      return result as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to create record');
    }
  }

  /**
   * Create multiple records
   */
  protected async createMany(data: Partial<T>[]): Promise<T[]> {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(data as never[])
        .select();

      if (error) {
        throw handleDatabaseError(error);
      }

      return (result as T[]) ?? [];
    } catch (error) {
      if (error 
