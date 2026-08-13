import {
  DatabaseError,
  NotFoundError,
  ValidationError,
  handleDatabaseError,
} from "@/lib/errors/database.errors";

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
} from "./types";

export abstract class BaseRepository
  T extends DatabaseRecord
> {
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
    this.softDelete =
      config.softDelete ?? false;
    this.softDeleteColumn =
      config.softDeleteColumn ?? "deleted_at";
  }

  // -------------------------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------------------------

  protected applyFilters<Q>(
    query: Q,
    filters: FilterOptions[]
  ): Q {
    let result = query;

    filters.forEach((filter) => {
      const typedQuery = result as {
        eq: (
          column: string,
          value: unknown
        ) => Q;

        neq: (
          column: string,
          value: unknown
        ) => Q;

        gt: (
          column: string,
          value: unknown
        ) => Q;

        gte: (
          column: string,
          value: unknown
        ) => Q;

        lt: (
          column: string,
          value: unknown
        ) => Q;

        lte: (
          column: string,
          value: unknown
        ) => Q;

        like: (
          column: string,
          value: unknown
        ) => Q;

        ilike: (
          column: string,
          value: unknown
        ) => Q;

        in: (
          column: string,
          value: unknown
        ) => Q;

        is: (
          column: string,
          value: unknown
        ) => Q;
      };

      switch (filter.operator) {
        case "eq":
          result = typedQuery.eq(
            filter.column,
            filter.value
          );
          break;

        case "neq":
          result = typedQuery.neq(
            filter.column,
            filter.value
          );
          break;

        case "gt":
          result = typedQuery.gt(
            filter.column,
            filter.value
          );
          break;

        case "gte":
          result = typedQuery.gte(
            filter.column,
            filter.value
          );
          break;

        case "lt":
          result = typedQuery.lt(
            filter.column,
            filter.value
          );
          break;

        case "lte":
          result = typedQuery.lte(
            filter.column,
            filter.value
          );
          break;

        case "like":
          result = typedQuery.like(
            filter.column,
            filter.value
          );
          break;

        case "ilike":
          result = typedQuery.ilike(
            filter.column,
            filter.value
          );
          break;

        case "in":
          result = typedQuery.in(
            filter.column,
            filter.value
          );
          break;

        case "is":
          result = typedQuery.is(
            filter.column,
            filter.value
          );
          break;
      }
    });

    return result;
  }

  // -------------------------------------------------------------------------
  // SORT
  // -------------------------------------------------------------------------

  protected applySort<Q>(
    query: Q,
    sort: SortOptions
  ): Q {
    const typedQuery = query as {
      order: (
        column: string,
        options: {
          ascending: boolean;
        }
      ) => Q;
    };

    return typedQuery.order(
      sort.column,
      {
        ascending:
          sort.ascending ?? true,
      }
    );
  }

  // -------------------------------------------------------------------------
  // PAGINATION
  // -------------------------------------------------------------------------

  protected applyPagination<Q>(
    query: Q,
    pagination: PaginationOptions
  ): Q {
    const from =
      (pagination.page - 1) *
      pagination.limit;

    const to =
      from +
      pagination.limit -
      1;

    const typedQuery = query as {
      range: (
        from: number,
        to: number
      ) => Q;
    };

    return typedQuery.range(
      from,
      to
    );
  }

  // -------------------------------------------------------------------------
  // FIND BY ID
  // -------------------------------------------------------------------------

  protected async findById(
    id: string,
    columns: string = "*"
  ): Promise<T | null> {
    try {
      if (!id || !id.trim()) {
        return null;
      }

      const queryBuilder =
        this.supabase
          .from(this.tableName)
          .select(columns)
          .eq("id", id);

      const query = this.softDelete
        ? queryBuilder.is(
            this.softDeleteColumn,
            null
          )
        : queryBuilder;

      const {
        data,
        error,
      } = await query.single();

      if (error) {
        if (
          error.code ===
            "PGRST116" ||
          error.code === "22P02"
        ) {
          return null;
        }

        throw handleDatabaseError(
          error
        );
      }

      return data
        ? (data as unknown as T)
        : null;
    } catch (error) {
      if (
        error instanceof DatabaseError
      ) {
        throw error;
      }

      console.error(
        `[${this.tableName}] findById failed`,
        error
      );

      throw new DatabaseError(
        "Failed to find record by ID"
      );
    }
  }

  // -------------------------------------------------------------------------
  // FIND ONE
  // -------------------------------------------------------------------------

  protected async findOne(
    filters: FilterOptions[],
    columns: string = "*"
  ): Promise<T | null> {
    try {
      let queryBuilder =
        this.supabase
          .from(this.tableName)
          .select(columns);

      queryBuilder =
        this.applyFilters(
          queryBuilder,
          filters
        );

      const query = this.softDelete
        ? queryBuilder.is(
            this.softDeleteColumn,
            null
          )
        : queryBuilder;

      const {
        data,
        error,
      } = await query.single();

      if (error) {
        if (
          error.code ===
            "PGRST116" ||
          error.code === "22P02"
        ) {
          return null;
        }

        throw handleDatabaseError(
          error
        );
      }

      return data
        ? (data as unknown as T)
        : null;
    } catch (error) {
      if (
        error instanceof DatabaseError
      ) {
        throw error;
      }

      console.error(
        `[${this.tableName}] findOne failed`,
        error
      );

      throw new DatabaseError(
        "Failed to find record"
      );
    }
  }

  // -------------------------------------------------------------------------
  // FIND MANY
  // -------------------------------------------------------------------------

  protected async findMany(
    options: SelectOptions = {}
  ): Promise<T[]> {
    try {
      const columns =
        options.columns ?? "*";

      let queryBuilder =
        this.supabase
          .from(this.tableName)
          .select(columns);

      if (this.softDelete) {
        queryBuilder =
          queryBuilder.is(
            this.softDeleteColumn,
            null
          );
      }

      if (options.filters) {
        queryBuilder =
          this.applyFilters(
            queryBuilder,
            options.filters
          );
      }

      if (options.sort) {
        queryBuilder =
          this.applySort(
            queryBuilder,
            options.sort
          );
      }

      if (options.pagination) {
        queryBuilder =
          this.applyPagination(
            queryBuilder,
            options.pagination
          );
      }

      const {
        data,
        error,
      } = await queryBuilder;

      if (error) {
        throw handleDatabaseError(
          error
        );
      }

      return data
        ? (data as unknown as T[])
        : [];
    } catch (error) {
      if (
        error instanceof DatabaseError
      ) {
        throw error;
      }

      console.error(
        `[${this.tableName}] findMany failed`,
        error
      );

      throw new DatabaseError(
        "Failed to find records"
      );
    }
  }

  // -------------------------------------------------------------------------
  // FIND WITH PAGINATION
  // -------------------------------------------------------------------------

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

      let countQuery =
        this.supabase
          .from(this.tableName)
          .select("*", {
            count: "exact",
            head: true,
          });

      if (this.softDelete) {
        countQuery =
          countQuery.is(
            this.softDeleteColumn,
            null
          );
      }

      if (options.filters) {
        countQuery =
          this.applyFilters(
            countQuery,
            options.filters
          );
      }

      const {
        count,
        error: countError,
      } = await countQuery;

      if (countError) {
        // DIAGNOSTIC (Part 2 investigation): handleDatabaseError() converts
        // countError into a DatabaseError, which the outer catch below
        // rethrows via the `instanceof DatabaseError` branch WITHOUT ever
        // reaching the console.error further down — so failures on this
        // specific query (the count-only HEAD request) were previously
        // logged with no table name at all. Logging here closes that gap.
        console.error(
          `[${this.tableName}] findWithPagination count query failed`,
          countError
        );

        throw handleDatabaseError(
          countError
        );
      }

      const total =
        count ?? 0;

      const data =
        await this.findMany({
          ...selectOptions,
          pagination,
        });

      const totalPages =
        Math.ceil(
          total /
            pagination.limit
        );

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext:
          pagination.page 
          totalPages,
        hasPrev:
          pagination.page > 1,
      };
    } catch (error) {
      if (
        error instanceof DatabaseError
      ) {
        throw error;
      }

      console.error(
        `[${this.tableName}] findWithPagination failed`,
        error
      );

      throw new DatabaseError(
        "Failed to find paginated records"
      );
    }
  }

  // -------------------------------------------------------------------------
  // CREATE
  // -------------------------------------------------------------------------

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
          data as Record
            string,
            unknown
          >
        )
        .select()
        .single();

      if (error) {
        /*
         * IMPORTANT:
         * Do not replace this with a generic DatabaseError.
         * handleDatabaseError preserves the actual PostgreSQL code/details.
         */
        throw handleDatabaseError(
          error
        );
      }

      if (!result) {
        throw new DatabaseError(
          "Failed to create record - no data returned"
        );
      }

      return result as unknown as T;
    } catch (error) {
      if (
        error instanceof DatabaseError
      ) {
        throw error;
      }

      console.error(
        `[${this.tableName}] create failed`,
        error
      );

      throw new DatabaseError(
        "Failed to create record"
      );
    }
  }

  // -------------------------------------------------------------------------
  // CREATE MANY
  // -------------------------------------------------------------------------

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
          data as Record
            string,
            unknown
          >[]
        )
        .select();

      if (error) {
        throw handleDatabaseError(
          error
        );
      }

      return result
        ? (result as unknown as T[])
        : [];
    } catch (error) {
      if (
        error instanceof DatabaseError
      ) {
        throw error;
      }

      console.error(
        `[${this.tableName}] createMany failed`,
        error
      );

      throw new DatabaseError(
        "Failed to create records"
      );
    }
  }

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  protected async update(
    id: string,
    data: UpdateData<T>
  ): Promise<T> {
    try {
      if (!id || !id.trim()) {
        throw new ValidationError(
          "Record ID is required"
        );
      }

      let queryBuilder =
        this.supabase
          .from(this.tableName)
          .update(
            data as Record
              string,
              unknown
            >
          )
          .eq("id", id);

      if (this.softDelete) {
        queryBuilder =
          queryBuilder.is(
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
        if (
          error.code ===
          "PGRST116"
        ) {
          throw new NotFoundError(
            "Record not found"
          );
        }

        throw handleDatabaseError(
          error
        );
      }

      if (!result) {
        throw new NotFoundError(
          "Record not found"
        );
      }

      return result as unknown as T;
    } catch (error) {
      if (
        error instanceof DatabaseError
      ) {
        throw error;
      }

      console.error(
        `[${this.tableName}] update failed`,
        error
      );

      throw new DatabaseError(
        "Failed to update record"
      );
    }
  }

  // -------------------------------------------------------------------------
  // UPDATE MANY
  // -------------------------------------------------------------------------

  protected async updateMany(
    filters: FilterOptions[],
    data: UpdateData<T>
  ): Promise<T[]> {
    try {
      let queryBuilder =
        this.supabase
