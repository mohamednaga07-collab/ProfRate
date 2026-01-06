import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { sqliteStorage } from "./sqliteStorage";

const { Pool } = pg;

let pool: pg.Pool | undefined;
let db: any;
let storage: any;

// Use SQLite storage if DATABASE_URL is missing, even in production (with warning)
if (!process.env.DATABASE_URL) {
  console.log("⚠️  Warning: DATABASE_URL not set. Falling back to SQLite storage.");
  storage = sqliteStorage;
  db = null; // Don't initialize PostgreSQL at all
  pool = undefined;
} else {
  console.log("✓ Using PostgreSQL database");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
  storage = null; // Will use DatabaseStorage from storage.ts
}

export { pool, db, storage };
