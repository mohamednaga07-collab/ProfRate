import {
  type User,
  type UpsertUser,
  type Doctor,
  type InsertDoctor,
  type Review,
  type InsertReview,
  type DoctorRating,
  type DoctorWithRatings,
} from "@shared/schema";
import type { IStorage } from "./storage";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import path from "path";

/**
 * In-memory storage for development without a database.
 * Resets on server restart.
 */
export class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private usersByUsername = new Map<string, User>();
  private usersByEmail = new Map<string, User>();
  private usersByResetToken = new Map<string, User>();
  private doctors = new Map<number, Doctor>();
  private reviews = new Map<number, Review>();
  private doctorRatings = new Map<number, DoctorRating>();
  private nextDoctorId = 1;
  private nextReviewId = 1;

  constructor() {
    // Initialize from sqlite database if it exists
    this.initializeFromDatabase();
  }

  private initializeFromDatabase() {
    try {
      const dbPath = path.join(process.cwd(), "dev.db");
      const db = new Database(dbPath);
      const stmt = db.prepare("SELECT * FROM users");
      const rows = stmt.all() as any[];
      for (const row of rows) {
        const user: User = {
          id: row.id,
          username: row.username,
          password: row.password,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          profileImageUrl: row.profileImageUrl,
          role: row.role || "student",
          studentId: row.studentId,
          resetToken: row.resetToken,
          resetTokenExpiry: row.resetTokenExpiry ? new Date(row.resetTokenExpiry) : null,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        };
        this.users.set(user.id, user);
        if (user.username) {
          this.usersByUsername.set(user.username, user);
        }
        if (user.email) {
          this.usersByEmail.set(user.email, user);
        }
      }
      db.close();
    } catch (e) {
      // Database doesn't exist yet, that's fine
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.usersByUsername.get(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email);
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return this.usersByResetToken.get(token);
  }

  async updateUserResetToken(id: string, token: string, expiry: Date): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.resetToken = token;
      user.resetTokenExpiry = expiry;
      this.usersByResetToken.set(token, user);
    }
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.password = hashedPassword;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    // Update only provided fields
    if (updates.profileImageUrl !== undefined) user.profileImageUrl = updates.profileImageUrl;
    if (updates.firstName !== undefined) user.firstName = updates.firstName;
    if (updates.lastName !== undefined) user.lastName = updates.lastName;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.username !== undefined) user.username = updates.username;
    user.updatedAt = new Date();
    return user;
  }

  async clearResetToken(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user && user.resetToken) {
      this.usersByResetToken.delete(user.resetToken);
      user.resetToken = null;
      user.resetTokenExpiry = null;
    }
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const userId = (userData as any).id ?? randomUUID();
    const user: User = {
      id: userId,
      username: userData.username ?? null,
      password: userData.password ?? null,
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      role: userData.role ?? "student",
      studentId: userData.studentId ?? null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    if (user.username) {
      this.usersByUsername.set(user.username, user);
    }
    if (user.email) {
      this.usersByEmail.set(user.email, user);
    }
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const userId = (userData as any).id ?? randomUUID();
    const user: User = {
      id: userId,
      username: userData.username ?? null,
      password: userData.password ?? null,
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      role: userData.role ?? "student",
      studentId: userData.studentId ?? null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    if (user.username) {
      this.usersByUsername.set(user.username, user);
    }
    if (user.email) {
      this.usersByEmail.set(user.email, user);
    }
    return user;
  }

  // Doctor operations
  async getAllDoctors(): Promise<DoctorWithRatings[]> {
    const doctors = Array.from(this.doctors.values()).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return doctors.map((doctor) => ({
      ...doctor,
      ratings: this.doctorRatings.get(doctor.id) ?? null,
    }));
  }

  async getDoctor(id: number): Promise<DoctorWithRatings | undefined> {
    const doctor = this.doctors.get(id);
    if (!doctor) return undefined;

    return {
      ...doctor,
      ratings: this.doctorRatings.get(id) ?? null,
    };
  }

  async createDoctor(insertDoctor: InsertDoctor): Promise<Doctor> {
    const id = this.nextDoctorId++;
    const src = insertDoctor as any;
    const doctor: Doctor = {
      id,
      name: src.name,
      department: src.department,
      title: src.title ?? null,
      bio: src.bio ?? null,
      profileImageUrl: src.profileImageUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.doctors.set(id, doctor);
    return doctor;
  }

  async updateDoctor(id: number, data: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const doctor = this.doctors.get(id);
    if (!doctor) return undefined;

    const updated: Doctor = {
      ...doctor,
      ...data,
      id: doctor.id,
      createdAt: doctor.createdAt,
      updatedAt: new Date(),
    };
    this.doctors.set(id, updated);
    return updated;
  }

  async deleteDoctor(id: number): Promise<boolean> {
    return this.doctors.delete(id);
  }

  // Review operations
  async getReviewsByDoctor(doctorId: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter((r) => r.doctorId === doctorId)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.nextReviewId++;
    const src = insertReview as any;
    const review: Review = {
      id,
      doctorId: src.doctorId,
      teachingQuality: src.teachingQuality,
      availability: src.availability,
      communication: src.communication,
      knowledge: src.knowledge,
      fairness: src.fairness,
      comment: src.comment ?? null,
      createdAt: new Date(),
    };
    this.reviews.set(id, review);

    // Update doctor ratings
    await this.updateDoctorRatings(insertReview.doctorId);

    return review;
  }

  private async updateDoctorRatings(doctorId: number): Promise<void> {
    const doctorReviews = Array.from(this.reviews.values()).filter((r) => r.doctorId === doctorId);

    if (doctorReviews.length === 0) return;

    const avgTeachingQuality = doctorReviews.reduce((sum, r) => sum + r.teachingQuality, 0) / doctorReviews.length;
    const avgAvailability = doctorReviews.reduce((sum, r) => sum + r.availability, 0) / doctorReviews.length;
    const avgCommunication = doctorReviews.reduce((sum, r) => sum + r.communication, 0) / doctorReviews.length;
    const avgKnowledge = doctorReviews.reduce((sum, r) => sum + r.knowledge, 0) / doctorReviews.length;
    const avgFairness = doctorReviews.reduce((sum, r) => sum + r.fairness, 0) / doctorReviews.length;
    const overallRating = (avgTeachingQuality + avgAvailability + avgCommunication + avgKnowledge + avgFairness) / 5;

    const rating: DoctorRating = {
      id: this.doctorRatings.size + 1,
      doctorId,
      avgTeachingQuality,
      avgAvailability,
      avgCommunication,
      avgKnowledge,
      avgFairness,
      overallRating,
      totalReviews: doctorReviews.length,
      updatedAt: new Date(),
    };

    this.doctorRatings.set(doctorId, rating);
  }

  // Stats
  async getStats(): Promise<{ totalDoctors: number; totalReviews: number }> {
    return {
      totalDoctors: this.doctors.size,
      totalReviews: this.reviews.size,
    };
  }
}
