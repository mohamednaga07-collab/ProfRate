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

// Session storage table (singular 'session' to match production manual table)
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

// Users table with role support
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

// Reviews table with 5-factor ratings (anonymous)
export const reviews = pgTable("reviews", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  teachingQuality: integer("teaching_quality").notNull(),
  availability: integer("availability").notNull(),
  communication: integer("communication").notNull(),
  knowledge: integer("knowledge").notNull(),
  fairness: integer("fairness").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Doctor aggregated ratings (calculated)
export const doctorRatings = pgTable("doctor_ratings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  doctorId: integer("doctor_id").notNull().unique().references(() => doctors.id, { onDelete: "cascade" }),
  avgTeachingQuality: real("avg_teaching_quality").default(0),
  avgAvailability: real("avg_availability").default(0),
  avgCommunication: real("avg_communication").default(0),
  avgKnowledge: real("avg_knowledge").default(0),
  avgFairness: real("avg_fairness").default(0),
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

// Teacher portfolios table for the showcase feature
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

// Student enrollments/academic trajectory
export const studentEnrollments = pgTable("student_enrollments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseName: varchar("course_name", { length: 200 }).notNull(),
  courseCode: varchar("course_code", { length: 50 }),
  term: varchar("term", { length: 100 }),
  grade: varchar("grade", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs table for tracking user actions
export const activityLogs = pgTable("activity_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  username: varchar("username", { length: 50 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  action: text("action").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'login', 'review', 'doctor', 'role', etc.
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Schemas and types
// createInsertSchema can be difficult for TS to infer across versions; cast to any
export const insertUserSchema: any = (createInsertSchema(users) as any).omit({ createdAt: true, updatedAt: true });
export const insertDoctorSchema: any = (createInsertSchema(doctors) as any).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReviewSchema: any = (createInsertSchema(reviews) as any).omit({ id: true, createdAt: true }).extend({
  teachingQuality: z.number().min(1).max(5),
  availability: z.number().min(1).max(5),
  communication: z.number().min(1).max(5),
  knowledge: z.number().min(1).max(5),
  fairness: z.number().min(1).max(5),
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

// Combined doctor with ratings type
export type DoctorWithRatings = Doctor & {
  ratings: DoctorRating | null;
};
