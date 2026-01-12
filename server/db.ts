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
  // Force SSL in production, or if the URL looks like a cloud URL
  const isProduction = process.env.NODE_ENV === "production";
  const useSsl = isProduction || process.env.DATABASE_URL.includes("render.com") || process.env.DATABASE_URL.includes("neon.tech");
  
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000, // Increased to 10s for slower cold starts
  });
  
  // Test connection immediately to catch errors early
  pool.connect((err, client, release) => {
    if (err) {
      console.error("❌ Database connection failed:", err.message);
    } else {
      console.log("✅ Database connected successfully");
      release();
    }
  });
  
  db = drizzle(pool, { schema });
}

export { pool, db };
