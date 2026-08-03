import { db } from '@/lib/db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@/lib/db/schema';

export abstract class BaseRepository {
  protected db: PostgresJsDatabase<typeof schema>;

  constructor() {
    this.db = db;
  }

  /**
   * Execute operations within a transaction
   */
  protected async transaction<T>(
    callback: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>
  ): Promise<T> {
    return await this.db.transaction(callback);
  }

  /**
   * Handle repository errors
   */
  protected handleError(error: unknown, operation: string): never {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`${operation} failed: ${String(error)}`);
  }
}
