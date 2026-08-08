import {
  DatabaseError,
  NotFoundError,
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
  DatabaseRecord,
  InsertData,
  UpdateData,
} from './types';

export abstract class BaseRepository<T extends DatabaseRecord> {
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

  protected applyFilters<Q>(
    query: Q,
    filters: FilterOptions[]
  ): Q {
    let result = query;

    filters.forEach((filter) => {
      const typedQuery = result as {
        eq: (column: string, value: unknown) => Q;
        neq: (column: string, value: unknown) => Q;
        gt: (column: string, value: unknown) => Q;
        gte: (column: string, value: unknown) => Q;
        lt: (column: string, value: unknown) => Q;
        lte: (column: string, value: unknown) => Q;
        like: (column: string, value: unknown) => Q;
        ilike: (column: string, value: unknown) => Q;
        in: (column: string, value: unknown) => Q;
        is: (column: string, value: unknown) => Q;
      };

      switch (filter.operator) {
        case 'eq':
          result = typedQuery.eq(filter.column, filter.value);
          break;
        case 'neq':
          result = typedQuery.neq(filter.column, filter.value);
          break;
        case 'gt':
          result = typedQuery.gt(filter.column, filter.value);
          break;
        case 'gte':
          result = typedQuery.gte(filter.column, filter.value);
          break;
        case 'lt':
          result = typedQuery.lt(filter.column, filter.value);
          break;
        case 'lte':
          result = typedQuery.lte(filter.column, filter.value);
          break;
        case 'like':
          result = typedQuery.like(filter.column, filter.value);
          break;
        case 'ilike':
          result = typedQuery.ilike(filter.column, filter.value);
          break;
        case 'in':
          result = typedQuery.in(filter.column, filter.value);
          break;
        case 'is':
          result = typedQuery.is(filter.column, filter.value);
          break;
      }
    });

    return result;
  }

  protected applySort<Q>(
    query: Q,
    sort: SortOptions
  ): Q {
    const typedQuery = query as {
      order: (
        column: string,
        options: { ascending: boolean }
      ) => Q;
    };

    return typedQuery.order(sort.column, {
      ascending: sort.ascending ?? true,
    });
  }

  protected applyPagination<Q>(
    query: Q,
    pagination: PaginationOptions
  ): Q {
    const from =
      (pagination.page - 1) * pagination.limit;

    const to =
      from + pagination.limit - 1;

    const typedQuery = query as {
      range: (from: number, to: number) => Q;
    };

    return typedQuery.range(from, to);
  }

  protected async findById(
    id: string,
    columns: string = '*'
  ): Promise<T | null> {
    try {
      if (!id || !id.trim()) {
        return null;
      }

      const queryBuilder = this.supabase
        .from(this.tableName)
        .select(columns)
        .eq('id', id);

      const query = this.softDelete
        ? queryBuilder.is(this.softDeleteColumn, null)
        : queryBuilder;

      const { data, error } = await query.single();

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '22P02'
        ) {
          return null;
        }

        throw handleDatabaseError(error);
      }

