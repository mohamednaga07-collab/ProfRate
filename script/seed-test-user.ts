import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import { randomUUID } from "crypto";

// Hash password function (same as server/auth.ts)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const dbPath = path.join(process.cwd(), "dev.db");
const db = new Database(dbPath);

const testUsername = "test123";
const testPassword = "Password123";
const hashedPassword = hashPassword(testPassword);
const userId = randomUUID();

try {
  // Check if user already exists
  const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(testUsername);
  
  if (existing) {
    console.log("❌ User 'test123' already exists in database");
    console.log("   Username: test123");
    console.log("   Password: Password123");
    process.exit(0);
  }
  
  // Insert test user
  const stmt = db.prepare(`
    INSERT INTO users (id, username, password, email, firstName, lastName, role, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  
  stmt.run(userId, testUsername, hashedPassword, "test@example.com", "Test", "User", "student");
  
  console.log("╔══════════════════════════════════════╗");
  console.log("║   ✅ TEST USER CREATED!               ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("");
  console.log("📧 Username:  test123");
  console.log("🔐 Password:  Password123");
  console.log("");
  console.log("Use these credentials to test login!");
  
  process.exit(0);
} catch (error) {
  console.error("❌ Error creating test user:", error);
  process.exit(1);
}
