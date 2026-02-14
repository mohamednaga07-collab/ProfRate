import path from "path";
import { createRequire } from "module";
import type { IStorage } from "./storage";
import type { User, InsertDoctor, InsertReview, Doctor, DoctorWithRatings, Review } from "@shared/schema";

// NOTE: Do NOT call createRequire at the top level.
// In production, esbuild outputs CJS where import.meta.url is undefined.
// We only need better-sqlite3 in development (when DATABASE_URL is not set),
// so we defer the require() call to the constructor.

export class SqliteStorage implements IStorage {
  private db: any;

  constructor() {
    // In CJS bundle (production), __filename is defined and import.meta.url is undefined.
    // In ESM dev mode, __filename is undefined and import.meta.url works.
    // Since this constructor only runs when DATABASE_URL is NOT set (local dev),
    // both paths are safe.
    const moduleUrl = typeof __filename !== 'undefined' ? __filename : import.meta.url;
    const localRequire = createRequire(moduleUrl);
    const Database = localRequire("better-sqlite3");

    const dbPath = path.join(process.cwd(), "dev.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.initializeSchema();
    this.seedData();
  }

  private initializeSchema() {
    this.db.exec(`
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

    try {
      const cols = this.db.prepare("PRAGMA table_info(users)").all() as any[];
      if (!cols.some((c: any) => c.name === "resetToken")) {
        this.db.exec("ALTER TABLE users ADD COLUMN resetToken TEXT");
      }
      if (!cols.some((c: any) => c.name === "resetTokenExpiry")) {
        this.db.exec("ALTER TABLE users ADD COLUMN resetTokenExpiry TEXT");
      }
      if (!cols.some((c: any) => c.name === "emailVerified")) {
        this.db.exec("ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0");
      }
      if (!cols.some((c: any) => c.name === "verificationToken")) {
        this.db.exec("ALTER TABLE users ADD COLUMN verificationToken TEXT");
      }
    } catch (e) {
      console.error("Failed to ensure reset token columns:", e);
    }
  }

  private seedData() {
    const doctorCountSeed = this.db.prepare("SELECT COUNT(*) as count FROM doctors").get() as any;
    if (doctorCountSeed.count === 0) {
      const doctors = [
        { name: "Dr. Smith", department: "Computer Science", title: "Professor" },
        { name: "Dr. Johnson", department: "Mathematics", title: "Associate Professor" },
        { name: "Dr. Williams", department: "Physics", title: "Professor" },
        { name: "Dr. Brown", department: "Chemistry", title: "Lecturer" },
        { name: "Dr. Jones", department: "Biology", title: "Professor" },
      ];
      const insertDoctor = this.db.prepare("INSERT INTO doctors (name, department, title) VALUES (?, ?, ?)");
      const insertRating = this.db.prepare("INSERT INTO doctor_ratings (doctorId, avgTeachingQuality, avgAvailability, avgCommunication, avgKnowledge, avgFairness, overallRating, totalReviews) VALUES (?, 0, 0, 0, 0, 0, 0, 0)");
      const transaction = this.db.transaction((docs: any[]) => {
        for (const doc of docs) {
          const result = insertDoctor.run(doc.name, doc.department, doc.title) as any;
          insertRating.run(result.lastInsertRowid);
        }
      });
      transaction(doctors);
      console.log("✓ Seeded sample doctors");
    }
  }

  private normalizeUser(user: any): any {
    if (!user) return null;
    return { ...user, emailVerified: user.emailVerified === 1 };
  }

  async getReviewsByDoctor(doctorId: number): Promise<Review[]> {
    try {
      return this.db.prepare("SELECT * FROM reviews WHERE doctorId = ? ORDER BY createdAt DESC").all(doctorId) as any[];
    } catch (e) { console.error("getReviewsByDoctor error:", e); return []; }
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const result = this.db.prepare("INSERT INTO doctors (name, department, title, bio, profileImageUrl) VALUES (?, ?, ?, ?, ?)").run(doctor.name, doctor.department, doctor.title || null, doctor.bio || null, doctor.profileImageUrl || null) as any;
    this.db.prepare("INSERT INTO doctor_ratings (doctorId, avgTeachingQuality, avgAvailability, avgCommunication, avgKnowledge, avgFairness, overallRating, totalReviews) VALUES (?, 0, 0, 0, 0, 0, 0, 0)").run(result.lastInsertRowid);
    return this.getDoctor(Number(result.lastInsertRowid)) as Promise<Doctor>;
  }

  async getDoctor(id: number): Promise<DoctorWithRatings | undefined> {
    const row = this.db.prepare("SELECT d.*, dr.avgTeachingQuality, dr.avgAvailability, dr.avgCommunication, dr.avgKnowledge, dr.avgFairness, dr.overallRating, dr.totalReviews FROM doctors d LEFT JOIN doctor_ratings dr ON d.id = dr.doctorId WHERE d.id = ?").get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id, name: row.name, department: row.department, title: row.title, bio: row.bio,
      profileImageUrl: row.profileImageUrl, createdAt: row.createdAt, updatedAt: row.updatedAt,
      ratings: row.avgTeachingQuality !== null ? {
        id: row.id, doctorId: row.id,
        avgTeachingQuality: row.avgTeachingQuality || 0, avgAvailability: row.avgAvailability || 0,
        avgCommunication: row.avgCommunication || 0, avgKnowledge: row.avgKnowledge || 0,
        avgFairness: row.avgFairness || 0, overallRating: row.overallRating || 0,
        totalReviews: row.totalReviews || 0, updatedAt: row.updatedAt,
      } : null,
    };
  }

  async updateDoctor(id: number, updates: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const fields: string[] = []; const values: any[] = [];
    if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
    if (updates.department !== undefined) { fields.push("department = ?"); values.push(updates.department); }
    if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title); }
    if (updates.bio !== undefined) { fields.push("bio = ?"); values.push(updates.bio); }
    if (updates.profileImageUrl !== undefined) { fields.push("profileImageUrl = ?"); values.push(updates.profileImageUrl); }
    if (fields.length === 0) return this.getDoctor(id) as Promise<Doctor>;
    fields.push("updatedAt = CURRENT_TIMESTAMP"); values.push(id);
    this.db.prepare(`UPDATE doctors SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return this.getDoctor(id) as Promise<Doctor>;
  }

  async deleteDoctor(id: number): Promise<boolean> {
    this.db.prepare("DELETE FROM reviews WHERE doctorId = ?").run(id);
    this.db.prepare("DELETE FROM doctor_ratings WHERE doctorId = ?").run(id);
    this.db.prepare("DELETE FROM doctors WHERE id = ?").run(id);
    return true;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const result = this.db.prepare("INSERT INTO reviews (doctorId, teachingQuality, availability, communication, knowledge, fairness, comment) VALUES (?, ?, ?, ?, ?, ?, ?)").run(review.doctorId, review.teachingQuality, review.availability, review.communication, review.knowledge, review.fairness, review.comment || null) as any;
    const reviews = this.db.prepare("SELECT * FROM reviews WHERE doctorId = ?").all(review.doctorId) as any[];
    if (reviews.length > 0) {
      const avg = (field: string) => reviews.reduce((s: number, r: any) => s + r[field], 0) / reviews.length;
      const a = avg("teachingQuality"), b = avg("availability"), c = avg("communication"), d = avg("knowledge"), e = avg("fairness");
      this.db.prepare("UPDATE doctor_ratings SET avgTeachingQuality=?, avgAvailability=?, avgCommunication=?, avgKnowledge=?, avgFairness=?, overallRating=?, totalReviews=? WHERE doctorId=?").run(a, b, c, d, e, (a+b+c+d+e)/5, reviews.length, review.doctorId);
    }
    return { id: Number(result.lastInsertRowid), ...review, createdAt: new Date() } as Review;
  }

  async getAllReviews(): Promise<Review[]> {
    try { return this.db.prepare("SELECT * FROM reviews ORDER BY createdAt DESC").all() as Review[]; }
    catch (e) { console.error("getAllReviews error:", e); return []; }
  }

  async deleteReview(id: number): Promise<void> {
    const review = this.db.prepare("SELECT doctorId FROM reviews WHERE id = ?").get(id) as any;
    if (!review) return;
    this.db.prepare("DELETE FROM reviews WHERE id = ?").run(id);
    const reviews = this.db.prepare("SELECT * FROM reviews WHERE doctorId = ?").all(review.doctorId) as any[];
    if (reviews.length > 0) {
      const avg = (field: string) => reviews.reduce((s: number, r: any) => s + r[field], 0) / reviews.length;
      const a = avg("teachingQuality"), b = avg("availability"), c = avg("communication"), d = avg("knowledge"), e = avg("fairness");
      this.db.prepare("UPDATE doctor_ratings SET avgTeachingQuality=?, avgAvailability=?, avgCommunication=?, avgKnowledge=?, avgFairness=?, overallRating=?, totalReviews=?, updatedAt=CURRENT_TIMESTAMP WHERE doctorId=?").run(a, b, c, d, e, (a+b+c+d+e)/5, reviews.length, review.doctorId);
    } else {
      this.db.prepare("UPDATE doctor_ratings SET avgTeachingQuality=0, avgAvailability=0, avgCommunication=0, avgKnowledge=0, avgFairness=0, overallRating=0, totalReviews=0, updatedAt=CURRENT_TIMESTAMP WHERE doctorId=?").run(review.doctorId);
    }
  }

  async upsertUser(user: any): Promise<User> {
    this.db.prepare("INSERT INTO users (id, username, password, email, firstName, lastName, profileImageUrl, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email=excluded.email, firstName=excluded.firstName, lastName=excluded.lastName, profileImageUrl=excluded.profileImageUrl, role=excluded.role").run(user.id, user.username||null, user.password||null, user.email, user.firstName, user.lastName, user.profileImageUrl, user.role||"student");
    return this.getUser(user.id) as Promise<User>;
  }

  async createUser(user: any): Promise<User> {
    this.db.prepare("INSERT INTO users (id, username, password, email, firstName, lastName, profileImageUrl, role, emailVerified, verificationToken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(user.id, user.username||null, user.password||null, user.email||null, user.firstName||null, user.lastName||null, user.profileImageUrl||null, user.role||"student", user.emailVerified?1:0, user.verificationToken||null);
    return this.getUser(user.id) as Promise<User>;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.normalizeUser(this.db.prepare("SELECT * FROM users WHERE username = ?").get(username));
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.normalizeUser(this.db.prepare("SELECT * FROM users WHERE email = ?").get(email));
  }
  async getUser(id: string): Promise<User | undefined> {
    return this.normalizeUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  }
  async getUserByResetToken(token: string): Promise<User | undefined> {
    return this.normalizeUser(this.db.prepare("SELECT * FROM users WHERE resetToken = ?").get(token));
  }
  async updateUserResetToken(id: string, token: string, expiry: Date): Promise<void> {
    this.db.prepare("UPDATE users SET resetToken=?, resetTokenExpiry=? WHERE id=?").run(token, expiry.toISOString(), id);
  }
  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    this.db.prepare("UPDATE users SET password=? WHERE id=?").run(hashedPassword, id);
  }
  async clearResetToken(id: string): Promise<void> {
    this.db.prepare("UPDATE users SET resetToken=NULL, resetTokenExpiry=NULL WHERE id=?").run(id);
  }
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return this.normalizeUser(this.db.prepare("SELECT * FROM users WHERE verificationToken = ?").get(token));
  }
  async updateUserVerificationToken(id: string, token: string): Promise<void> {
    this.db.prepare("UPDATE users SET verificationToken=?, emailVerified=0 WHERE id=?").run(token, id);
  }
  async verifyUserEmail(id: string): Promise<void> {
    this.db.prepare("UPDATE users SET emailVerified=1, verificationToken=NULL WHERE id=?").run(id);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    if (!user) throw new Error("User not found");
    const fields: string[] = []; const values: any[] = [];
    if (updates.profileImageUrl !== undefined) { fields.push("profileImageUrl=?"); values.push(updates.profileImageUrl); }
    if (updates.firstName !== undefined) { fields.push("firstName=?"); values.push(updates.firstName); }
    if (updates.lastName !== undefined) { fields.push("lastName=?"); values.push(updates.lastName); }
    if (updates.email !== undefined) { fields.push("email=?"); values.push(updates.email); }
    if (updates.username !== undefined) { fields.push("username=?"); values.push(updates.username); }
    if (updates.password !== undefined) { fields.push("password=?"); values.push(updates.password); }
    if (updates.role !== undefined) { fields.push("role=?"); values.push(updates.role); }
    if (updates.emailVerified !== undefined) { fields.push("emailVerified=?"); values.push(updates.emailVerified?1:0); }
    if (updates.verificationToken !== undefined) { fields.push("verificationToken=?"); values.push(updates.verificationToken); }
    if (fields.length > 0) {
      fields.push("updatedAt=?"); values.push(new Date().toISOString()); values.push(id);
      this.db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id=?`).run(...values);
    }
    return this.normalizeUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  }

  async getAllUsers(): Promise<User[]> {
    return (this.db.prepare("SELECT * FROM users ORDER BY createdAt DESC").all() as any[]).map(u => this.normalizeUser(u));
  }
  async updateUserRole(id: string, role: string): Promise<void> {
    this.db.prepare("UPDATE users SET role=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?").run(role, id);
  }
  async deleteUser(id: string): Promise<void> {
    this.db.prepare("DELETE FROM users WHERE id=?").run(id);
  }

  async getAllDoctors(): Promise<DoctorWithRatings[]> {
    const rows = this.db.prepare("SELECT d.*, dr.avgTeachingQuality, dr.avgAvailability, dr.avgCommunication, dr.avgKnowledge, dr.avgFairness, dr.overallRating, dr.totalReviews FROM doctors d LEFT JOIN doctor_ratings dr ON d.id = dr.doctorId ORDER BY d.createdAt DESC").all() as any[];
    return rows.map((row: any) => ({
      id: row.id, name: row.name, department: row.department, title: row.title, bio: row.bio,
      profileImageUrl: row.profileImageUrl, createdAt: row.createdAt, updatedAt: row.updatedAt,
      ratings: row.avgTeachingQuality !== null ? {
        id: row.id, doctorId: row.id,
        avgTeachingQuality: row.avgTeachingQuality||0, avgAvailability: row.avgAvailability||0,
        avgCommunication: row.avgCommunication||0, avgKnowledge: row.avgKnowledge||0,
        avgFairness: row.avgFairness||0, overallRating: row.overallRating||0,
        totalReviews: row.totalReviews||0, updatedAt: row.updatedAt,
      } : null,
    }));
  }

  async logActivity(data: { userId: string; username: string; role: string; action: string; type: string; ipAddress?: string; userAgent?: string; }): Promise<void> {
    try {
      this.db.prepare("INSERT INTO activity_logs (userId, username, role, action, type, ipAddress, userAgent) VALUES (?, ?, ?, ?, ?, ?, ?)").run(data.userId, data.username, data.role, data.action, data.type, data.ipAddress||null, data.userAgent||null);
    } catch (e) { console.error("logActivity error:", e); }
  }

  async getActivityLogs(limit: number = 50): Promise<any[]> {
    try { return this.db.prepare("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?").all(limit); }
    catch (e) { console.error("getActivityLogs error:", e); return []; }
  }

  async getStats() {
    try {
      const userCount = this.db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const doctorCount = this.db.prepare("SELECT COUNT(*) as count FROM doctors").get() as any;
      const reviewCount = this.db.prepare("SELECT COUNT(*) as count FROM reviews").get() as any;
      const activeUserCount = this.db.prepare("SELECT COUNT(DISTINCT userId) as count FROM activity_logs WHERE type = 'login' AND timestamp > date('now', '-30 days')").get() as any;
      const prevUserCount = this.db.prepare("SELECT COUNT(*) as count FROM users WHERE createdAt < date('now', '-30 days')").get() as any;
      const prevDoctorCount = this.db.prepare("SELECT COUNT(*) as count FROM doctors WHERE createdAt < date('now', '-30 days')").get() as any;
      const prevReviewCount = this.db.prepare("SELECT COUNT(*) as count FROM reviews WHERE createdAt < date('now', '-30 days')").get() as any;
      const growth = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
      return {
        totalUsers: Number(userCount?.count||0), totalDoctors: Number(doctorCount?.count||0),
        totalReviews: Number(reviewCount?.count||0), activeUsers: Number(activeUserCount?.count||0),
        usersGrowth: growth(userCount?.count||0, prevUserCount?.count||0),
        doctorsGrowth: growth(doctorCount?.count||0, prevDoctorCount?.count||0),
        reviewsGrowth: growth(reviewCount?.count||0, prevReviewCount?.count||0),
      };
    } catch (e) {
      console.error("getStats error:", e);
      return { totalUsers:0, totalDoctors:0, totalReviews:0, activeUsers:0, usersGrowth:0, doctorsGrowth:0, reviewsGrowth:0 };
    }
  }
}
