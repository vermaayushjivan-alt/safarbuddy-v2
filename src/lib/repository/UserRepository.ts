import { BaseRepository } from './BaseRepository';
import { FilterOptions, PaginationOptions, PaginationResult, SupabaseClientType } from './types';
import { User, CreateUserInput, UpdateUserInput, UserSearchFilters, UserStatus } from '@/types/database.types';
import { NotFoundError, ConflictError } from '@/lib/errors/database.errors';

export class UserRepository extends BaseRepository<User> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'users',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.findById(id);
  }

  /**
   * Find user by auth user ID
   */
  async findByAuthUserId(authUserId: string): Promise<User | null> {
    const filters: FilterOptions[] = [
      { column: 'auth_user_id', operator: 'eq', value: authUserId },
    ];

    return this.findOne(filters);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const filters: FilterOptions[] = [
      { column: 'email', operator: 'eq', value: email },
    ];

    return this.findOne(filters);
  }

  /**
   * Find user by phone
   */
  async findByPhone(phone: string): Promise<User | null> {
    const filters: FilterOptions[] = [
      { column: 'phone', operator: 'eq', value: phone },
    ];

    return this.findOne(filters);
  }

  /**
   * Check if user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const filters: FilterOptions[] = [
      { column: 'email', operator: 'eq', value: email },
    ];

    return this.exists(filters);
  }

  /**
   * Check if user exists by phone
   */
  async existsByPhone(phone: string): Promise<boolean> {
    const filters: FilterOptions[] = [
      { column: 'phone', operator: 'eq', value: phone },
    ];

    return this.exists(filters);
  }

  /**
   * Check if user exists by auth user ID
   */
  async existsByAuthUserId(authUserId: string): Promise<boolean> {
    const filters: FilterOptions[] = [
      { column: 'auth_user_id', operator: 'eq', value: authUserId },
    ];

    return this.exists(filters);
  }

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    // Check if email already exists
    const existingEmail = await this.existsByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('User with this email already exists', {
        field: 'email',
        value: input.email,
      });
    }

    // Check if auth_user_id already exists
    const existingAuthUser = await this.existsByAuthUserId(input.auth_user_id);
    if (existingAuthUser) {
      throw new ConflictError('User with this auth ID already exists', {
        field: 'auth_user_id',
        value: input.auth_user_id,
      });
    }

    // Check if phone exists (if provided)
    if (input.phone) {
      const existingPhone = await this.existsByPhone(input.phone);
      if (existingPhone) {
        throw new ConflictError('User with this phone already exists', {
          field: 'phone',
          value: input.phone,
        });
      }
    }

    const userData: Partial<User> = {
      auth_user_id: input.auth_user_id,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone ?? null,
      status: input.status ?? 'pending',
      is_verified: input.is_verified ?? false,
      created_by: input.created_by ?? null,
    };

    return this.create(userData);
  }

  /**
   * Update user details
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    // Check if email is being changed and already exists
    if (input.email) {
      const existingUser = await this.findByEmail(input.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictError('User with this email already exists', {
          field: 'email',
          value: input.email,
        });
      }
    }

    // Check if phone is being changed and already exists
    if (input.phone) {
      const existingUser = await this.findByPhone(input.phone);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictError('User with this phone already exists', {
          field: 'phone',
          value: input.phone,
        });
      }
    }

    const updateData: Partial<User> = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    return this.update(id, updateData);
  }

  /**
   * Update user verification status
   */
  async updateVerification(id: string, isVerified: boolean, updatedBy?: string): Promise<User> {
    const updateData: Partial<User> = {
      is_verified: isVerified,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    };

    return this.update(id, updateData);
  }

  /**
   * Update user status
   */
  async updateStatus(id: string, status: UserStatus, updatedBy?: string): Promise<User> {
    const updateData: Partial<User> = {
      status,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    };

    return this.update(id, updateData);
  }

  /**
   * Soft delete a user
   */
  async softDeleteUser(id: string, deletedBy?: string): Promise<User> {
    return this.softDeleteById(id, deletedBy);
  }

  /**
   * Restore a soft-deleted user
   */
  async restoreUser(id: string): Promise<User> {
    return this.restore(id);
  }

  /**
   * List users with pagination
   */
  async listUsers(
    pagination: PaginationOptions,
    filters?: UserSearchFilters
  ): Promise<PaginationResult<User>> {
    const filterOptions: FilterOptions[] = [];

    if (filters) {
      if (filters.email) {
        filterOptions.push({
          column: 'email',
          operator: 'ilike',
          value: `%${filters.email}%`,
        });
      }

      if (filters.phone) {
        filterOptions.push({
          column: 'phone',
          operator: 'ilike',
          value: `%${filters.phone}%`,
        });
      }

      if (filters.status) {
        filterOptions.push({
          column: 'status',
          operator: 'eq',
          value: filters.status,
        });
      }

      if (filters.is_verified !== undefined) {
        filterOptions.push({
          column: 'is_verified',
          operator: 'eq',
          value: filters.is_verified,
        });
      }
    }

    return this.findWithPagination({
      filters: filterOptions.length > 0 ? filterOptions : undefined,
      sort: { column: 'created_at', ascending: false },
      pagination,
    });
  }

  /**
   * Count total users
   */
  async countUsers(filters?: UserSearchFilters): Promise<number> {
    const filterOptions: FilterOptions[] = [];

    if (filters) {
      if (filters.status) {
        filterOptions.push({
          column: 'status',
          operator: 'eq',
          value: filters.status,
        });
      }

      if (filters.is_verified !== undefined) {
        filterOptions.push({
          column: 'is_verified',
          operator: 'eq',
          value: filters.is_verified,
        });
      }
    }

    return this.count(filterOptions.length > 0 ? filterOptions : undefined);
  }

  /**
   * Search users by name or email
   */
  async searchUsers(
    searchTerm: string,
    pagination: PaginationOptions
  ): Promise<PaginationResult<User>> {
    try {
      const { page, limit } = pagination;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count for search
      const { count } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);

      const total = count ?? 0;

      // Get paginated search results
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .is('deleted_at', null)
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      const totalPages = Math.ceil(total / limit);

      return {
        data: (data as User[]) ?? [],
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      throw new NotFoundError('Failed to search users');
    }
  }

  /**
   * Get users by status
   */
  async getUsersByStatus(
    status: UserStatus,
    pagination: PaginationOptions
  ): Promise<PaginationResult<User>> {
    const filters: FilterOptions[] = [
      { column: 'status', operator: 'eq', value: status },
    ];

    return this.findWithPagination({
      filters,
      sort: { column: 'created_at', ascending: false },
      pagination,
    });
  }

  /**
   * Get verified users
   */
  async getVerifiedUsers(pagination: PaginationOptions): Promise<PaginationResult<User>> {
    const filters: FilterOptions[] = [
      { column: 'is_verified', operator: 'eq', value: true },
    ];

    return this.findWithPagination({
      filters,
      sort: { column: 'created_at', ascending: false },
      pagination,
    });
  }

  /**
   * Get unverified users
   */
  async getUnverifiedUsers(pagination: PaginationOptions): Promise<PaginationResult<User>> {
    const filters: FilterOptions[] = [
      { column: 'is_verified', operator: 'eq', value: false },
    ];

    return this.findWithPagination({
      filters,
      sort: { column: 'created_at', ascending: false },
      pagination,
    });
  }

  /**
   * Get recently created users
   */
  async getRecentUsers(limit: number = 10): Promise<User[]> {
    return this.findMany({
      sort: { column: 'created_at', ascending: false },
      pagination: { page: 1, limit },
    });
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateStatus(userIds: string[], status: UserStatus, updatedBy?: string): Promise<User[]> {
    const filters: FilterOptions[] = [
      { column: 'id', operator: 'in', value: userIds },
    ];

    const updateData: Partial<User> = {
      status,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    };

    return this.updateMany(filters, updateData);
  }

  /**
   * Get user statistics by status
   */
  async getUserStatsByStatus(): Promise<Record<UserStatus, number>> {
    const statuses: UserStatus[] = ['active', 'inactive', 'suspended', 'pending'];
    const stats: Record<UserStatus, number> = {
      active: 0,
      inactive: 0,
      suspended: 0,
      pending: 0,
    };

    for (const status of statuses) {
      const filters: FilterOptions[] = [
        { column: 'status', operator: 'eq', value: status },
      ];
      stats[status] = await this.count(filters);
    }

    return stats;
  }
}
