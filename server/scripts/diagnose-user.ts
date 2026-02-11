
import { storage } from "../storage";

async function diagnose() {
  console.log("🔍 Starting User Diagnosis (via Storage)...");
  
  const targetUsername = "Student"; // Case insensitive target
  const targetEmail = "mohamednaga07@gmail.com";

  console.log(`Checking for username: "${targetUsername}" or email: "${targetEmail}"`);

  // 1. Get ALL users to see what's there
  try {
      const allUsers = await storage.getAllUsers();
      console.log(`📊 Total Users in DB: ${allUsers.length}`);

      if (allUsers.length === 0) {
        console.log("❌ Database is EMPTY. (Ephemeral wipe confirmed)");
        process.exit(0);
      }

      for (const u of allUsers) {
        console.log("------------------------------------------------");
        console.log(`👤 ID: ${u.id}`);
        console.log(`   Username: ${u.username}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Role: ${u.role}`);
        console.log(`   Verified: ${u.emailVerified}`); 
        // Note: Password field might be hidden by storage layer if it sanitizes returns
        // But DatabaseStorage/sqliteStorage usually returns row as is.
        console.log(`   Pwd Hash: ${u.password ? u.password.substring(0, 15) + "..." : "NULL"}`);
        console.log(`   Created: ${u.createdAt}`);
        
        if (u.username?.toLowerCase() === targetUsername.toLowerCase()) {
          console.log("   ✅ MATCHES TARGET USERNAME");
        }
      }
      console.log("------------------------------------------------");
  } catch (e) {
      console.error("Storage error:", e);
  }
}

diagnose().catch(console.error).finally(() => process.exit());
