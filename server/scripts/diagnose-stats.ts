
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const db = new Database(dbPath);

console.log("--- DEBUGGING ADMIN STATS ---");

try {
  console.log("Checking User Count...");
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  console.log("User Count Result:", userCount);

  console.log("Checking Doctor Count...");
  const doctorCount = db.prepare("SELECT COUNT(*) as count FROM doctors").get();
  console.log("Doctor Count Result:", doctorCount);

  console.log("Checking Review Count...");
  const reviewCount = db.prepare("SELECT COUNT(*) as count FROM reviews").get();
  console.log("Review Count Result:", reviewCount);

  console.log("Checking Active Users...");
  const activeUserCount = db.prepare(`
    SELECT COUNT(DISTINCT userId) as count 
    FROM activity_logs 
    WHERE type = 'login' 
    AND timestamp > date('now', '-30 days')
  `).get();
  console.log("Active Users Result:", activeUserCount);

  console.log("Checking Prev User Count...");
  const prevUserCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE createdAt < date('now', '-30 days')").get();
  console.log("Prev User Count Result:", prevUserCount);

} catch (err) {
  console.error("FAILED DURING DIAGNOSIS:", err);
}

db.close();
console.log("--- DIAGNOSIS COMPLETE ---");
