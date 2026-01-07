import {
  users,
  doctors,
  reviews,
  doctorRatings,
  type User,
  type UpsertUser,
  type Doctor,
  type InsertDoctor,
  type Review,
  type InsertReview,
  type DoctorRating,
  type DoctorWithRatings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { MemoryStorage } from "./memoryStorage";
import { sqliteStorage } from "./sqliteStorage";

export interface IStorage {
  // User operations (mandatory for Antigravity Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUserResetToken(id: string, token: string, expiry: Date): Promise<void>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  clearResetToken(id: string): Promise<void>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<void>;
  deleteUser(id: string): Promise<void>;

  // Doctor operations
  getAllDoctors(): Promise<DoctorWithRatings[]>;
  getDoctor(id: number): Promise<DoctorWithRatings | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: number, doctor: Partial<InsertDoctor>): Promise<Doctor | undefined>;
  deleteDoctor(id: number): Promise<boolean>;

  // Review operations
  getReviewsByDoctor(doctorId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Stats
  getStats(): Promise<{ totalDoctors: number; totalReviews: number }>;
  
  // Activity logging (optional - may not be implemented in all storage types)
  logActivity?(data: {
    userId: string;
    username: string;
    role: string;
    action: string;
    type: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;
  
  getActivityLogs?(limit?: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }

  async updateUserResetToken(id: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(users.id, id));
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }

  async clearResetToken(id: string): Promise<void> {
    await db.update(users).set({ resetToken: null, resetTokenExpiry: null }).where(eq(users.id, id));
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    await db.update(users).set({ role }).where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Doctor operations
  async getAllDoctors(): Promise<DoctorWithRatings[]> {
    const allDoctors = await db.select().from(doctors).orderBy(desc(doctors.createdAt));
    const allRatings = await db.select().from(doctorRatings);

    return allDoctors.map((doctor: any) => ({
      ...doctor,
      ratings: allRatings.find((r: any) => r.doctorId === doctor.id) ?? null,
    }));
  }

  async getDoctor(id: number): Promise<DoctorWithRatings | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));
    if (!doctor) return undefined;

    const [rating] = await db.select().from(doctorRatings).where(eq(doctorRatings.doctorId, id));

    return {
      ...doctor,
      ratings: rating ?? null,
    };
  }

  async createDoctor(insertDoctor: InsertDoctor): Promise<Doctor> {
    const [doctor] = await db.insert(doctors).values(insertDoctor).returning();
    return doctor;
  }

  async updateDoctor(id: number, data: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const [doctor] = await db
      .update(doctors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(doctors.id, id))
      .returning();
    return doctor;
  }

  async deleteDoctor(id: number): Promise<boolean> {
    const result = await db.delete(doctors).where(eq(doctors.id, id));
    return true;
  }

  // Review operations
  async getReviewsByDoctor(doctorId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.doctorId, doctorId)).orderBy(desc(reviews.createdAt));
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(insertReview).returning();

    // Update doctor ratings
    await this.updateDoctorRatings(insertReview.doctorId);

    return review;
  }

  private async updateDoctorRatings(doctorId: number): Promise<void> {
    const doctorReviews = await db.select().from(reviews).where(eq(reviews.doctorId, doctorId));

    if (doctorReviews.length === 0) return;

    const avgTeachingQuality = doctorReviews.reduce((sum: number, r: any) => sum + r.teachingQuality, 0) / doctorReviews.length;
    const avgAvailability = doctorReviews.reduce((sum: number, r: any) => sum + r.availability, 0) / doctorReviews.length;
    const avgCommunication = doctorReviews.reduce((sum: number, r: any) => sum + r.communication, 0) / doctorReviews.length;
    const avgKnowledge = doctorReviews.reduce((sum: number, r: any) => sum + r.knowledge, 0) / doctorReviews.length;
    const avgFairness = doctorReviews.reduce((sum: number, r: any) => sum + r.fairness, 0) / doctorReviews.length;
    const overallRating = (avgTeachingQuality + avgAvailability + avgCommunication + avgKnowledge + avgFairness) / 5;

    await db
      .insert(doctorRatings)
      .values({
        doctorId,
        avgTeachingQuality,
        avgAvailability,
        avgCommunication,
        avgKnowledge,
        avgFairness,
        overallRating,
        totalReviews: doctorReviews.length,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: doctorRatings.doctorId,
        set: {
          avgTeachingQuality,
          avgAvailability,
          avgCommunication,
          avgKnowledge,
          avgFairness,
          overallRating,
          totalReviews: doctorReviews.length,
          updatedAt: new Date(),
        },
      });
  }

  // Stats
  async getStats(): Promise<{ totalDoctors: number; totalReviews: number }> {
    const [doctorCount] = await db.select({ count: sql<number>`count(*)` }).from(doctors);
    const [reviewCount] = await db.select({ count: sql<number>`count(*)` }).from(reviews);

    return {
      totalDoctors: Number(doctorCount?.count ?? 0),
      totalReviews: Number(reviewCount?.count ?? 0),
    };
  }
}

export const storage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : sqliteStorage;
