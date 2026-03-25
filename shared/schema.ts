import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const session = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoles = ["student", "teacher", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).unique(),
  password: varchar("password", { length: 255 }),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().default("student"),
  studentId: varchar("student_id"),
  resetToken: varchar("reset_token", { length: 255 }),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: varchar("verification_token", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Doctors table
export const doctors = pgTable("doctors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  title: varchar("title", { length: 100 }),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews table — 8 categories, each computed from 2-3 sub-questions (1–10 scale)
// Legacy columns (1-5) kept for backward compat; new reviews also populate new columns
export const reviews = pgTable("reviews", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  // Legacy 1-5 category columns (kept for backward compat, filled from subScores/2 for new reviews)
  teachingQuality: integer("teaching_quality").notNull(),
  availability: integer("availability").notNull(),
  communication: integer("communication").notNull(),
  knowledge: integer("knowledge").notNull(),
  fairness: integer("fairness").notNull(),
  // New 1-10 category columns (nullable — null on legacy reviews)
  engagement: integer("engagement"),
  helpfulness: integer("helpfulness"),
  courseOrganization: integer("course_organization"),
  // Full sub-question detail: { categoryKey: { q1: 8, q2: 7, q3: 9 } }
  subScores: jsonb("sub_scores"),
  // Overall score on 1-10 scale (null on legacy reviews)
  overallScore: real("overall_score"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Doctor aggregated ratings
export const doctorRatings = pgTable("doctor_ratings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  doctorId: integer("doctor_id").notNull().unique().references(() => doctors.id, { onDelete: "cascade" }),
  // Legacy averages (1-5 scale)
  avgTeachingQuality: real("avg_teaching_quality").default(0),
  avgAvailability: real("avg_availability").default(0),
  avgCommunication: real("avg_communication").default(0),
  avgKnowledge: real("avg_knowledge").default(0),
  avgFairness: real("avg_fairness").default(0),
  // New category averages (1-10 scale)
  avgEngagement: real("avg_engagement").default(0),
  avgHelpfulness: real("avg_helpfulness").default(0),
  avgCourseOrganization: real("avg_course_organization").default(0),
  overallRating: real("overall_rating").default(0),
  totalReviews: integer("total_reviews").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const doctorsRelations = relations(doctors, ({ many, one }) => ({
  reviews: many(reviews),
  ratings: one(doctorRatings),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  doctor: one(doctors, {
    fields: [reviews.doctorId],
    references: [doctors.id],
  }),
}));

export const doctorRatingsRelations = relations(doctorRatings, ({ one }) => ({
  doctor: one(doctors, {
    fields: [doctorRatings.doctorId],
    references: [doctors.id],
  }),
}));

// Teacher portfolios
export const teacherPortfolios = pgTable("teacher_portfolios", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }),
  philosophy: text("philosophy"),
  syllabusUrl: text("syllabus_url"),
  materials: jsonb("materials").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student enrollments
export const studentEnrollments = pgTable("student_enrollments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseName: varchar("course_name", { length: 200 }).notNull(),
  courseCode: varchar("course_code", { length: 50 }),
  term: varchar("term", { length: 100 }),
  grade: varchar("grade", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  username: varchar("username", { length: 50 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  action: text("action").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ── Rating system helpers ──────────────────────────────────────────────────

export const subScoresSchema = z.object({
  teachingQuality:    z.object({ q1: z.number().min(1).max(10), q2: z.number().min(1).max(10), q3: z.number().min(1).max(10) }),
  availability:       z.object({ q1: z.number().min(1).max(10), q2: z.number().min(1).max(10) }),
  communication:      z.object({ q1: z.number().min(1).max(10), q2: z.number().min(1).max(10), q3: z.number().min(1).max(10) }),
  knowledge:          z.object({ q1: z.number().min(1).max(10), q2: z.number().min(1).max(10) }),
  fairness:           z.object({ q1: z.number().min(1).max(10), q2: z.number().min(1).max(10), q3: z.number().min(1).max(10) }),
  engagement:         z.object({ q1: z.number().min(1).max(10), q2: z.number().min(1).max(10) }),
  helpfulness:        z.object({ q1: z.number().min(1).max(10), q2: z.number().min(1).max(10) }),
  courseOrganization: z.object({ q1: z.number().min(1).max(10), q2: z.number().min(1).max(10), q3: z.number().min(1).max(10) }),
});
export type SubScores = z.infer<typeof subScoresSchema>;

function avg(scores: Record<string, number>): number {
  const v = Object.values(scores);
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function computeAllScores(sub: SubScores) {
  const teaching = avg(sub.teachingQuality);
  const avail    = avg(sub.availability);
  const comm     = avg(sub.communication);
  const know     = avg(sub.knowledge);
  const fair     = avg(sub.fairness);
  const engage   = avg(sub.engagement);
  const help     = avg(sub.helpfulness);
  const org      = avg(sub.courseOrganization);
  const overall  = (teaching + avail + comm + know + fair + engage + help + org) / 8;
  return {
    // Normalize to 1-5 for legacy columns (clamped to [1,5])
    teachingQuality:    Math.max(1, Math.min(5, Math.round(teaching / 2))),
    availability:       Math.max(1, Math.min(5, Math.round(avail / 2))),
    communication:      Math.max(1, Math.min(5, Math.round(comm / 2))),
    knowledge:          Math.max(1, Math.min(5, Math.round(know / 2))),
    fairness:           Math.max(1, Math.min(5, Math.round(fair / 2))),
    // New 1-10 columns
    engagement:         Math.round(engage),
    helpfulness:        Math.round(help),
    courseOrganization: Math.round(org),
    overallScore:       Math.round(overall * 10) / 10,
    // Raw 1-10 values for display purposes
    raw: { teaching, avail, comm, know, fair, engage, help, org, overall },
  };
}

// ── Schemas and Types ──────────────────────────────────────────────────────

export const insertUserSchema: any = (createInsertSchema(users) as any).omit({ createdAt: true, updatedAt: true });
export const insertDoctorSchema: any = (createInsertSchema(doctors) as any).omit({ id: true, createdAt: true, updatedAt: true });

export const insertReviewSchema = z.object({
  doctorId: z.number(),
  teachingQuality: z.number(),
  availability: z.number(),
  communication: z.number(),
  knowledge: z.number(),
  fairness: z.number(),
  engagement: z.number(),
  helpfulness: z.number(),
  courseOrganization: z.number(),
  subScores: subScoresSchema,
  overallScore: z.number(),
  comment: z.string().nullable().optional(),
});

export const insertTeacherPortfolioSchema: any = (createInsertSchema(teacherPortfolios) as any).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStudentEnrollmentSchema: any = (createInsertSchema(studentEnrollments) as any).omit({ id: true, createdAt: true });

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type DoctorRating = typeof doctorRatings.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type TeacherPortfolio = typeof teacherPortfolios.$inferSelect;
export type InsertTeacherPortfolio = z.infer<typeof insertTeacherPortfolioSchema>;
export type StudentEnrollment = typeof studentEnrollments.$inferSelect;
export type InsertStudentEnrollment = z.infer<typeof insertStudentEnrollmentSchema>;

export type DoctorWithRatings = Doctor & {
  ratings: DoctorRating | null;
};