      return data
        ? (data as unknown as T)
        : null;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to find record by ID'
      );
    }
  }

  protected async findOne(
    filters: FilterOptions[],
    columns: string = '*'
  ): Promise<T | null> {
    try {
      let queryBuilder = this.supabase
        .from(this.tableName)
        .select(columns);

      queryBuilder = this.applyFilters(
        queryBuilder,
        filters
      );

      const query = this.softDelete
        ? queryBuilder.is(this.softDeleteColumn, null)
        : queryBuilder;

      const { data, error } = await query.single();

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '22P02'
        ) {
          return null;
        }

        throw handleDatabaseError(error);
      }

      return data
        ? (data as unknown as T)
        : null;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to find record'
      );
    }
  }

  protected async findMany(
    options: SelectOptions = {}
  ): Promise<T[]> {
    try {
      const columns = options.columns ?? '*';

      let queryBuilder = this.supabase
        .from(this.tableName)
        .select(columns);

      if (this.softDelete) {
        queryBuilder = queryBuilder.is(
          this.softDeleteColumn,
          null
        );
      }

      if (options.filters) {
        queryBuilder = this.applyFilters(
          queryBuilder,
          options.filters
        );
      }

      if (options.sort) {
        queryBuilder = this.applySort(
          queryBuilder,
          options.sort
        );
      }

      if (options.pagination) {
        queryBuilder = this.applyPagination(
          queryBuilder,
          options.pagination
        );
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw handleDatabaseError(error);
      }

      return data
        ? (data as unknown as T[])
        : [];
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to find records'
      );
    }
  }

  protected async findWithPagination(
    options: SelectOptions & {
      pagination: PaginationOptions;
    }
  ): Promise<PaginationResult<T>> {
    try {
      const {
        pagination,
        ...selectOptions
      } = options;

      let countQuery = this.supabase
        .from(this.tableName)
        .select('*', {
          count: 'exact',
          head: true,
        });

      if (this.softDelete) {
        countQuery = countQuery.is(
          this.softDeleteColumn,
          null
        );
      }

      if (options.filters) {
        countQuery = this.applyFilters(
          countQuery,
          options.filters
        );
      }

      const {
        count,
        error: countError,
      } = await countQuery;

      if (countError) {
        throw handleDatabaseError(countError);
      }

      const total = count ?? 0;

      const data = await this.findMany({
        ...selectOptions,
        pagination,
      });

      const totalPages =
        Math.ceil(
          total / pagination.limit
        );

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext:
          pagination.page < totalPages,
        hasPrev:
          pagination.page > 1,
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to find paginated records'
      );
    }
  }

  protected async create(
    data: InsertData<T>
  ): Promise<T> {
    try {
      const {
        data: result,
        error,
      } = await this.supabase
        .from(this.tableName)
        .insert(
          data as Record<string, unknown>
        )
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error);
      }

      if (!result) {
        throw new DatabaseError(
          'Failed to create record - no data returned'
        );
      }

      return result as unknown as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to create record'
      );
    }
  }

  protected async createMany(
    data: InsertData<T>[]
  ): Promise<T[]> {
    try {
      const {
        data: result,
        error,
      } = await this.supabase
        .from(this.tableName)
        .insert(
          data as Record<string, unknown>[]
        )
        .select();

      if (error) {
        throw handleDatabaseError(error);
      }

      return result
        ? (result as unknown as T[])
        : [];
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to create records'
      );
    }
  }

  protected async update(
    id: string,
    data: UpdateData<T>
  ): Promise<T> {
    try {
      if (!id || !id.trim()) {
        throw new ValidationError(
          'Record ID is required'
        );
      }

      let queryBuilder = this.supabase
        .from(this.tableName)
        .update(
          data as Record<string, unknown>
        )
        .eq('id', id);

      if (this.softDelete) {
        queryBuilder = queryBuilder.is(
          this.softDeleteColumn,
          null
        );
      }

      const {
        data: result,
        error,
      } = await queryBuilder
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(
            'Record not found'
          );
        }

        throw handleDatabaseError(error);
      }

      if (!result) {
        throw new NotFoundError(
          'Record not found'
        );
      }

      return result as unknown as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to update record'
      );
    }
  }

  protected async updateMany(
    filters: FilterOptions[],
    data: UpdateData<T>
  ): Promise<T[]> {
    try {
      let queryBuilder = this.supabase
        .from(this.tableName)
        .update(
          data as Record<string, unknown>
        );

      queryBuilder = this.applyFilters(
        queryBuilder,
        filters
      );

      if (this.softDelete) {
        queryBuilder = queryBuilder.is(
          this.softDeleteColumn,
          null
        );
      }

      const {
        data: result,
        error,
      } = await queryBuilder.select();

      if (error) {
        throw handleDatabaseError(error);
      }

      return result
        ? (result as unknown as T[])
        : [];
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to update records'
      );
    }
  }

  protected async delete(
    id: string
  ): Promise<boolean> {
    try {
      if (!id || !id.trim()) {
        throw new ValidationError(
          'Record ID is required'
        );
      }

      const { error } =
        await this.supabase
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

      throw new DatabaseError(
        'Failed to delete record'
      );
    }
  }

  protected async deleteMany(
    filters: FilterOptions[]
  ): Promise<number> {
    try {
      let queryBuilder = this.supabase
        .from(this.tableName)
        .delete();

      queryBuilder = this.applyFilters(
        queryBuilder,
        filters
      );

      const {
        data,
        error,
      } = await queryBuilder.select();

      if (error) {
        throw handleDatabaseError(error);
      }

      return data?.length ?? 0;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to delete records'
      );
    }
  }

  protected async softDeleteById(
    id: string,
    deletedBy?: string
  ): Promise<T> {
    if (!this.softDelete) {
      throw new ValidationError(
        'Soft delete is not enabled for this repository'
      );
    }

    try {
      const updateData: Record<
        string,
        unknown
      > = {
        [this.softDeleteColumn]:
          new Date().toISOString(),
      };

      if (deletedBy) {
        updateData.deleted_by = deletedBy;
      }

      const {
        data,
        error,
      } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .is(this.softDeleteColumn, null)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(
            'Record not found or already deleted'
          );
        }

        throw handleDatabaseError(error);
      }

      if (!data) {
        throw new NotFoundError(
          'Record not found or already deleted'
        );
      }

      return data as unknown as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to soft delete record'
      );
    }
  }

  protected async restore(
    id: string
  ): Promise<T> {
    if (!this.softDelete) {
      throw new ValidationError(
        'Soft delete is not enabled for this repository'
      );
    }

    try {
      const updateData: Record<
        string,
        unknown
      > = {
        [this.softDeleteColumn]: null,
      };

      const {
        data,
        error,
      } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .not(
          this.softDeleteColumn,
          'is',
          null
        )
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(
            'Record not found or not deleted'
          );
        }

        throw handleDatabaseError(error);
      }

      if (!data) {
        throw new NotFoundError(
          'Record not found or not deleted'
        );
      }

      return data as unknown as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to restore record'
      );
    }
  }
}
