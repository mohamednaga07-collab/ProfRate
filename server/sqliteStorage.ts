import Database from "better-sqlite3";
import path from "path";

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
    username TEXT UNIQUE,
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
`);

// Seed sample doctors if table is empty
const doctorCount = db.prepare("SELECT COUNT(*) as count FROM doctors").get() as any;
if (doctorCount.count === 0) {
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

export const sqliteStorage = {
  async getDoctors() {
    try {
      const stmt = db.prepare("SELECT d.*, dr.* FROM doctors d LEFT JOIN doctor_ratings dr ON d.id = dr.doctorId");
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
      console.error("getDoctors error:", e);
      return [];
    }
  },

  async getDoctorById(id: number) {
    try {
      const stmt = db.prepare(
        "SELECT d.*, dr.* FROM doctors d LEFT JOIN doctor_ratings dr ON d.id = dr.doctorId WHERE d.id = ?"
      );
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
      console.error("getDoctorById error:", e);
      return null;
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
    } catch (e) {
      console.error("upsertUser error:", e);
    }
  },

  async createUser(user: any) {
    try {
      db.prepare(
        "INSERT INTO users (id, username, password, email, firstName, lastName, profileImageUrl, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(user.id, user.username || null, user.password || null, user.email || null, user.firstName || null, user.lastName || null, user.profileImageUrl || null, user.role || "student");
      return this.getUser(user.id);
    } catch (e) {
      console.error("createUser error:", e);
      throw e;
    }
  },

  async getUserByUsername(username: string) {
    try {
      const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
      return stmt.get(username) as any;
    } catch (e) {
      console.error("getUserByUsername error:", e);
      return null;
    }
  },

  async getUser(id: string) {
    try {
      const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
      return stmt.get(id) as any;
    } catch (e) {
      console.error("getUser error:", e);
      return null;
    }
  },
};
