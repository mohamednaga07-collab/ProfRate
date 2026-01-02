const crypto = require("crypto");

// Simple SHA-256 hash function (same as server/auth.ts)
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Test credentials
const testUsername = "test123";
const testPassword = "Password123";
const testEmail = "test@example.com";

const hashedPassword = hashPassword(testPassword);

console.log("╔═══════════════════════════════════════╗");
console.log("║    TEST USER CREDENTIALS               ║");
console.log("╚═══════════════════════════════════════╝");
console.log("");
console.log("📧 Username:        " + testUsername);
console.log("🔐 Password:        " + testPassword);
console.log("📬 Email:           " + testEmail);
console.log("");
console.log("═════════════════════════════════════════");
console.log("🔑 Password Hash:   " + hashedPassword);
console.log("═════════════════════════════════════════");
console.log("");
console.log("SQL INSERT statement (for manual database insertion):");
console.log("");
console.log(`INSERT INTO users (username, password, email, first_name, last_name, created_at)
VALUES ('${testUsername}', '${hashedPassword}', '${testEmail}', 'Test', 'User', datetime('now'));`);
console.log("");
console.log("✅ Use these credentials to test login in the app");
