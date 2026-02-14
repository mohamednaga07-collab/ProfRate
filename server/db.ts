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

  // Parse connection URL into explicit parameters to avoid URL parsing issues
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(process.env.DATABASE_URL);
    console.log(`✓ Connecting to database at: ${parsedUrl.hostname}:${parsedUrl.port || 5432}`);
  } catch (e) {
    console.error("❌ Failed to parse DATABASE_URL");
    throw e;
  }

  // Use explicit connection parameters for maximum compatibility
  // The 'servername' in SSL is critical for SNI (Server Name Indication)
  // which Render's proxy needs to route SSL connections correctly
  pool = new Pool({
    host: parsedUrl.hostname,
    port: parseInt(parsedUrl.port || '5432'),
    database: parsedUrl.pathname.slice(1),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    ssl: {
      rejectUnauthorized: false,
      servername: parsedUrl.hostname,  // SNI for Render's proxy
    },
    max: 2,                           // Minimal pool for free tier
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });

  // Detailed pool event logging for debugging
  pool.on('error', (err) => {
    console.error('⚠️ Pool error:', err.message);
  });

  // Test connection
  pool.connect().then((client) => {
    console.log("✅ Database connected successfully");
    client.release();
  }).catch((err) => {
    console.error("❌ Database connection failed:", err.message);
    console.error("   Error code:", (err as any).code);
  });

  db = drizzle(pool, { schema });
}

export { pool, db };
