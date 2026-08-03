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

export abstract class BaseRepository<T extends Record<string, unknown>> {
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
        .insert(data as Record<string, unknown>)
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
        .insert(data as Record<string, unknown>[])
        .select();

      if (error) {
        throw handleDatabaseError(error);
      }

      return (result as T[]) ?? [];
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to create records');
    }
  }

  /**
   * Update a record by ID
   */
  protected async update(id: string, data: Partial<T>): Promise<T> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .update(data as Record<string, unknown>)
        .eq('id', id);

      if (this.softDelete) {
        query = query.is(this.softDeleteColumn, null);
      }

      const { data: result, error } = await query.select().single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Record not found');
        }
        throw handleDatabaseError(error);
      }

      if (!result) {
        throw new NotFoundError('Record not found');
      }

      return result as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to update record');
    }
  }

  /**
   * Update multiple records matching filters
   */
  protected async updateMany(
    filters: FilterOptions[],
    data: Partial<T>
  ): Promise<T[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .update(data as Record<string, unknown>);

      query = this.applyFilters(query, filters);

      if (this.softDelete) {
        query = query.is(this.softDeleteColumn, null);
      }

      const { data: result, error } = await query.select();

      if (error) {
        throw handleDatabaseError(error);
      }

      return (result as T[]) ?? [];
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to update records');
    }
  }

  /**
   * Hard delete a record by ID
   */
  protected async delete(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw handleDatabaseError(error);
      }

      return true;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete record');
    }
  }

  /**
   * Hard delete multiple records matching filters
   */
  protected async deleteMany(filters: FilterOptions[]): Promise<number> {
    try {
      let query = this.supabase.from(this.tableName).delete();

      query = this.applyFilters(query, filters);

      const { data, error } = await query.select();

      if (error) {
        throw handleDatabaseError(error);
      }

      return data?.length ?? 0;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete records');
    }
  }

  /**
   * Soft delete a record by ID
   */
  protected async softDeleteById(
    id: string,
    deletedBy?: string
  ): Promise<T> {
    if (!this.softDelete) {
      throw new ValidationError('Soft delete is not enabled for this repository');
    }

    try {
      const updateData: Record<string, unknown> = {
        [this.softDeleteColumn]: new Date().toISOString(),
      };

      if (deletedBy) {
        updateData.deleted_by = deletedBy;
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .is(this.softDeleteColumn, null)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Record not found or already deleted');
        }
        throw handleDatabaseError(error);
      }

      if (!data) {
        throw new NotFoundError('Record not found or already deleted');
      }

      return data as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to soft delete record');
    }
  }

  /**
   * Restore a soft-deleted record
   */
  protected async restore(id: string): Promise<T> {
    if (!this.softDelete) {
      throw new ValidationError('Soft delete is not enabled for this repository');
    }

    try {
      const updateData: Record<string, unknown> = {
        [this.softDeleteColumn]: null,
      };

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .not(this.softDeleteColumn, 'is', null)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Record not found or not deleted');
        }
        throw handleDatabaseError(error);
      }

      if (!data) {
        throw new NotFoundError('Record not found or not deleted');
      }

      return data as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to restore record');
    }
  }

  /**
   * Count records matching filters
   */
  protected async count(filters?: FilterOptions[]): Promise<number> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (this.softDelete) {
        query = query.is(this.softDeleteColumn, null);
      }

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { count, error } = await query;

      if (error) {
        throw handleDatabaseError(error);
      }

      return count ?? 0;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to count records');
    }
  }

  /**
   * Check if a record exists
   */
  protected async exists(filters: FilterOptions[]): Promise<boolean> {
    try {
      const count = await this.count(filters);
      return count > 0;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to check record existence');
    }
  }

  /**
   * Apply filters to a query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFilters(query: any, filters: FilterOptions[]) {
    filters.forEach((filter) => {
      switch (filter.operator) {
        case 'eq':
          query = query.eq(filter.column, filter.value);
          break;
        case 'neq':
          query = query.neq(filter.column, filter.value);
          break;
        case 'gt':
          query = query.gt(filter.column, filter.value);
          break;
        case 'gte':
          query = query.gte(filter.column, filter.value);
          break;
        case 'lt':
          query = query.lt(filter.column, filter.value);
          break;
        case 'lte':
          query = query.lte(filter.column, filter.value);
          break;
        case 'like':
          query = query.like(filter.column, filter.value);
          break;
        case 'ilike':
          query = query.ilike(filter.column, filter.value);
          break;
        case 'in':
          query = query.in(filter.column, filter.value);
          break;
        case 'is':
          query = query.is(filter.column, filter.value);
          break;
      }
    });
    return query;
  }

  /**
   * Apply sorting to a query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applySort(query: any, sort: SortOptions) {
    return query.order(sort.column, { ascending: sort.ascending ?? true });
  }

  /**
   * Apply pagination to a query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyPagination(query: any, pagination: PaginationOptions) {
    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;
    return query.range(from, to);
  }
}
