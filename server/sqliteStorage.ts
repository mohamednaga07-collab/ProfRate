
import Database from "better-sqlite3";
import path from "path";
import type { User } from "../shared/schema";

const dbPath = path.join(process.cwd(), "dev.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    title TEXT,
    bio TEXT,
    profileImageUrl TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS doctor_ratings (
    id INTEGER PRIMARY KEY,
    doctorId INTEGER NOT NULL UNIQUE,
    avgTeachingQuality REAL DEFAULT 0,
    avgAvailability REAL DEFAULT 0,
    avgCommunication REAL DEFAULT 0,
    avgKnowledge REAL DEFAULT 0,
    avgFairness REAL DEFAULT 0,
    overallRating REAL DEFAULT 0,
    totalReviews INTEGER DEFAULT 0,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id)
  );
  
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY,
    doctorId INTEGER NOT NULL,
    teachingQuality INTEGER NOT NULL,
    availability INTEGER NOT NULL,
    communication INTEGER NOT NULL,
    knowledge INTEGER NOT NULL,
    fairness INTEGER NOT NULL,
    comment TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id)
  );
  
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE COLLATE NOCASE,
    password TEXT,
    email TEXT UNIQUE,
    firstName TEXT,
    lastName TEXT,
    profileImageUrl TEXT,
    role TEXT DEFAULT 'student',
    studentId TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY,
    userId TEXT,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    type TEXT NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
  );
