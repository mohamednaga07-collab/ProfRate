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

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(process.env.DATABASE_URL);
    console.log(`✓ Connecting to database at: ${parsedUrl.hostname}`);
  } catch (e) {
    console.error("❌ Failed to parse DATABASE_URL");
    throw e;
  }

  // Internal Render URLs (no .render.com) don't need SSL
  // External URLs (.render.com, .neon.tech) require SSL
  const isExternal = parsedUrl.hostname.includes('.render.com') || parsedUrl.hostname.includes('.neon.tech');
  const sslConfig = isExternal ? { rejectUnauthorized: false, servername: parsedUrl.hostname } : false;

  console.log(`✓ SSL: ${isExternal ? 'enabled (external)' : 'disabled (internal)'}`);

  pool = new Pool({
    host: parsedUrl.hostname,
    port: parseInt(parsedUrl.port || '5432'),
    database: parsedUrl.pathname.slice(1),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    ssl: sslConfig,
    max: 3,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('⚠️ Pool error:', err.message);
  });

  pool.connect().then((client) => {
    console.log("✅ Database connected successfully");
    client.release();
  }).catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });

  db = drizzle(pool, { schema });
}

export { pool, db };
