import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, "dev.db");
const db = new Database(dbPath);

async function deleteUserByEmail(email) {
  try {
    // Check if user exists
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    
    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      return;
    }
    
    console.log(`Found user:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Email Verified: ${user.emailVerified}`);
    
    // Delete the user
    const result = db.prepare("DELETE FROM users WHERE email = ?").run(email);
    
    if (result.changes > 0) {
      console.log(`\n✅ Successfully deleted user with email: ${email}`);
    } else {
      console.log(`\n❌ Failed to delete user`);
    }
    
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || "mohamednaga07@gmail.com";

console.log(`\n🗑️  Deleting user with email: ${email}\n`);
deleteUserByEmail(email);
