import {
  users,
  doctors,
  reviews,
  doctorRatings,
  activityLogs,
  teacherPortfolios,
  studentEnrollments,
  type User,
  type UpsertUser,
  type Doctor,
  type InsertDoctor,
  type Review,
  type InsertReview,
  type DoctorRating,
  type DoctorWithRatings,
  type TeacherPortfolio,
  type InsertTeacherPortfolio,
  type StudentEnrollment,
  type InsertStudentEnrollment,
  messages,
  type Message,
  type InsertMessage,
  teacherClasses,
  type TeacherClass,
  type InsertTeacherClass,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { MemoryStorage } from "./memoryStorage";
import { SqliteStorage } from "./sqliteStorage";

export interface IStorage {
  // User operations (mandatory for Antigravity Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUserResetToken(id: string, token: string, expiry: Date): Promise<void>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  clearResetToken(id: string): Promise<void>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  updateUserVerificationToken(id: string, token: string): Promise<void>;
  verifyUserEmail(id: string): Promise<void>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<void>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Doctor operations
  getAllDoctors(): Promise<DoctorWithRatings[]>;
  getDoctor(id: number): Promise<DoctorWithRatings | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: number, doctor: Partial<InsertDoctor>): Promise<Doctor | undefined>;
  deleteDoctor(id: number): Promise<boolean>;

  // Review operations
  getReviewsByDoctor(doctorId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  getAllReviews(): Promise<Review[]>;

  // Stats
  getStats(): Promise<{
    totalUsers: number;
    totalDoctors: number;
    totalReviews: number;
    activeUsers: number;
    usersGrowth: number;
    doctorsGrowth: number;
    reviewsGrowth: number;
  }>;

  // Activity logging
  logActivity(data: {
    userId: string;
    username: string;
    role: string;
    action: string;
    type: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;

  getActivityLogs(limit?: number): Promise<any[]>;

  // Review deletion
  deleteReview(id: number): Promise<void>;

  // User update
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Teacher portfolio
  getTeacherPortfolio(userId: string): Promise<TeacherPortfolio | undefined>;
  upsertTeacherPortfolio(data: InsertTeacherPortfolio): Promise<TeacherPortfolio>;

  // Teacher classes
  getTeacherClasses(filters: { userId: string }): Promise<TeacherClass[]>;
  createTeacherClass(data: InsertTeacherClass): Promise<TeacherClass>;
  updateTeacherClass(id: number, data: Partial<InsertTeacherClass>): Promise<TeacherClass>;
  deleteTeacherClass(id: number): Promise<void>;

  // Student enrollments
  getStudentEnrollments(userId: string): Promise<StudentEnrollment[]>;
  createStudentEnrollment(data: InsertStudentEnrollment): Promise<StudentEnrollment>;
  deleteStudentEnrollment(id: number, userId: string): Promise<void>;

  // Student activity/achievements
  getStudentActivityLogs(userId: string): Promise<any[]>;

  // Messages and Notifications
  getMessages(receiverId: string | null): Promise<Message[]>;
  getSentMessages(senderId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;
  markMessageRead(id: number): Promise<void>;
  deleteMessage(id: number): Promise<void>;

  // Session management (single-session enforcement)
  setUserActiveSession(userId: string, sessionId: string | null): Promise<void>;

  // Review ownership
  getReviewByReviewerAndDoctor(reviewerId: string, doctorId: number): Promise<Review | undefined>;
  updateReview(id: number, data: Partial<Review>): Promise<Review>;
  getReviewsByReviewer(reviewerId: string): Promise<Review[]>;
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

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user;
  }

  async updateUserVerificationToken(id: string, token: string): Promise<void> {
    await db.update(users).set({ verificationToken: token, emailVerified: false }).where(eq(users.id, id));
  }

  async verifyUserEmail(id: string): Promise<void> {
    await db.update(users).set({ emailVerified: true, verificationToken: null }).where(eq(users.id, id));
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
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

  async getAllReviews(): Promise<Review[]> {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async deleteReview(id: number): Promise<void> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    if (!review) return;
    await db.delete(reviews).where(eq(reviews.id, id));
    await this.updateDoctorRatings(review.doctorId);
  }

  async logActivity(data: {
    userId: string;
    username: string;
    role: string;
    action: string;
    type: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await db.insert(activityLogs).values({
      userId: data.userId,
      username: data.username,
      role: data.role,
      action: data.action,
      type: data.type,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date(),
    });
  }

  async getActivityLogs(limit: number = 50): Promise<any[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.timestamp)).limit(limit);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  // Teacher portfolio
  async getTeacherPortfolio(userId: string): Promise<TeacherPortfolio | undefined> {
    const [portfolio] = await db.select().from(teacherPortfolios).where(eq(teacherPortfolios.userId, userId));
    return portfolio;
  }

  async upsertTeacherPortfolio(data: InsertTeacherPortfolio): Promise<TeacherPortfolio> {
    const [portfolio] = await db
      .insert(teacherPortfolios)
      .values({ ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: teacherPortfolios.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return portfolio;
  }

  // Student enrollments
  async getStudentEnrollments(userId: string): Promise<StudentEnrollment[]> {
    return db.select().from(studentEnrollments)
      .where(eq(studentEnrollments.userId, userId))
      .orderBy(desc(studentEnrollments.createdAt));
  }

  async createStudentEnrollment(data: InsertStudentEnrollment): Promise<StudentEnrollment> {
    const [enrollment] = await db.insert(studentEnrollments).values(data).returning();
    return enrollment;
  }

  async deleteStudentEnrollment(id: number, userId: string): Promise<void> {
    await db.delete(studentEnrollments)
      .where(eq(studentEnrollments.id, id));
  }

  async getStudentActivityLogs(userId: string): Promise<any[]> {
    return db.select().from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.timestamp));
  }

  private async updateDoctorRatings(doctorId: number): Promise<void> {
    const doctorReviews = await db.select().from(reviews).where(eq(reviews.doctorId, doctorId));

    if (doctorReviews.length === 0) {
      await db.insert(doctorRatings).values({
        doctorId,
        avgTeachingQuality: 0, avgAvailability: 0, avgCommunication: 0, avgKnowledge: 0, avgFairness: 0,
        avgEngagement: 0, avgHelpfulness: 0, avgCourseOrganization: 0,
        overallRating: 0, totalReviews: 0, updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: doctorRatings.doctorId,
        set: {
          avgTeachingQuality: 0, avgAvailability: 0, avgCommunication: 0, avgKnowledge: 0, avgFairness: 0,
          avgEngagement: 0, avgHelpfulness: 0, avgCourseOrganization: 0,
          overallRating: 0, totalReviews: 0, updatedAt: new Date(),
        },
      });
      return;
    }

    const count = doctorReviews.length;
    const avgTeachingQuality = doctorReviews.reduce((sum: number, r: any) => sum + r.teachingQuality, 0) / count;
    const avgAvailability = doctorReviews.reduce((sum: number, r: any) => sum + r.availability, 0) / count;
    const avgCommunication = doctorReviews.reduce((sum: number, r: any) => sum + r.communication, 0) / count;
    const avgKnowledge = doctorReviews.reduce((sum: number, r: any) => sum + r.knowledge, 0) / count;
    const avgFairness = doctorReviews.reduce((sum: number, r: any) => sum + r.fairness, 0) / count;
    
    // For new columns, only average over reviews that have them (non-null)
    const engageReviews = doctorReviews.filter((r: any) => r.engagement != null);
    const avgEngagement = engageReviews.length > 0 ? engageReviews.reduce((sum: number, r: any) => sum + r.engagement!, 0) / engageReviews.length : 0;
    
    const helpReviews = doctorReviews.filter((r: any) => r.helpfulness != null);
    const avgHelpfulness = helpReviews.length > 0 ? helpReviews.reduce((sum: number, r: any) => sum + r.helpfulness!, 0) / helpReviews.length : 0;
    
    const orgReviews = doctorReviews.filter((r: any) => r.courseOrganization != null);
    const avgCourseOrganization = orgReviews.length > 0 ? orgReviews.reduce((sum: number, r: any) => sum + r.courseOrganization!, 0) / orgReviews.length : 0;

    // Base legacy rating
    let overallRating = (avgTeachingQuality + avgAvailability + avgCommunication + avgKnowledge + avgFairness) / 5;
    
    // If there is ANY review with modern overallScore, compute the true modern overall rating
    const modernReviews = doctorReviews.filter((r: any) => r.overallScore != null);
    if (modernReviews.length > 0) {
      // Compute 1-10 overall directly from the modern reviews for greater accuracy
      overallRating = modernReviews.reduce((sum: number, r: any) => sum + r.overallScore!, 0) / modernReviews.length;
    }

    const payload = {
      doctorId,
      avgTeachingQuality,
      avgAvailability,
      avgCommunication,
      avgKnowledge,
      avgFairness,
      avgEngagement,
      avgHelpfulness,
      avgCourseOrganization,
      overallRating,
      totalReviews: count,
      updatedAt: new Date(),
    };

    await db.insert(doctorRatings).values(payload).onConflictDoUpdate({
      target: doctorRatings.doctorId,
      set: payload,
    });
  }

  // Stats
  async getStats(): Promise<{
    totalUsers: number;
    totalDoctors: number;
    totalReviews: number;
    activeUsers: number;
    usersGrowth: number;
    doctorsGrowth: number;
    reviewsGrowth: number;
  }> {
    try {
      const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const [doctorCount] = await db.select({ count: sql<number>`count(*)` }).from(doctors);
      const [reviewCount] = await db.select({ count: sql<number>`count(*)` }).from(reviews);

      // Active users: unique users who have logged in within the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUserResult = await db.select({ 
        count: sql<number>`count(distinct ${activityLogs.userId})` 
      })
      .from(activityLogs)
      .where(sql`${activityLogs.type} = 'login' AND ${activityLogs.timestamp} > ${thirtyDaysAgo}`);
      
      const activeUserCount = activeUserResult[0]?.count || 0;

      // Previous counts for growth calculation
      const prevUserResult = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.createdAt} < ${thirtyDaysAgo}`);
      
      const prevDoctorResult = await db.select({ count: sql<number>`count(*)` })
        .from(doctors)
        .where(sql`${doctors.createdAt} < ${thirtyDaysAgo}`);
      
      const prevReviewResult = await db.select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(sql`${reviews.createdAt} < ${thirtyDaysAgo}`);

      const prevUserCount = prevUserResult[0]?.count || 0;
      const prevDoctorCount = prevDoctorResult[0]?.count || 0;
      const prevReviewCount = prevReviewResult[0]?.count || 0;

      const calculateGrowth = (current: any, previous: any) => {
        const curr = Number(current);
        const prev = Number(previous);
        if (isNaN(curr) || isNaN(prev)) return 0;
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
      };

      console.log(`[STORAGE] Stats calculated: Users=${userCount.count}, Active=${activeUserCount}, Doctors=${doctorCount.count}, Reviews=${reviewCount.count}`);

      return {
        totalUsers: Number(userCount?.count ?? 0),
        totalDoctors: Number(doctorCount?.count ?? 0),
        totalReviews: Number(reviewCount?.count ?? 0),
        activeUsers: Number(activeUserCount),
        usersGrowth: calculateGrowth(userCount?.count, prevUserCount),
        doctorsGrowth: calculateGrowth(doctorCount?.count, prevDoctorCount),
        reviewsGrowth: calculateGrowth(reviewCount?.count, prevReviewCount),
      };
    } catch (error) {
      console.error("❌ [STORAGE] Error fetching stats:", error);
      return {
        totalUsers: 0,
        totalDoctors: 0,
        totalReviews: 0,
        activeUsers: 0,
        usersGrowth: 0,
        doctorsGrowth: 0,
        reviewsGrowth: 0,
      };
    }
  }

  // Teacher classes
  async getTeacherClasses(filters: { userId: string }): Promise<TeacherClass[]> {
    return await db.select().from(teacherClasses).where(eq(teacherClasses.userId, filters.userId));
  }

  async createTeacherClass(data: InsertTeacherClass): Promise<TeacherClass> {
    const [cls] = await db.insert(teacherClasses).values(data).returning();
    return cls;
  }

  async updateTeacherClass(id: number, data: Partial<InsertTeacherClass>): Promise<TeacherClass> {
    const [updated] = await db.update(teacherClasses).set(data).where(eq(teacherClasses.id, id)).returning();
    return updated;
  }

  async deleteTeacherClass(id: number): Promise<void> {
    await db.delete(teacherClasses).where(eq(teacherClasses.id, id));
  }

  // Messages and Notifications
  async getMessages(receiverId: string | null): Promise<Message[]> {
    if (receiverId) {
      return await db.select().from(messages).where(
        sql`${messages.receiverId} = ${receiverId} OR ${messages.receiverId} IS NULL`
      ).orderBy(desc(messages.createdAt));
    }
    return await db.select().from(messages).where(
      sql`${messages.receiverId} IS NULL`
    ).orderBy(desc(messages.createdAt));
  }

  async getSentMessages(senderId: string): Promise<Message[]> {
     return await db.select().from(messages).where(eq(messages.senderId, senderId)).orderBy(desc(messages.createdAt));
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(data).returning();
    return msg;
  }

  async markMessageRead(id: number): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  // ── Session management ─────────────────────────────────────────────────
  async setUserActiveSession(userId: string, sessionId: string | null): Promise<void> {
    await db.update(users).set({ activeSessionId: sessionId }).where(eq(users.id, userId));
  }

  // ── Review ownership ───────────────────────────────────────────────────
  async getReviewByReviewerAndDoctor(reviewerId: string, doctorId: number): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(sql`${reviews.reviewerId} = ${reviewerId} AND ${reviews.doctorId} = ${doctorId}`);
    return review;
  }

  async updateReview(id: number, data: Partial<Review>): Promise<Review> {
    const [updated] = await db
      .update(reviews)
      .set({ ...data, lastEditedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return updated;
  }

  async getReviewsByReviewer(reviewerId: string): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewerId, reviewerId))
      .orderBy(desc(reviews.createdAt));
  }
}

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new SqliteStorage();
