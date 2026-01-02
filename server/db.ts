import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { sqliteStorage } from "./sqliteStorage";

const { Pool } = pg;

let pool: pg.Pool | undefined;
let db: any;
let storage: any;

// In dev mode without DATABASE_URL, use SQLite storage
if (!process.env.DATABASE_URL && process.env.NODE_ENV === "development") {
  console.log("✓ Using SQLite storage for development");
  storage = sqliteStorage;
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  
  console.log("✓ Using PostgreSQL database");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
  storage = {
    upsertUser: async (user: any) => {
      // implement from storage.ts
    },
  };
}

export { pool, db, storage };
