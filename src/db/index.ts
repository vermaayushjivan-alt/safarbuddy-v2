import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
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

export const db = drizzle(pool, { schema });
export { schema };
export * from "./schema";
