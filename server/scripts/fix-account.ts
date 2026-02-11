
import { storage } from "../storage";
import { hashPassword } from "../auth";

async function fixAccount() {
  console.log("🛠️ Starting Account Fix...");

  const targetUsername = "Student";
  const normalizedUsername = "student";
  const newRawPassword = "Student123!";
  
  try {
    const newHash = await hashPassword(newRawPassword);
    
    // 1. Try to find the user
    let user = await storage.getUserByUsername(targetUsername);
    if (!user) {
        console.log(`User '${targetUsername}' not found. Trying '${normalizedUsername}'...`);
        user = await storage.getUserByUsername(normalizedUsername);
    }
    
    if (!user) {
        console.error("❌ User NOT FOUND. They must register properly.");
        process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.username} (ID: ${user.id})`);
    
    // 2. Force Update
    // We use the ID to be precise
    await storage.updateUser(user.id, {
        username: normalizedUsername, // Enforce lowercase
        password: newHash,
        emailVerified: true // Ensure they are verified
    });
    
    console.log("✅ User updated successfully!");
    console.log(`   Username: ${normalizedUsername}`);
    console.log(`   Password: ${newRawPassword}`);
    console.log(`   Verified: true`);
    
  } catch (error) {
    console.error("Fix failed:", error);
  }
}

fixAccount().then(() => process.exit());
