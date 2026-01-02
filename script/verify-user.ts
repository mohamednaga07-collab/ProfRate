import Database from "better-sqlite3";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const db = new Database("dev.db");

// Check if user exists
const user = db.prepare("SELECT * FROM users WHERE username = 'test123'").get();

if (user) {
  console.log("✅ Test user exists in database:");
  console.log(`   ID: ${user.id}`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   First Name: ${user.firstName}`);
  console.log(`   Last Name: ${user.lastName}`);
  console.log(`   Role: ${user.role}`);
  
  // Verify password hash
  const testPassword = "Password123";
  const expectedHash = hashPassword(testPassword);
  console.log("");
  console.log("🔑 Password verification:");
  console.log(`   Stored hash: ${user.password}`);
  console.log(`   Expected hash: ${expectedHash}`);
  console.log(`   Match: ${user.password === expectedHash ? "✅ YES" : "❌ NO"}`);
} else {
  console.log("❌ Test user NOT found in database");
  console.log("   Please run: npx ts-node script/seed-test-user.ts");
}

// Show all users
console.log("");
console.log("📋 All users in database:");
const allUsers = db.prepare("SELECT id, username, email, firstName, lastName FROM users").all();
if (allUsers.length === 0) {
  console.log("   (none)");
} else {
  allUsers.forEach((u: any) => {
    console.log(`   - ${u.username} (${u.firstName} ${u.lastName})`);
  });
}