`);

// Ensure users table has password reset columns (online migration)
try {
  const cols = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasResetToken = cols.some((c) => c.name === "resetToken");
  const hasResetTokenExpiry = cols.some((c) => c.name === "resetTokenExpiry");
  const hasEmailVerified = cols.some((c) => c.name === "emailVerified");
  const hasVerificationToken = cols.some((c) => c.name === "verificationToken");

  if (!hasResetToken) {
    db.exec("ALTER TABLE users ADD COLUMN resetToken TEXT");
    console.log("✓ Added users.resetToken column");
  }
  if (!hasResetTokenExpiry) {
    db.exec("ALTER TABLE users ADD COLUMN resetTokenExpiry TEXT");
    console.log("✓ Added users.resetTokenExpiry column");
  }
  if (!hasEmailVerified) {
    db.exec("ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0");
    console.log("✓ Added users.emailVerified column");
  }
  if (!hasVerificationToken) {
    db.exec("ALTER TABLE users ADD COLUMN verificationToken TEXT");
    console.log("✓ Added users.verificationToken column");
  }
} catch (e) {
  console.error("Failed to ensure reset token columns:", e);
}

// Seed sample doctors if table is empty
let doctorCountSeed = db.prepare("SELECT COUNT(*) as count FROM doctors").get() as any;
if (doctorCountSeed.count === 0) {
  const doctors = [
    { name: "Dr. Smith", department: "Computer Science", title: "Professor" },
    { name: "Dr. Johnson", department: "Mathematics", title: "Associate Professor" },
    { name: "Dr. Williams", department: "Physics", title: "Professor" },
    { name: "Dr. Brown", department: "Chemistry", title: "Lecturer" },
    { name: "Dr. Jones", department: "Biology", title: "Professor" },
  ];

  const insertDoctor = db.prepare(
    "INSERT INTO doctors (name, department, title) VALUES (?, ?, ?)"
  );
  
  const insertRating = db.prepare(
    "INSERT INTO doctor_ratings (doctorId, avgTeachingQuality, avgAvailability, avgCommunication, avgKnowledge, avgFairness, overallRating, totalReviews) VALUES (?, 0, 0, 0, 0, 0, 0, 0)"
  );

  const transaction = db.transaction((doctors: any[]) => {
    for (const doc of doctors) {
      const result = insertDoctor.run(doc.name, doc.department, doc.title) as any;
      insertRating.run(result.lastInsertRowid);
    }
  });

  transaction(doctors);
  console.log("✓ Seeded sample doctors");
}


// Helper function to normalize user data from SQLite (convert 0/1 to boolean for emailVerified)
function normalizeUser(user: any): any {
  if (!user) return null;
  return {
    ...user,
    emailVerified: user.emailVerified === 1 ? true : false,
  };
}

export const sqliteStorage = {
// All methods are now inside the single export below. No duplicates or trailing code.

  async getReviewsByDoctor(doctorId: number) {
    try {
      const stmt = db.prepare("SELECT * FROM reviews WHERE doctorId = ? ORDER BY createdAt DESC");
      return stmt.all(doctorId) as any[];
    } catch (e) {
      console.error("getReviewsByDoctor error:", e);
      return [];
    }
  },

  async createDoctor(doctor: any): Promise<any> {
    try {
      const insertDoctor = db.prepare(
        "INSERT INTO doctors (name, department, title, bio, profileImageUrl) VALUES (?, ?, ?, ?, ?)"
      );
      const result = insertDoctor.run(
        doctor.name,
        doctor.department,
        doctor.title || null,
        doctor.bio || null,
        doctor.profileImageUrl || null
      ) as any;
      
      // Initialize ratings
      db.prepare(
        "INSERT INTO doctor_ratings (doctorId, avgTeachingQuality, avgAvailability, avgCommunication, avgKnowledge, avgFairness, overallRating, totalReviews) VALUES (?, 0, 0, 0, 0, 0, 0, 0)"
      ).run(result.lastInsertRowid);

      return this.getDoctor(result.lastInsertRowid);
    } catch (e) {
      console.error("createDoctor error:", e);
      throw e;
    }
  },

  async getDoctor(id: number): Promise<any | null> {
    try {
      const stmt = db.prepare("SELECT d.*, dr.* FROM doctors d LEFT JOIN doctor_ratings dr ON d.id = dr.doctorId WHERE d.id = ?");
      const row = stmt.get(id) as any;
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        department: row.department,
        title: row.title,
        bio: row.bio,
        profileImageUrl: row.profileImageUrl,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ratings: row.doctorId
          ? {
              id: row.doctorId,
              doctorId: row.doctorId,
              avgTeachingQuality: row.avgTeachingQuality || 0,
              avgAvailability: row.avgAvailability || 0,
              avgCommunication: row.avgCommunication || 0,
              avgKnowledge: row.avgKnowledge || 0,
              avgFairness: row.avgFairness || 0,
              overallRating: row.overallRating || 0,
              totalReviews: row.totalReviews || 0,
              updatedAt: row.updatedAt,
            }
          : null,
      };
    } catch (e) {
      console.error("getDoctor error:", e);
      return null;
    }
  },

  async updateDoctor(id: number, updates: any): Promise<any> {
    try {
      const fields = [];
      const values = [];
      
      if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
      if (updates.department !== undefined) { fields.push("department = ?"); values.push(updates.department); }
      if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title); }
      if (updates.bio !== undefined) { fields.push("bio = ?"); values.push(updates.bio); }
      if (updates.profileImageUrl !== undefined) { fields.push("profileImageUrl = ?"); values.push(updates.profileImageUrl); }
      
      if (fields.length === 0) return this.getDoctor(id);
      
      fields.push("updatedAt = CURRENT_TIMESTAMP");
      values.push(id);
      
      const stmt = db.prepare(`UPDATE doctors SET ${fields.join(", ")} WHERE id = ?`);
      stmt.run(...values);
      
      return this.getDoctor(id);
    } catch (e) {
      console.error("updateDoctor error:", e);
      throw e;
    }
  },

  async createReview(review: any) {
    try {
      const insertReview = db.prepare(
        "INSERT INTO reviews (doctorId, teachingQuality, availability, communication, knowledge, fairness, comment) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      const result = insertReview.run(
        review.doctorId,
        review.teachingQuality,
        review.availability,
        review.communication,
        review.knowledge,
        review.fairness,
        review.comment || null
      ) as any;

      // Update doctor rating
      const reviews = db.prepare("SELECT * FROM reviews WHERE doctorId = ?").all(review.doctorId) as any[];
      if (reviews.length > 0) {
        const avgTeachingQuality = reviews.reduce((sum, r) => sum + r.teachingQuality, 0) / reviews.length;
        const avgAvailability = reviews.reduce((sum, r) => sum + r.availability, 0) / reviews.length;
        const avgCommunication = reviews.reduce((sum, r) => sum + r.communication, 0) / reviews.length;
        const avgKnowledge = reviews.reduce((sum, r) => sum + r.knowledge, 0) / reviews.length;
        const avgFairness = reviews.reduce((sum, r) => sum + r.fairness, 0) / reviews.length;
        const overallRating = (avgTeachingQuality + avgAvailability + avgCommunication + avgKnowledge + avgFairness) / 5;

        db.prepare(
          "UPDATE doctor_ratings SET avgTeachingQuality = ?, avgAvailability = ?, avgCommunication = ?, avgKnowledge = ?, avgFairness = ?, overallRating = ?, totalReviews = ? WHERE doctorId = ?"
        ).run(
          avgTeachingQuality,
          avgAvailability,
          avgCommunication,
          avgKnowledge,
          avgFairness,
          overallRating,
          reviews.length,
          review.doctorId
        );
      }

      return { id: result.lastInsertRowid, ...review, createdAt: new Date().toISOString() };
    } catch (e) {
      console.error("createReview error:", e);
      throw e;
    }
  },

  async upsertUser(user: any) {
    try {
      db.prepare(
        "INSERT INTO users (id, username, password, email, firstName, lastName, profileImageUrl, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, firstName = excluded.firstName, lastName = excluded.lastName, profileImageUrl = excluded.profileImageUrl, role = excluded.role"
      ).run(user.id, user.username || null, user.password || null, user.email, user.firstName, user.lastName, user.profileImageUrl, user.role || "student");
      return this.getUser(user.id);
    } catch (e) {
      console.error("upsertUser error:", e);
      throw e;
    }
  },

  async createUser(user: any) {
    try {
      db.prepare(
        "INSERT INTO users (id, username, password, email, firstName, lastName, profileImageUrl, role, emailVerified, verificationToken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        user.id, 
        user.username || null, 
        user.password || null, 
        user.email || null, 
        user.firstName || null, 
        user.lastName || null, 
        user.profileImageUrl || null, 
        user.role || "student",
        user.emailVerified ? 1 : 0,  // SQLite uses 0/1 for booleans
        user.verificationToken || null
      );
      return this.getUser(user.id);
    } catch (e) {
      console.error("createUser error:", e);
      throw e;
    }
  },

  async getUserByUsername(username: string) {
    try {
      const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
      return normalizeUser(stmt.get(username) as any);
    } catch (e) {
      console.error("getUserByUsername error:", e);
      return null;
    }
  },

  async getUserByEmail(email: string) {
    try {
      const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
      return normalizeUser(stmt.get(email) as any);
    } catch (e) {
      console.error("getUserByEmail error:", e);
      return null;
    }
  },

  async getUser(id: string) {
    try {
      const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
      return normalizeUser(stmt.get(id) as any);
    } catch (e) {
      console.error("getUser error:", e);
      return null;
    }
  },

  async getUserByResetToken(token: string) {
    try {
      const stmt = db.prepare("SELECT * FROM users WHERE resetToken = ?");
      return normalizeUser(stmt.get(token) as any);
    } catch (e) {
      console.error("getUserByResetToken error:", e);
      return null;
    }
  },

  async updateUserResetToken(id: string, token: string, expiry: Date) {
    try {
      const stmt = db.prepare("UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?");
      stmt.run(token, expiry.toISOString(), id);
    } catch (e) {
      console.error("updateUserResetToken error:", e);
      throw e;
    }
  },

  async updateUserPassword(id: string, hashedPassword: string) {
    try {
      const stmt = db.prepare("UPDATE users SET password = ? WHERE id = ?");
      stmt.run(hashedPassword, id);
    } catch (e) {
      console.error("updateUserPassword error:", e);
      throw e;
    }
  },

  async updateUser(id: string, updates: Partial<User>): Promise<any> {
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      if (!user) {
        throw new Error("User not found");
      }
      
      const fields: string[] = [];
      const values: any[] = [];
      
      console.log(`[updateUser] Updating user ${id} with fields:`, Object.keys(updates));

      // Basic info
      if (updates.profileImageUrl !== undefined) {
        fields.push("profileImageUrl = ?");
        values.push(updates.profileImageUrl);
      }
      if (updates.firstName !== undefined) {
        fields.push("firstName = ?");
        values.push(updates.firstName);
      }
      if (updates.lastName !== undefined) {
        fields.push("lastName = ?");
        values.push(updates.lastName);
      }
      if (updates.email !== undefined) {
        fields.push("email = ?");
        values.push(updates.email);
      }
      if (updates.username !== undefined) {
        fields.push("username = ?");
        values.push(updates.username);
      }

      // Security & status fields (CRITICAL for re-registration)
      if (updates.password !== undefined) {
        fields.push("password = ?");
        values.push(updates.password);
      }
      if (updates.role !== undefined) {
        fields.push("role = ?");
        values.push(updates.role);
      }
      if (updates.emailVerified !== undefined) {
        // Convert boolean to number for SQLite if needed, but Drizzle/BetterSqlite usually handles partials. 
        // Current schema uses boolean. Better-sqlite3 maps 0/1. 
        // However, I should check how `db.prepare` handles booleans. 
        // Usually it works. I'll rely on the driver.
        fields.push("emailVerified = ?");
        values.push(updates.emailVerified ? 1 : 0);
      }
      if (updates.verificationToken !== undefined) {
        fields.push("verificationToken = ?");
        values.push(updates.verificationToken);
      }
      
      if (fields.length > 0) {
        fields.push("updatedAt = ?");
        values.push(new Date().toISOString());
        values.push(id);
        
        const stmt = db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`);
        stmt.run(...values);
      }
      
      const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      return normalizeUser(updated);
    } catch (e) {
      console.error("updateUser error:", e);
      throw e;
    }
  },

  async clearResetToken(id: string) {
    try {
      const stmt = db.prepare("UPDATE users SET resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?");
      stmt.run(id);
    } catch (e) {
      console.error("clearResetToken error:", e);
      throw e;
    }
  },

  async getUserByVerificationToken(token: string) {
    try {
      const stmt = db.prepare("SELECT * FROM users WHERE verificationToken = ?");
      return normalizeUser(stmt.get(token) as any);
    } catch (e) {
      console.error("getUserByVerificationToken error:", e);
      return null;
    }
  },

  async updateUserVerificationToken(id: string, token: string) {
    try {
      const stmt = db.prepare("UPDATE users SET verificationToken = ?, emailVerified = 0 WHERE id = ?");
      stmt.run(token, id);
    } catch (e) {
      console.error("updateUserVerificationToken error:", e);
      throw e;
    }
  },

  async verifyUserEmail(id: string) {
    try {
      const stmt = db.prepare("UPDATE users SET emailVerified = 1, verificationToken = NULL WHERE id = ?");
      stmt.run(id);
    } catch (e) {
      console.error("verifyUserEmail error:", e);
      throw e;
    }
  },

  // Admin methods
  async getAllUsers() {
    try {
      const stmt = db.prepare("SELECT * FROM users ORDER BY createdAt DESC");
      const users = stmt.all() as any[];
      return users.map(normalizeUser);
    } catch (e) {
      console.error("getAllUsers error:", e);
      return [];
    }
  },

  async updateUserRole(id: string, role: string) {
    try {
      const stmt = db.prepare("UPDATE users SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
      stmt.run(role, id);
    } catch (e) {
      console.error("updateUserRole error:", e);
      throw e;
    }
  },

  async deleteUser(id: string) {
    try {
      const stmt = db.prepare("DELETE FROM users WHERE id = ?");
      stmt.run(id);
    } catch (e) {
      console.error("deleteUser error:", e);
      throw e;
    }
  },

  async getAllReviews() {
    try {
      const stmt = db.prepare("SELECT * FROM reviews ORDER BY createdAt DESC");
      return stmt.all() as any[];
    } catch (e) {
      console.error("getAllReviews error:", e);
      return [];
    }
  },

  async deleteReview(id: number) {
    try {
      // Get review info before deleting
      const review = db.prepare("SELECT doctorId FROM reviews WHERE id = ?").get(id) as any;
      if (!review) return;
      
      // Delete the review
      db.prepare("DELETE FROM reviews WHERE id = ?").run(id);
      
      // Recalculate ratings for that doctor
      const reviews = db.prepare("SELECT * FROM reviews WHERE doctorId = ?").all(review.doctorId) as any[];
      
      if (reviews.length > 0) {
        const avgTeachingQuality = reviews.reduce((sum, r) => sum + r.teachingQuality, 0) / reviews.length;
        const avgAvailability = reviews.reduce((sum, r) => sum + r.availability, 0) / reviews.length;
        const avgCommunication = reviews.reduce((sum, r) => sum + r.communication, 0) / reviews.length;
        const avgKnowledge = reviews.reduce((sum, r) => sum + r.knowledge, 0) / reviews.length;
        const avgFairness = reviews.reduce((sum, r) => sum + r.fairness, 0) / reviews.length;
        const overallRating = (avgTeachingQuality + avgAvailability + avgCommunication + avgKnowledge + avgFairness) / 5;
        
        db.prepare(`
          UPDATE doctor_ratings 
          SET avgTeachingQuality = ?, avgAvailability = ?, avgCommunication = ?, 
              avgKnowledge = ?, avgFairness = ?, overallRating = ?, 
              totalReviews = ?, updatedAt = CURRENT_TIMESTAMP 
          WHERE doctorId = ?
        `).run(
          avgTeachingQuality,
          avgAvailability,
          avgCommunication,
          avgKnowledge,
          avgFairness,
          overallRating,
          reviews.length,
          review.doctorId
        );
      } else {
        // No reviews left, reset to 0
        db.prepare(`
          UPDATE doctor_ratings 
          SET avgTeachingQuality = 0, avgAvailability = 0, avgCommunication = 0, 
              avgKnowledge = 0, avgFairness = 0, overallRating = 0, 
              totalReviews = 0, updatedAt = CURRENT_TIMESTAMP 
          WHERE doctorId = ?
        `).run(review.doctorId);
      }
    } catch (e) {
      console.error("deleteReview error:", e);
      throw e;
    }
  },

  async deleteDoctor(id: number) {
    try {
      // Delete reviews first (cascade)
      db.prepare("DELETE FROM reviews WHERE doctorId = ?").run(id);
      // Delete ratings
      db.prepare("DELETE FROM doctor_ratings WHERE doctorId = ?").run(id);
      // Delete doctor
      db.prepare("DELETE FROM doctors WHERE id = ?").run(id);
      return true;
    } catch (e) {
      console.error("deleteDoctor error:", e);
      throw e;
    }
  },

  async logActivity(data: {
    userId: string;
    username: string;
    role: string;
    action: string;
    type: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      db.prepare(`
        INSERT INTO activity_logs (userId, username, role, action, type, ipAddress, userAgent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.userId,
        data.username,
        data.role,
        data.action,
        data.type,
        data.ipAddress || null,
        data.userAgent || null
      );
    } catch (e) {
      console.error("logActivity error:", e);
    }
  },

  async getActivityLogs(limit: number = 50) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM activity_logs 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      return stmt.all(limit);
    } catch (e) {
      console.error("getActivityLogs error:", e);
      return [];
    }
  },

  async getAllDoctors() {
    try {
      const stmt = db.prepare("SELECT d.*, dr.* FROM doctors d LEFT JOIN doctor_ratings dr ON d.id = dr.doctorId ORDER BY d.createdAt DESC");
      const rows = stmt.all() as any[];
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        department: row.department,
        title: row.title,
        bio: row.bio,
        profileImageUrl: row.profileImageUrl,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ratings: row.doctorId
          ? {
              id: row.doctorId,
              doctorId: row.doctorId,
              avgTeachingQuality: row.avgTeachingQuality || 0,
              avgAvailability: row.avgAvailability || 0,
              avgCommunication: row.avgCommunication || 0,
              avgKnowledge: row.avgKnowledge || 0,
              avgFairness: row.avgFairness || 0,
              overallRating: row.overallRating || 0,
              totalReviews: row.totalReviews || 0,
              updatedAt: row.updatedAt,
            }
          : null,
      }));
    } catch (e) {
      console.error("getAllDoctors error:", e);
      return [];
    }
  },

  async getStats() {
    try {
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const doctorCount = db.prepare("SELECT COUNT(*) as count FROM doctors").get() as any;
      const reviewCount = db.prepare("SELECT COUNT(*) as count FROM reviews").get() as any;
      
      // Active users (SQLite syntax for date)
      const activeUserCount = db.prepare(`
        SELECT COUNT(DISTINCT userId) as count 
        FROM activity_logs 
        WHERE type = 'login' 
        AND timestamp > date('now', '-30 days')
      `).get() as any;

      // Previous counts for growth
      const prevUserCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE createdAt < date('now', '-30 days')").get() as any;
      const prevDoctorCount = db.prepare("SELECT COUNT(*) as count FROM doctors WHERE createdAt < date('now', '-30 days')").get() as any;
      const prevReviewCount = db.prepare("SELECT COUNT(*) as count FROM reviews WHERE createdAt < date('now', '-30 days')").get() as any;

      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        totalUsers: userCount?.count || 0,
        totalDoctors: doctorCount?.count || 0,
        totalReviews: reviewCount?.count || 0,
        activeUsers: activeUserCount?.count || 0,
        usersGrowth: calculateGrowth(userCount?.count || 0, prevUserCount?.count || 0),
        doctorsGrowth: calculateGrowth(doctorCount?.count || 0, prevDoctorCount?.count || 0),
        reviewsGrowth: calculateGrowth(reviewCount?.count || 0, prevReviewCount?.count || 0),
      };
    } catch (e) {
      console.error("getStats error:", e);
      return { 
        totalUsers: 0, 
        totalDoctors: 0, 
        totalReviews: 0, 
        activeUsers: 0,
        usersGrowth: 0,
        doctorsGrowth: 0,
        reviewsGrowth: 0 
      };
    }
  },
};

// sqliteStorage implementation for Campus Ratings

