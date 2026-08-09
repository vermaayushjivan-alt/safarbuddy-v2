import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle>;

/**
 * Thrown when DATABASE_URL (or the pool it configures) is unavailable.
 * Kept distinct from generic errors so callers (e.g. requireRole /
 * getUserRoles) can catch it specifically and surface a safe,
 * non-crashing client message instead of an opaque failure.
 */
export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

let _db: DrizzleDb | null = null;

function getDbInstance(): DrizzleDb {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // STABILIZATION-01: this used to throw at module import time, which
    // crashed every route/action that transitively imports "@/db" with an
    // opaque module-evaluation failure. It's now thrown lazily, only when
    // the DB is actually queried, so callers can catch it and respond
    // safely instead of the whole app failing to load.
    console.error(
      "[db] DATABASE_URL is not set. Add it to your .env (see .env.example)."
    );
    throw new DatabaseConfigError(
      "DATABASE_URL is not set. Add it to your .env (see .env.example)."
    );
  }

  const pool = new Pool({
    connectionString,
    // Supabase's pooler (port 6543) requires SSL. `rejectUnauthorized: false`
    // is safe here because we're connecting via Supabase's trusted endpoint
    // over a connection string that already encodes host/user/password.
    ssl: { rejectUnauthorized: false },
  });

  _db = drizzle(pool, { schema });
  return _db;
}

// Lazily initialized on first actual use (any property access), not at
// import time — see getDbInstance() above.
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDbInstance() as object, prop, receiver);
  },
}) as DrizzleDb;

export { schema };
export * from "./schema";
