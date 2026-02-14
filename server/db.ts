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

  // Ensure sslmode=require is in the connection string itself
  // This is the most reliable way to ensure SSL for external Render URLs
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString.includes('sslmode=')) {
    connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }

  try {
    const dbUrl = new URL(connectionString);
    console.log(`✓ Connecting to database at: ${dbUrl.hostname}`);
  } catch (e) {
    console.log("✓ Connecting to database (URL parsing failed)");
  }

  pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,                       // Low pool size for Render free tier
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });
  
  // Prevent unhandled pool errors from crashing the app
  pool.on('error', (err) => {
    console.error('⚠️ Unexpected database pool error:', err.message);
  });
  
  // Test connection
  pool.connect().then((client) => {
    console.log("✅ Database connected successfully");
    client.release();
  }).catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });
  
  db = drizzle(pool, { schema });
}

export { pool, db };
