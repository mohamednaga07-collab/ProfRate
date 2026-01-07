import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./antigravityAuth";
import { insertDoctorSchema, insertReviewSchema } from "@shared/schema";
import { hashPassword, verifyPassword, validatePasswordStrength, sanitizeUsername, isValidUsername, isValidEmail, recordLoginAttempt, isAccountLocked, getLockoutTimeRemaining, clearLoginAttempts, generateCsrfToken, validateCsrfToken, clearCsrfToken, validateInputLength, validateFormInputs, MAX_INPUT_LENGTHS, validateCsrfHeader, sanitizeHtmlContent, loginLimiter, registerLimiter } from "./auth";
import { randomUUID } from "crypto";
import crypto from "crypto";
import { sendEmail, generateForgotPasswordEmailHtml, generateForgotUsernameEmailHtml } from "./email";
// Extend Express session to include userId
declare module "express-session" {
  interface SessionData {
    userId?: string;
    csrfInit?: boolean;
  }
}

// Helper to get user ID from session or OIDC token
function getUserId(req: any): string | null {
  // Check session first (for our username/password auth)
  if (req.session?.userId) {
    return req.session.userId;
  }
  // Production: from OIDC token
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  return null;
}

async function seedSampleData() {
  try {
    const existingDoctors = await storage.getAllDoctors();
    if (existingDoctors.length > 0) return;

    const sampleDoctors = [
      { name: "Dr. Sarah Johnson", department: "Computer Science", title: "Associate Professor", bio: "Expert in machine learning and artificial intelligence with 15 years of teaching experience." },
      { name: "Dr. Michael Chen", department: "Mathematics", title: "Professor", bio: "Specializes in applied mathematics and statistics. Known for clear explanations of complex topics." },
      { name: "Dr. Emily Williams", department: "Physics", title: "Assistant Professor", bio: "Researcher in quantum mechanics with a passion for undergraduate education." },
      { name: "Dr. James Anderson", department: "Computer Science", title: "Professor", bio: "Database systems and software engineering specialist. Industry experience at major tech companies." },
      { name: "Dr. Lisa Martinez", department: "Biology", title: "Associate Professor", bio: "Molecular biology researcher focused on making science accessible to all students." },
    ];

    for (const doctor of sampleDoctors) {
      await storage.createDoctor(doctor);
    }
    console.log("✓ Seeded sample doctors");
  } catch (error) {
    console.warn("⚠️  Could not seed data (database not connected). Run with a working DATABASE_URL.");
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Defensive fallback: if server-side auth is not configured, ensure
  // /api/login and /api/logout exist so the client doesn't receive 404s.
  if (!process.env.REPL_ID) {
    app.get("/api/login", (_req, res) => {
      return res.redirect("/?showRoleSelect=1");
    });

    app.get("/api/logout", (req, res) => {
      try {
        req.logout?.(() => {});
      } catch (e) {
        // ignore
      }
      return res.json({ message: "logged out" });
    });

    app.post("/api/logout", (req, res) => {
      try {
        req.logout?.(() => {});
      } catch (e) {
        // ignore
      }
      return res.json({ message: "logged out" });
    });
  }

  // Seed sample data (doctors only)
  await seedSampleData();

  // Auth routes - public endpoint to check if user is logged in
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // Disable caching for auth checks
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      // Check session for logged in user
      if (req.session?.userId) {
        console.log("📋 Checking user session:", req.session.userId);
        const user = await storage.getUser(req.session.userId);
        if (user) {
          // Don't send password to client
          const { password, ...userWithoutPassword } = user as any;
          console.log("✅ User authenticated:", user.username);
          return res.json(userWithoutPassword);
        }
      }
      
      // Fallback to OIDC if configured
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        return res.json(user);
      }
      
      // No authenticated user - return null (expected on first load)
      return res.json(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // CSRF Token endpoint - Generate token for forms
  app.get("/api/auth/csrf-token", (req: any, res) => {
    try {
      // Force session initialization to ensure cookie is set
      if (req.session) {
        req.session.csrfInit = true;
      }

      // Get or create session ID - use a secure identifier
      const sessionId = req.sessionID || req.session?.id || crypto.randomBytes(16).toString("hex");
      const token = generateCsrfToken(sessionId);
      
      console.log("🔐 Generated CSRF token for session:", sessionId.substring(0, 8) + "...");
      res.json({ csrfToken: token });
    } catch (error) {
      console.error("Error generating CSRF token:", error);
      res.status(500).json({ message: "Failed to generate CSRF token" });
    }
  });

  // Login endpoint - Protected with rate limiting
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { username, password, role, recaptchaToken } = req.body;
      
      // Validate input lengths to prevent DoS and injection attacks
      const lengthValidation = validateFormInputs(
        { username: username || "", password: password || "" },
        { username: MAX_INPUT_LENGTHS.username, password: MAX_INPUT_LENGTHS.password }
      );
      
      if (!lengthValidation.valid) {
        console.log("❌ Input validation failed:", lengthValidation.errors);
        return res.status(400).json({ message: "Invalid input format" });
      }
      
      // Sanitize username input to prevent injection
      const sanitized = sanitizeUsername(username || "");
      console.log("🔐 Login attempt for username:", sanitized);

      const recaptchaEnabled = process.env.RECAPTCHA_ENABLED === "true";

      if (!username || !password) {
        console.log("❌ Missing username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (!isValidUsername(username)) {
        console.log("❌ Invalid username format");
        return res.status(400).json({ message: "Invalid username format" });
      }

      // Check if account is locked due to failed attempts
      const userIp = req.ip || req.headers['x-forwarded-for'] as string || "unknown";
      if (isAccountLocked(username, userIp)) {
        const remainingSeconds = getLockoutTimeRemaining(username, userIp);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        console.warn("🚫 Account locked due to too many failed attempts:", username, "remaining:", remainingMinutes, "minutes");
        return res.status(429).json({ 
          message: `Account locked due to too many failed login attempts. Please try again in ${remainingMinutes} minute(s).` 
        });
      }

      if (recaptchaEnabled) {
        const skipRecaptcha = req.body.skipRecaptcha === true;
        console.log("🔐 reCAPTCHA check - enabled:", recaptchaEnabled, "skipRecaptcha:", skipRecaptcha, "token:", recaptchaToken ? "present" : "missing");
        
        if (!skipRecaptcha && !recaptchaToken) {
          console.log("❌ reCAPTCHA verification required - no token and not skipping");
          return res.status(400).json({ message: "reCAPTCHA verification is required" });
        }

        if (!skipRecaptcha && recaptchaToken) {
          console.log("✅ Verifying reCAPTCHA token with Google");
          try {
            const recaptchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                secret: process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe",
                response: recaptchaToken,
              }).toString(),
            });

            const recaptchaData = await recaptchaResponse.json();
            console.log("reCAPTCHA verification response:", recaptchaData);

            if (!recaptchaData.success) {
              return res.status(400).json({ message: "reCAPTCHA verification failed. Please try again." });
            }

            if (recaptchaData.score && recaptchaData.score < 0.5) {
              console.warn("⚠️  Suspicious activity detected from IP:", req.ip);
              return res.status(400).json({ message: "Suspicious activity detected. Please try again." });
            }
        } catch (recaptchaError) {
          console.error("Error verifying reCAPTCHA:", recaptchaError);
          return res.status(500).json({ message: "reCAPTCHA verification error" });
        }
      } else {
        console.log("✅ Skipping reCAPTCHA verification (session verified)");
      }
      }

      const user = await storage.getUserByUsername(username);
      console.log("👤 Found user:", user ? "yes ✓" : "no ✗");
      
      if (!user || !user.password) {
        console.log("❌ User not found");
        // Reveal if username exists (User request)
        return res.status(404).json({ message: "User not found" });
      }

      // If the client specifies a role (student/teacher/admin), require the account to match.
      if (role && (role === "student" || role === "teacher" || role === "admin")) {
        const userRole = (user as any).role as string | undefined;
        if (userRole !== role) {
          console.log("❌ Role mismatch for user:", username, "expected:", role, "actual:", userRole);
          return res
            .status(401)
            .json({ message: `This account is registered as a ${userRole}, but you're trying to login as a ${role}. Please select the correct role.` });
        }
      }

      // Use async password verification
      const isValid = await verifyPassword(password, user.password);
      console.log("🔑 Password valid:", isValid ? "yes ✓" : "no ✗");
      
      if (!isValid) {
        // Record failed login attempt for account lockout
        recordLoginAttempt(username, userIp, false);
        console.warn("⚠️  Invalid password attempt for user:", username, "from IP:", userIp);
        // Don't reveal password is wrong (security best practice)
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Set session and save it
      if (req.session) {
        req.session.userId = user.id;
        console.log("📝 Session set for user:", user.id);
        
        // Clear login attempts on successful login
        clearLoginAttempts(username, userIp);
        
        // Ensure session is saved before responding
        await new Promise<void>((resolve, reject) => {
          req.session?.save((err: any) => {
            if (err) {
              console.error("❌ Session save error:", err);
              reject(err);
            } else {
              console.log("✅ Session saved successfully");
              resolve();
            }
          });
        });
      }

      // Log user login activity (if supported by storage)
      if (storage.logActivity) {
        try {
          await storage.logActivity({
            userId: user.id,
            username: user.username || username,
            role: (user as any).role || "student",
            action: `User logged in`,
            type: "login",
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || "unknown",
            userAgent: req.headers['user-agent'],
          });
        } catch (err) {
          console.error("Failed to log activity:", err);
          // Don't fail the login if activity logging fails
        }
      }

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user as any;
      console.log("✅ Login successful for:", username);
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed - an unexpected error occurred" });
    }
  });

  // Register endpoint - Protected with rate limiting
  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const { username: rawUsername, password, email, firstName, lastName, role, recaptchaToken, skipRecaptcha } = req.body;
      const username = rawUsername ? rawUsername.trim() : "";

      // Sanitize and validate username
      const sanitized = sanitizeUsername(username || "");
      if (!isValidUsername(username)) {
        console.log("❌ Invalid username format:", username);
        return res.status(400).json({ 
          message: "Username must be 3-30 characters and can contain letters, numbers, dots, underscores, hyphens, and @ (email format)" 
        });
      }

      // Check required fields
      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      // Validate email format
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      // Validate password strength
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.isStrong) {
        return res.status(400).json({ 
          message: "Password is too weak",
          feedback: passwordCheck.feedback,
          score: passwordCheck.score
        });
      }

      const recaptchaEnabled = process.env.RECAPTCHA_ENABLED === "true";

      if (recaptchaEnabled) {
        const shouldSkip = skipRecaptcha === true;
        
        if (!shouldSkip && !recaptchaToken) {
          return res.status(400).json({ message: "reCAPTCHA verification is required" });
        }

        // Verify reCAPTCHA token with Google only if not skipping
        if (!shouldSkip && recaptchaToken) {
          try {
            const recaptchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                secret: process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe",
                response: recaptchaToken,
              }).toString(),
            });

            const recaptchaData = await recaptchaResponse.json();
            console.log("reCAPTCHA verification response:", recaptchaData);

            if (!recaptchaData.success) {
              return res.status(400).json({ message: "reCAPTCHA verification failed. Please try again." });
            }

            // Check score (for v3) - scores closer to 1.0 are more human-like
            if (recaptchaData.score && recaptchaData.score < 0.5) {
              console.warn("⚠️  Suspicious registration activity from IP:", req.ip);
              return res.status(400).json({ message: "Suspicious activity detected. Please try again." });
            }
          } catch (recaptchaError) {
            console.error("Error verifying reCAPTCHA:", recaptchaError);
            return res.status(500).json({ message: "reCAPTCHA verification error" });
          }
        }
      }

      if (!role || !["student", "teacher", "admin"].includes(role)) {
        return res.status(400).json({ message: "Valid role is required (student, teacher, or admin)" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log("⚠️  Username already exists:", username);
        return res.status(409).json({ message: "Username (Email) already exists. Please login." });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        console.log("⚠️  Email already exists:", email);
        return res.status(409).json({ message: "Email already associated with an account" });
      }

      // Hash password and create user (async operation)
      console.log("🔐 Hashing password with bcrypt for new user:", username);
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        id: randomUUID(),
        username,
        password: hashedPassword,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
      });

      console.log("✅ New user created:", username, "with role:", role);

      // Set session
      if (req.session) {
        req.session.userId = newUser.id;
      }

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = newUser as any;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout-custom", async (req, res) => {
    try {
      if (req.session) {
        req.session.destroy(() => {});
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Public endpoint telling the client whether server-side OIDC auth is enabled
  app.get("/api/auth/available", async (_req, res) => {
    try {
      res.json({ enabled: Boolean(process.env.REPL_ID) });
    } catch (err) {
      res.json({ enabled: false });
    }
  });

  // Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Doctor routes
  app.get("/api/doctors", async (req, res) => {
    try {
      const doctors = await storage.getAllDoctors();
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid doctor ID" });
      }
      const doctor = await storage.getDoctor(id);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      res.json(doctor);
    } catch (error) {
      console.error("Error fetching doctor:", error);
      res.status(500).json({ message: "Failed to fetch doctor" });
    }
  });

  app.post("/api/doctors", isAuthenticated, validateCsrfHeader, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);

      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Only admins can add doctors" });
      }

      // Sanitize bio content
      if (req.body.bio) {
        req.body.bio = sanitizeHtmlContent(req.body.bio);
      }

      const validatedData = insertDoctorSchema.parse(req.body);
      const doctor = await storage.createDoctor(validatedData);
      res.status(201).json(doctor);
    } catch (error: any) {
      console.error("Error creating doctor:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create doctor" });
    }
  });

  app.patch("/api/doctors/:id", isAuthenticated, validateCsrfHeader, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);

      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Only admins can update doctors" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid doctor ID" });
      }

      const doctor = await storage.updateDoctor(id, req.body);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      res.json(doctor);
    } catch (error) {
      console.error("Error updating doctor:", error);
      res.status(500).json({ message: "Failed to update doctor" });
    }
  });

  app.delete("/api/doctors/:id", isAuthenticated, validateCsrfHeader, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);

      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Only admins can delete doctors" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid doctor ID" });
      }

      await storage.deleteDoctor(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting doctor:", error);
      res.status(500).json({ message: "Failed to delete doctor" });
    }
  });

  // Review routes
  app.get("/api/doctors/:id/reviews", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid doctor ID" });
      }
      const reviews = await storage.getReviewsByDoctor(id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/doctors/:id/reviews", isAuthenticated, validateCsrfHeader, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);

      if (user?.role !== "student") {
        return res.status(403).json({ message: "Only students can submit reviews" });
      }

      const doctorId = parseInt(req.params.id);
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID" });
      }

      // Sanitize comment content
      if (req.body.comment) {
        req.body.comment = sanitizeHtmlContent(req.body.comment);
      }

      const validatedData = insertReviewSchema.parse({
        ...req.body,
        doctorId,
      });

      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error: any) {
      console.error("Error creating review:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Forgot Password Route
  app.post("/api/auth/forgot-password", validateCsrfHeader, async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists
        return res.status(200).json({ message: "If an account exists, a reset link has been sent." });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      try {
        await storage.updateUserResetToken(user.id, resetToken, resetTokenExpiry);
      } catch (dbError: any) {
        console.error("Database error updating reset token:", dbError);
        return res.status(500).json({ message: `Database error: ${dbError.message}` });
      }

      // Send email with reset link
      const resetLink = `${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
      const emailHtml = generateForgotPasswordEmailHtml(user.username || "User", resetLink);
      
      try {
        await sendEmail({
          to: email,
          subject: "Reset Your Campus Ratings Password",
          html: emailHtml,
        });
      } catch (emailError: any) {
        console.error("Email service error:", emailError);
        return res.status(500).json({ message: `Email sending failed: ${emailError.message}` });
      }

      res.status(200).json({ message: "If an account exists, a reset link has been sent." });
    } catch (error: any) {
      console.error("Unexpected error in forgot password:", error);
      res.status(500).json({ message: `Unexpected error: ${error.message}` });
    }
  });

  app.post("/api/auth/reset-password", async (req: any, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      if (new Date() > user.resetTokenExpiry) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearResetToken(user.id);

      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: `Failed to reset password: ${error.message}` });
    }
  });

  // Forgot Username Route
  app.post("/api/auth/forgot-username", validateCsrfHeader, async (req: any, res) => {
    try {
      const { email } = req.body;
      console.log(`[forgot-username] Received request for email: ${email}`);
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      console.log(`[forgot-username] Found user: ${user ? user.username : "NOT FOUND"}`);
      
      if (!user) {
        // For security, don't reveal if email exists
        return res.status(200).json({ message: "If an account exists, your username has been sent to the email on file." });
      }

      // Send email with username
      console.log(`[forgot-username] Sending email to ${email}`);
      const emailHtml = generateForgotUsernameEmailHtml(user.username || "Your Username");
      await sendEmail({
        to: email,
        subject: "Your Campus Ratings Username",
        html: emailHtml,
      });

      res.status(200).json({ message: "If an account exists, your username has been sent to the email on file." });
    } catch (error: any) {
      console.error("Error in forgot username:", error);
      res.status(500).json({ message: `Failed to process forgot username request: ${error.message}` });
    }
  });

  // ==================== ADMIN ROUTES ====================
  // Middleware to check if user is admin
  async function isAdmin(req: any, res: any, next: any) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Admin auth error:", error);
      res.status(500).json({ message: "Authorization failed" });
    }
  }

  // Get admin stats
  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const doctors = await storage.getAllDoctors();
      const reviews = await storage.getAllReviews();
      
      res.json({
        totalUsers: users.length,
        totalDoctors: doctors.length,
        totalReviews: reviews.length,
        pendingReports: 0, // TODO: implement reports system
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get all users
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, resetToken, resetTokenExpiry, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role
  app.patch("/api/admin/users/:userId/role", isAdmin, validateCsrfHeader, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!["student", "teacher", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      await storage.updateUserRole(userId, role);
      res.json({ message: "Role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Delete user
  app.delete("/api/admin/users/:userId", isAdmin, validateCsrfHeader, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Get all doctors (admin version with full details)
  app.get("/api/admin/doctors", isAdmin, async (req, res) => {
    try {
      const doctors = await storage.getAllDoctors();
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  // Create doctor
  app.post("/api/admin/doctors", isAdmin, async (req, res) => {
    try {
      const result = insertDoctorSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid doctor data", errors: result.error.errors });
      }
      
      const doctor = await storage.createDoctor(result.data);
      res.status(201).json(doctor);
    } catch (error) {
      console.error("Error creating doctor:", error);
      res.status(500).json({ message: "Failed to create doctor" });
    }
  });

  // Delete doctor
  app.delete("/api/admin/doctors/:doctorId", isAdmin, async (req, res) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      await storage.deleteDoctor(doctorId);
      res.json({ message: "Doctor deleted successfully" });
    } catch (error) {
      console.error("Error deleting doctor:", error);
      res.status(500).json({ message: "Failed to delete doctor" });
    }
  });

  // Get all reviews (admin version with doctor names)
  app.get("/api/admin/reviews", isAdmin, async (req, res) => {
    try {
      const reviews = await storage.getAllReviews();
      const doctors = await storage.getAllDoctors();
      
      // Map doctor names to reviews
      const reviewsWithDoctors = reviews.map(review => {
        const doctor = doctors.find(d => d.id === review.doctorId);
        return {
          ...review,
          doctorName: doctor?.name || "Unknown",
        };
      });
      
      res.json(reviewsWithDoctors);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Delete review
  app.delete("/api/admin/reviews/:reviewId", isAdmin, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      await storage.deleteReview(reviewId);
      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Get activity logs
  app.get("/api/admin/activity", isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      // Return empty array if storage doesn't support activity logs
      if (!storage.getActivityLogs) {
        return res.json([]);
      }
      
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  return httpServer;
}
