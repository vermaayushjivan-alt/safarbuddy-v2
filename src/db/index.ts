import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
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

let warnedUnverifiedSsl = false;

function buildSslConfig(): PoolConfig["ssl"] {
  // The PEM may be pasted into Vercel with literal "\n" sequences.
  const ca = process.env.DATABASE_SSL_CA?.trim().replace(/\\n/g, "\n");

  if (ca) {
    return { ca, rejectUnauthorized: true };
  }

  if (process.env.NODE_ENV === "production" && !warnedUnverifiedSsl) {
    warnedUnverifiedSsl = true;
    console.warn(
      "[db] DATABASE_SSL_CA is not set: the database connection is encrypted but the server certificate is not verified."
    );
  }

  return { rejectUnauthorized: false };
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

  // GOLIVE-11 — TLS to the database.
  // DATABASE_SSL_CA unset  -> encrypted but NOT certificate-verified (the old
  //                           behaviour, so nothing breaks on deploy).
  // DATABASE_SSL_CA set    -> encrypted AND the server certificate is verified
  //                           against that CA (download "SSL Certificate" from
  //                           Supabase > Project Settings > Database).
  // To roll back, delete the env var and redeploy.
  const pool = new Pool({
    connectionString,
    ssl: buildSslConfig(),
    // Serverless: keep few, short-lived connections (Supabase pooler limits).
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
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
