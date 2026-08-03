import { eq, and, isNull, desc } from 'drizzle-orm';
import { BaseRepository } from '@/lib/repositories/base.repository';
import { users } from '@/lib/db/schema';
import { User, InsertUser, UpdateUser } from '@/lib/db/types';
import { NotFoundError, ValidationError } from '@/lib/repositories/errors';

export class UserRepository extends BaseRepository {
  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deleted_at)))
      .limit(1);

    return result[0] || null;
  }

  async findByAuthUserId(authUserId: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.auth_user_id, authUserId), isNull(users.deleted_at)))
      .limit(1);

    return result[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();

    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, normalizedEmail), isNull(users.deleted_at)))
      .limit(1);

    return result[0] || null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const normalizedPhone = phone.trim();

    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.phone, normalizedPhone), isNull(users.deleted_at)))
      .limit(1);

    return result[0] || null;
  }

  async findAll(): Promise<User[]> {
    return await this.db
      .select()
      .from(users)
      .where(isNull(users.deleted_at))
      .orderBy(desc(users.created_at));
  }

  async create(data: InsertUser): Promise<User> {
    if (!data.auth_user_id) {
      throw new ValidationError('auth_user_id is required');
    }

    if (!data.email) {
      throw new ValidationError('email is required');
    }

    if (!data.full_name) {
      throw new ValidationError('full_name is required');
    }

    const existingByAuthId = await this.findByAuthUserId(data.auth_user_id);
    if (existingByAuthId) {
      throw new ValidationError('User with this auth_user_id already exists');
    }

    const existingByEmail = await this.findByEmail(data.email);
    if (existingByEmail) {
      throw new ValidationError('User with this email already exists');
    }

    const normalizedData: InsertUser = {
      ...data,
      email: data.email.toLowerCase().trim(),
      full_name: data.full_name.trim(),
      phone: data.phone?.trim() || null,
      status: data.status || 'active',
      is_verified: data.is_verified ?? false,
    };

    const result = await this.db
      .insert(users)
      .values(normalizedData)
      .returning();

    if (!result[0]) {
      throw new Error('Failed to create user');
    }

    return result[0];
  }

  async update(id: string, data: UpdateUser): Promise<User> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    if (data.email) {
      const normalizedEmail = data.email.toLowerCase().trim();
      const userWithEmail = await this.findByEmail(normalizedEmail);
      if (userWithEmail && userWithEmail.id !== id) {
        throw new ValidationError('User with this email already exists');
      }
    }

    if (data.phone) {
      const normalizedPhone = data.phone.trim();
      const userWithPhone = await this.findByPhone(normalizedPhone);
      if (userWithPhone && userWithPhone.id !== id) {
        throw new ValidationError('User with this phone already exists');
      }
    }

    const normalizedData: UpdateUser = {
      ...data,
      email: data.email ? data.email.toLowerCase().trim() : undefined,
      full_name: data.full_name ? data.full_name.trim() : undefined,
      phone: data.phone ? data.phone.trim() : undefined,
      updated_at: new Date(),
    };

    const result = await this.db
      .update(users)
      .set(normalizedData)
      .where(eq(users.id, id))
      .returning();

    if (!result[0]) {
      throw new Error('Failed to update user');
    }

    return result[0];
  }

  async delete(id: string, deletedBy: string): Promise<User> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    const result = await this.db
      .update(users)
      .set({
        deleted_at: new Date(),
        updated_by: deletedBy,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!result[0]) {
      throw new Error('Failed to delete user');
    }

    return result[0];
  }

  async verifyEmail(id: string): Promise<User> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    const result = await this.db
      .update(users)
      .set({
        is_verified: true,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!result[0]) {
      throw new Error('Failed to verify user');
    }

    return result[0];
  }

  async updateStatus(
    id: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<User> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    const result = await this.db
      .update(users)
      .set({
        status,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!result[0]) {
      throw new Error('Failed to update user status');
    }

    return result[0];
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.findById(id);
    return user !== null;
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  async phoneExists(phone: string): Promise<boolean> {
    const user = await this.findByPhone(phone);
    return user !== null;
  }
}
