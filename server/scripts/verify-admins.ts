
import { storage } from "../storage";

async function verifyAdmins() {
  const users = await storage.getAllUsers();
  console.log("Current users:");
  users.forEach(u => {
    console.log(`- ${u.username} (Role: ${u.role}, Verified: ${u.emailVerified}, ID: ${u.id})`);
  });

  const admins = users.filter(u => u.role === 'admin');
  
  if (admins.length === 0) {
    console.log("\nNo admin users found.");
    return;
  }

  console.log("\nVerifying admin users...");
  for (const admin of admins) {
    if (!admin.emailVerified) {
      await storage.verifyUserEmail(admin.id);
      console.log(`✅ User ${admin.username} is now verified.`);
    } else {
      console.log(`ℹ️ User ${admin.username} was already verified.`);
    }
  }
}

verifyAdmins().catch(console.error);
