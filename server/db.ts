import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let pool: pg.Pool | undefined;
let db: any;

if (!process.env.DATABASE_URL) {
  console.log("⚠️  Warning: DATABASE_URL not set. storage will fall back to SQLite.");
  db = null;
  pool = undefined;
} else {
  console.log("✓ Using PostgreSQL database");
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
  });
  db = drizzle(pool, { schema });
}

export { pool, db };
