import {
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
  type TeacherClass,
  type InsertTeacherClass,
  type StudentEnrollment,
  type InsertStudentEnrollment,
  type Message,
  type InsertMessage,
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
  private usersByVerificationToken = new Map<string, User>();
  private doctors = new Map<number, Doctor>();
  private reviews = new Map<number, Review>();
  private doctorRatings = new Map<number, DoctorRating>();
  private activityLogs: any[] = [];
  private teacherPortfolios = new Map<string, TeacherPortfolio>();
  private teacherClasses = new Map<number, TeacherClass>();
  private studentEnrollments = new Map<number, StudentEnrollment>();
  private messages = new Map<number, Message>();
  private nextDoctorId = 1;
  private nextReviewId = 1;
  private nextClassId = 1;
  private nextEnrollmentId = 1;
  private nextMessageId = 1;

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
          emailVerified: row.emailVerified === 1 ? true : false,
          verificationToken: row.verificationToken,
          activeSessionId: row.activeSessionId ?? null,
          linkedDoctorId: row.linkedDoctorId ?? null,
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

  async linkUserToDoctor(userId: string, doctorId: number | null): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.linkedDoctorId = doctorId;
    user.updatedAt = new Date();
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
      emailVerified: (userData as any).emailVerified ?? false,
      verificationToken: (userData as any).verificationToken ?? null,
      activeSessionId: null,
      linkedDoctorId: null,
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
      emailVerified: (userData as any).emailVerified ?? false,
      verificationToken: (userData as any).verificationToken ?? null,
      activeSessionId: null,
      linkedDoctorId: null,
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
      reviewerId: src.reviewerId ?? null,
      lastEditedAt: src.lastEditedAt ?? null,
      teachingQuality: src.teachingQuality,
      availability: src.availability,
      communication: src.communication,
      knowledge: src.knowledge,
      fairness: src.fairness,
      engagement: src.engagement ?? null,
      helpfulness: src.helpfulness ?? null,
      courseOrganization: src.courseOrganization ?? null,
      subScores: src.subScores ?? null,
      overallScore: src.overallScore ?? null,
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
    // For new columns, only average over reviews that have them (non-null)
    const engageReviews = doctorReviews.filter((r: any) => r.engagement != null);
    const avgEngagement = engageReviews.length > 0 ? engageReviews.reduce((sum: number, r: any) => sum + r.engagement!, 0) / engageReviews.length : 0;

    const helpReviews = doctorReviews.filter((r: any) => r.helpfulness != null);
    const avgHelpfulness = helpReviews.length > 0 ? helpReviews.reduce((sum: number, r: any) => sum + r.helpfulness!, 0) / helpReviews.length : 0;

    const orgReviews = doctorReviews.filter((r: any) => r.courseOrganization != null);
    const avgCourseOrganization = orgReviews.length > 0 ? orgReviews.reduce((sum: number, r: any) => sum + r.courseOrganization!, 0) / orgReviews.length : 0;

    const overallRating = (avgTeachingQuality + avgAvailability + avgCommunication + avgKnowledge + avgFairness) / 5;

    const rating: DoctorRating = {
      id: this.doctorRatings.size + 1,
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
      totalReviews: doctorReviews.length,
      updatedAt: new Date(),
    };

    this.doctorRatings.set(doctorId, rating);
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
    return {
      totalUsers: this.users.size,
      totalDoctors: this.doctors.size,
      totalReviews: this.reviews.size,
      activeUsers: Math.min(this.users.size, 5), // Mock active users
      usersGrowth: 0,
      doctorsGrowth: 0,
      reviewsGrowth: 0,
    };
  }

  // Email verification methods
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return this.usersByVerificationToken.get(token);
  }

  async updateUserVerificationToken(id: string, token: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.verificationToken = token;
      user.emailVerified = false;
      this.usersByVerificationToken.set(token, user);
    }
  }

  async verifyUserEmail(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.emailVerified = true;
      if (user.verificationToken) {
        this.usersByVerificationToken.delete(user.verificationToken);
      }
      user.verificationToken = null;
    }
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.role = role;
      user.updatedAt = new Date();
    }
  }

  async deleteUser(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.users.delete(id);
      if (user.username) this.usersByUsername.delete(user.username);
      if (user.email) this.usersByEmail.delete(user.email);
      if (user.resetToken) this.usersByResetToken.delete(user.resetToken);
      if (user.verificationToken) this.usersByVerificationToken.delete(user.verificationToken);
    }
  }

  async getAllReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values()).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async deleteReview(id: number): Promise<void> {
    const review = this.reviews.get(id);
    if (review) {
      this.reviews.delete(id);
      await this.updateDoctorRatings(review.doctorId);
    }
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
    this.activityLogs.push({
      id: this.activityLogs.length + 1,
      ...data,
      timestamp: new Date(),
    });
  }

  async getActivityLogs(limit: number = 50): Promise<any[]> {
    return this.activityLogs.slice(-limit).reverse();
  }

  // Teacher portfolio
  async getTeacherPortfolio(userId: string): Promise<TeacherPortfolio | undefined> {
    return this.teacherPortfolios.get(userId);
  }

  async upsertTeacherPortfolio(data: InsertTeacherPortfolio): Promise<TeacherPortfolio> {
    const item = { ...data, updatedAt: new Date(), createdAt: (data as any).createdAt ?? new Date() } as TeacherPortfolio;
    this.teacherPortfolios.set(data.userId, item);
    return item;
  }

  // Teacher classes
  async getTeacherClasses(filters: { userId: string }): Promise<TeacherClass[]> {
    return Array.from(this.teacherClasses.values()).filter((c) => c.userId === filters.userId);
  }

  async createTeacherClass(data: InsertTeacherClass): Promise<TeacherClass> {
    const id = this.nextClassId++;
    const cls = { id, ...data, createdAt: new Date(), updatedAt: new Date() } as TeacherClass;
    this.teacherClasses.set(id, cls);
    return cls;
  }

  async updateTeacherClass(id: number, data: Partial<InsertTeacherClass>): Promise<TeacherClass> {
    const existing = this.teacherClasses.get(id) as any;
    if (!existing) throw new Error("Class not found");
    const updated = { ...existing, ...data, updatedAt: new Date() } as TeacherClass;
    this.teacherClasses.set(id, updated);
    return updated;
  }

  async deleteTeacherClass(id: number): Promise<void> {
    this.teacherClasses.delete(id);
  }

  // Student enrollments
  async getStudentEnrollments(userId: string): Promise<StudentEnrollment[]> {
    return Array.from(this.studentEnrollments.values()).filter((e) => e.userId === userId);
  }

  async createStudentEnrollment(data: InsertStudentEnrollment): Promise<StudentEnrollment> {
    const id = this.nextEnrollmentId++;
    const enrollment = { id, ...data, createdAt: new Date() } as StudentEnrollment;
    this.studentEnrollments.set(id, enrollment);
    return enrollment;
  }

  async deleteStudentEnrollment(id: number, userId: string): Promise<void> {
    this.studentEnrollments.delete(id);
  }

  async getStudentActivityLogs(userId: string): Promise<any[]> {
    return this.activityLogs.filter((a) => a.userId === userId);
  }

  // Messages
  async getMessages(receiverId: string | null): Promise<Message[]> {
    return Array.from(this.messages.values()).filter((m) => (receiverId ? m.receiverId === receiverId || m.receiverId === null : m.receiverId === null));
  }

  async getSentMessages(senderId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter((m) => m.senderId === senderId);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const id = this.nextMessageId++;
    const msg = { id, ...data, isRead: false, createdAt: new Date() } as Message;
    this.messages.set(id, msg);
    return msg;
  }

  async markMessageRead(id: number): Promise<void> {
    const msg = this.messages.get(id) as any;
    if (msg) msg.isRead = true;
  }

  async deleteMessage(id: number): Promise<void> {
    this.messages.delete(id);
  }

  // Session management
  async setUserActiveSession(userId: string, sessionId: string | null): Promise<void> {
    const user = this.users.get(userId);
    if (user) user.activeSessionId = sessionId;
  }

  // Review ownership helpers
  async getReviewByReviewerAndDoctor(reviewerId: string, doctorId: number): Promise<Review | undefined> {
    return Array.from(this.reviews.values()).find((r) => r.reviewerId === reviewerId && r.doctorId === doctorId);
  }

  async updateReview(id: number, data: Partial<Review>): Promise<Review> {
    const existing = this.reviews.get(id) as any;
    if (!existing) throw new Error("Review not found");
    const updated = { ...existing, ...data, lastEditedAt: new Date() } as Review;
    this.reviews.set(id, updated);
    await this.updateDoctorRatings(updated.doctorId);
    return updated;
  }

  async getReviewsByReviewer(reviewerId: string): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter((r) => r.reviewerId === reviewerId);
  }
}
