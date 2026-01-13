import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./antigravityAuth";
import { insertDoctorSchema, insertReviewSchema } from "@shared/schema";
import { hashPassword, verifyPassword, validatePasswordStrength, sanitizeUsername, isValidUsername, isValidEmail, recordLoginAttempt, isAccountLocked, getLockoutTimeRemaining, clearLoginAttempts, generateCsrfToken, validateCsrfToken, clearCsrfToken, validateInputLength, validateFormInputs, MAX_INPUT_LENGTHS, validateCsrfHeader, sanitizeHtmlContent, loginLimiter, registerLimiter } from "./auth";
import { randomUUID } from "crypto";
import crypto from "crypto";
import { sendEmail, generateForgotPasswordEmailHtml, generateForgotUsernameEmailHtml, generateVerificationEmailHtml } from "./email";
import os from "os";

// Guard to prevent simultaneous duplicate registration requests
const pendingRegistrations = new Set<string>();
// Extend Express session to include userId
declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: string;
    csrfInit?: boolean;
    recaptchaVerified?: boolean;
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

  // System Health Check - Honest Metrics
  app.get("/api/health", async (req, res) => {
    try {
      // 1. Memory Usage (Process)
      const memoryUsage = process.memoryUsage();
      const heapUsed = memoryUsage.heapUsed / 1024 / 1024; // MB
      const heapTotal = memoryUsage.heapTotal / 1024 / 1024; // MB
      const memoryPercent = (heapUsed / heapTotal) * 100;

      // 2. System Load (OS)
      const loadAvg = os.loadavg()[0]; // 1-minute load average
      const cpus = os.cpus().length;
      const loadPercent = Math.min(100, (loadAvg / cpus) * 100);

      // 3. Uptime
      const uptime = process.uptime(); // seconds

      // 4. DB Latency Check
      const start = Date.now();
      await storage.getUserByUsername("admin"); // fast query
      const dbLatency = Date.now() - start;

      // Calculate composite health score (100 = perfect, 0 = critical)
      // Deduct for high memory, high load, or slow DB
      let healthScore = 100;

      if (memoryPercent > 80) healthScore -= 10;
      if (memoryPercent > 90) healthScore -= 20;

      if (loadPercent > 70) healthScore -= 10;
      if (loadPercent > 90) healthScore -= 20;

      if (dbLatency > 100) healthScore -= 5;
      if (dbLatency > 500) healthScore -= 15;
      if (dbLatency > 1000) healthScore -= 30;

      healthScore = Math.max(0, Math.round(healthScore));

      // Add a slight random jitter to "feel" alive if it's too static
      // (Real systems fluctuate slightly)
      const jitter = (Math.random() - 0.5) * 2; // +/- 1%
      healthScore = Math.min(100, Math.max(0, healthScore + jitter));

      res.json({
        percent: healthScore,
        status: healthScore > 80 ? "healthy" : healthScore > 50 ? "degraded" : "critical",
        details: {
          memory: `${Math.round(heapUsed)}MB / ${Math.round(heapTotal)}MB`,
          load: `${loadPercent.toFixed(1)}%`,
          uptime: `${Math.floor(uptime / 60)}m`,
          dbLatency: `${dbLatency}ms`
        }
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ percent: 0, status: "critical" });
    }
  });
 
  // Diagnostic endpoint for testing emails (internal use)
  app.get("/api/admin/debug-email", async (req, res) => {
    const testEmail = (req.query.to as string) || "mohamednaga07@gmail.com";
    console.log(`[DEBUG] Attempting test email to: ${testEmail}`);
    try {
      const result = await sendEmail({
        to: testEmail,
        subject: "ProfRate Email Diagnosis",
        html: "<h1>Test Email</h1><p>If you see this, your email configuration is working.</p>",
        text: "Test Email - Configuration verified."
      });
      res.json({ success: true, message: "Email triggered, check server logs for full response", sentTo: testEmail });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Maintenance endpoint to delete test users (so they can re-register)
  app.get("/api/admin/reset-user", async (req, res) => {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ message: "Email required" });

    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found", email });
      }

      await storage.deleteUser(user.id);
      console.log(`🧹 [Maintenance] User deleted: ${email} (${user.username})`);
      res.json({ success: true, message: `User ${email} has been deleted and can now re-register.`, details: user });
    } catch (error: any) {
      console.error(`❌ [Maintenance] Failed to reset user ${email}:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

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
          // PERFORMANCE OPTIMIZATION: Truncate giant base64 images in auth user object
          const responseUser = { ...user };
          if (responseUser.profileImageUrl && responseUser.profileImageUrl.length > 300000) {
            console.log(`✂️ AuthCheck: Truncating oversized profile image for ${user.username} (${Math.round(responseUser.profileImageUrl.length/1024)}KB)`);
            responseUser.profileImageUrl = responseUser.profileImageUrl.substring(0, 100) + "... (image too large)";
          }

          // Don't send password to client
          const { password, ...userWithoutPassword } = responseUser as any;
          console.log("✅ User authenticated:", user.username);
          return res.json(userWithoutPassword);
        }
      }
      
      // Fallback to OIDC if configured
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        // PERFORMANCE OPTIMIZATION: Truncate giant base64 images in auth user object
    if (req.user && req.user.profileImageUrl && req.user.profileImageUrl.length > 300000) {
      const optimizedUser = { ...req.user };
      optimizedUser.profileImageUrl = optimizedUser.profileImageUrl.substring(0, 100) + "... (image too large)";
      return res.json(optimizedUser);
    }
    return res.json(req.user);
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
        
        if (!skipRecaptcha && !recaptchaToken) {
          console.log("❌ reCAPTCHA verification required - no token and not skipping");
          return res.status(400).json({ message: "reCAPTCHA verification is required" });
        }

        if (!skipRecaptcha && recaptchaToken) {
          console.log("✅ Verifying reCAPTCHA token with Google");
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const recaptchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              signal: controller.signal,
              body: new URLSearchParams({
                secret: process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe",
                response: recaptchaToken,
              }).toString(),
            });

            clearTimeout(timeoutId);

            const recaptchaData = await recaptchaResponse.json();
            console.log("reCAPTCHA verification response:", recaptchaData);

            if (!recaptchaData.success) {
              return res.status(400).json({ message: "reCAPTCHA verification failed. Please try again." });
            }

            if (recaptchaData.score && recaptchaData.score < 0.5) {
              console.warn("⚠️  Suspicious activity detected from IP:", req.ip);
              return res.status(400).json({ message: "Suspicious activity detected. Please try again." });
            }
            
            req.session.recaptchaVerified = true;
          } catch (recaptchaError) {
            console.error("Error verifying reCAPTCHA:", recaptchaError);
            return res.status(500).json({ message: "reCAPTCHA verification error" });
          }
        } else if (skipRecaptcha) {
          console.log("✅ Skipping reCAPTCHA verification (session verified)");
          req.session.recaptchaVerified = true;
        }
      }

      const user = await storage.getUserByUsername(username);
      console.log("👤 Found user:", user ? "yes ✓" : "no ✗");
      
      if (!user || !user.password) {
        console.log("❌ User not found");
        // Reveal if username exists (User request)
        return res.status(404).json({ message: "User not found" });
      }

      // Check if email is verified (skip for admin accounts - they're created by system)
      const userRole = (user as any).role as string | undefined;
      if (user.emailVerified === false && userRole !== "admin") {
        console.log("❌ Email not verified for user:", username);
        return res.status(403).json({ 
          message: "Please verify your email address before logging in. Check your inbox for the verification link." 
        });
      }

      // STRICT LOGIN: Enforce that the provided role matches the user's registered role.
      // This prevents students from logging in through the teacher form and vice-versa.
      if (role && userRole && userRole !== role) {
        console.warn(`🚫 Role mismatch: User ${username} (registered as ${userRole}) attempted login via ${role} form.`);
        return res.status(403).json({ 
          message: `Account type mismatch. This account is registered as a ${userRole}. Please use the correct login form.` 
        });
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

      // Log user login activity
      try {
        await storage.logActivity({
          userId: user.id,
          username: user.username || username,
          role: (user as any).role || "student",
          action: "User logged in",
          type: "login",
          ipAddress: req.ip || req.headers['x-forwarded-for'] as string || "unknown",
          userAgent: req.headers['user-agent'],
        });
      } catch (err) {
        console.error("Failed to log activity:", err);
      }

      // PERFORMANCE OPTIMIZATION: Truncate giant base64 images in common responses
      const responseUser = { ...user };
      if (responseUser.profileImageUrl && responseUser.profileImageUrl.length > 300000) {
        console.log(`✂️ Login: Truncating oversized profile image for ${username} (${Math.round(responseUser.profileImageUrl.length/1024)}KB)`);
        responseUser.profileImageUrl = responseUser.profileImageUrl.substring(0, 100) + "... (image too large)";
      }

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = responseUser as any;
      console.log("✅ Login successful for:", username);
      res.json({ user: userWithoutPassword, message: "Login successful" });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed - an unexpected error occurred" });
    }
  });

  // Change Username Endpoint
  app.post("/api/auth/change-username", isAuthenticated, validateCsrfHeader, async (req: any, res) => {
    try {
      const { newUsername, currentPassword } = req.body;
      const userId = getUserId(req);

      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      if (!newUsername || !currentPassword) {
        return res.status(400).json({ message: "New username and current password are required" });
      }

      // 1. Verify specific validation rules for username
      if (!isValidUsername(newUsername)) {
        return res.status(400).json({ 
          message: "Username must be 3-30 characters and can contain letters, numbers, dots, underscores, hyphens, and @." 
        });
      }

      // 2. Fetch user to get password hash and check role
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Reserved username check - allow admins to use "Admin" (case-sensitive)
      // Block all other variations and block non-admins from using admin-like names
      if (newUsername.toLowerCase() === "admin" && user.role !== "admin") {
        return res.status(400).json({ message: "This username is reserved." });
      }

      // 3. Verify Password
      if (!user.password) {
        // Should not happen for local auth users
        return res.status(400).json({ message: "Account verification failed." });
      }
      const isPasswordValid = await verifyPassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(403).json({ message: "Incorrect current password" });
      }

      // 4. Check if new username is taken
      const existingUser = await storage.getUserByUsername(newUsername);
      if (existingUser) {
        return res.status(409).json({ message: "Username already taken" });
      }

      // 5. Update Username
      const updatedUser = await storage.updateUser(userId, { username: newUsername });

      console.log(`✅ User ${user.username} changed username to ${newUsername}`);
      
      // Don't send password back
      const { password: _, ...safeUser } = updatedUser as any;
      res.json({ user: safeUser, message: "Username updated successfully" });

    } catch (error) {
      console.error("Error changing username:", error);
      res.status(500).json({ message: "Failed to update username" });
    }
  });

  // Check if user is admin (for login UI detection)
  app.get("/api/auth/is-admin/:username", async (req, res) => {
    try {
      const username = req.params.username;
      if (!username) return res.json({ isAdmin: false });
      
      const user = await storage.getUserByUsername(username);
      // Only return true if user exists AND is admin. 
      // Return false for students, teachers, and non-existent users to minimize enumeration risks.
      if (user && user.role === "admin") {
        return res.json({ isAdmin: true });
      }
      
      return res.json({ isAdmin: false });
    } catch (error) {
       console.error("Error checking admin status:", error);
       res.json({ isAdmin: false });
    }
  });

  // Register endpoint - Protected with rate limiting
  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    console.log("\n" + "🚀".repeat(30));
    console.log("🚀 REGISTRATION REQUEST RECEIVED 🚀");
    console.log("🚀".repeat(30));
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("🚀".repeat(30) + "\n");
    
    const { username: rawUsername, email } = req.body;
    const username = rawUsername ? rawUsername.trim() : "";

    // SERVER-SIDE DUPLICATE GUARD
    const registrationKey = `${username.toLowerCase()}:${email?.toLowerCase()}`;
    if (pendingRegistrations.has(registrationKey)) {
      console.warn(`🛑 Duplicate registration attempt blocked for: ${registrationKey}`);
      return res.status(429).json({ message: "Registration is already in progress. Please wait a moment." });
    }
    
    // Track this attempt to block simultaneous ones
    pendingRegistrations.add(registrationKey);
    console.log(`🔒 Guard active for: ${registrationKey}`);
    
    try {
      const { password, firstName, lastName, role, recaptchaToken, skipRecaptcha } = req.body;
      
      console.log(`📝 Processing registration for:`, { email, username, role });

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
            // Add timeout for registration reCAPTCHA
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const recaptchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              signal: controller.signal,
              body: new URLSearchParams({
                secret: process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe",
                response: recaptchaToken,
              }).toString(),
            });

            clearTimeout(timeoutId);

            const recaptchaData = await recaptchaResponse.json();
            console.log("reCAPTCHA verification response:", recaptchaData);

            if (!recaptchaData.success) {
              console.warn(`❌ Registration reCAPTCHA failed for ${username}:`, recaptchaData["error-codes"]);
              pendingRegistrations.delete(registrationKey); // Clear guard on verification failure
              return res.status(400).json({ message: "reCAPTCHA verification failed. Please try again." });
            }

            // Check score (for v3) - scores closer to 1.0 are more human-like
            if (recaptchaData.score && recaptchaData.score < 0.5) {
              console.warn("⚠️  Suspicious registration activity from IP:", req.ip);
              pendingRegistrations.delete(registrationKey); // Clear guard on suspicious score
              return res.status(400).json({ message: "Suspicious activity detected. Please try again." });
            }
          } catch (recaptchaError) {
            console.error("Error verifying reCAPTCHA:", recaptchaError);
            pendingRegistrations.delete(registrationKey); // Clear guard on API error
            return res.status(500).json({ message: "reCAPTCHA verification error" });
          }
        }
      }

      // Only allow student and teacher roles during registration
      // Admin role can only be assigned by existing admins or through admin creation endpoint
      if (!role || !["student", "teacher"].includes(role)) {
        console.warn(`⚠️  Attempt to register with invalid role: ${role}`);
        return res.status(400).json({ message: "Valid role is required (student or teacher). Admin accounts are created by administrators only." });
      }

      // Prevent users from choosing "admin" as username (case-insensitive)
      if (username.toLowerCase() === "admin") {
        console.warn(`⚠️  Attempt to register with reserved username: ${username}`);
        return res.status(400).json({ message: "This username is reserved and cannot be used. Please choose a different username." });
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
        pendingRegistrations.delete(registrationKey);
        return res.status(409).json({ message: "Email already associated with an account" });
      }

      // Hash password and create user (async operation)
      console.log("🔐 Hashing password with bcrypt for new user:", username);
      const hashedPassword = await hashPassword(password);
      
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      
      const newUser = await storage.createUser({
        id: randomUUID(),
        username,
        password: hashedPassword,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
        emailVerified: false,
        verificationToken,
      });

      console.log("✅ New user created:", username, "with role:", role);

      // Send verification email
      const appUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:5173";
      console.log(`📧 [Registration] APP_URL for verification link: ${appUrl}`);
      
      const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`;
      console.log(`📧 [Registration] Full verification link: ${verificationLink}`);
      
      const emailHtml = generateVerificationEmailHtml(username, verificationLink, newUser.profileImageUrl);
      const emailText = `Hi ${username},\n\nThank you for registering! Please verify your email address: ${verificationLink}\n\nOnce verified, you'll be able to log in.`;
      
      // Send verification email asynchronously (non-blocking) so registration is instant
      setImmediate(async () => {
        try {
          console.log(`📧 [Async Registration] Attempting to send verification email to: ${email}`);
          await sendEmail({
            to: email,
            subject: "Verify Your Campus Ratings Account",
            html: emailHtml,
            text: emailText,
          });
          console.log(`✅ [Async Registration] Verification email sent successfully to ${email}`);
        } catch (emailError: any) {
          console.error(`❌ [Async Registration] Failed to send verification email to ${email}:`, emailError.message || emailError);
        }
      });

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = newUser as any;
      res.json({ 
        user: userWithoutPassword,
        message: "Registration successful. Please check your email to verify your account."
      });
      
      // Request successful, release the guard
      pendingRegistrations.delete(registrationKey);
      console.log(`🔓 Guard released for: ${registrationKey} (SUCCESS)`);
    } catch (error) {
      // Request failed, release the guard
      pendingRegistrations.delete(registrationKey);
      console.log(`🔓 Guard released for: ${registrationKey} (ERROR)`);
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

  // Health Check
  app.get("/api/health", async (req, res) => {
    try {
      // Check DB connectivity by running a lightweight query
      // We'll use getStats as it's already there, or we could add a specific check.
      // If this succeeds, the DB and Server are both operational.
      await storage.getStats(); 
      res.json({ status: "ok", percent: 100 });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({ status: "error", percent: 0 });
    }
  });

  // Doctor routes
  app.get("/api/doctors", async (req, res) => {
    try {
      const doctors = await storage.getAllDoctors();
      
      // PERFORMANCE OPTIMIZATION: Truncate giant base64 images in list view
      const optimizedDoctors = doctors.map(doctor => {
        if (doctor.profileImageUrl && doctor.profileImageUrl.length > 50000) {
          return {
            ...doctor,
            profileImageUrl: doctor.profileImageUrl.substring(0, 100) + "... (large image)"
          };
        }
        return doctor;
      });
      
      res.json(optimizedDoctors);
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
      const { email: rawEmail } = req.body;
      const email = rawEmail ? rawEmail.trim() : "";
      console.log(`\n${'='.repeat(40)}`);
      console.log(`[FORGOT-PASSWORD] Initializing request for: '${email}'`);
      
      if (!email) {
        console.log(`[FORGOT-PASSWORD] ❌ Rejected: Email is missing`);
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`[FORGOT-PASSWORD] ℹ️  User not found for email: '${email}'. Returning success for security.`);
        // For security, don't reveal if email exists
        return res.status(200).json({ message: "If an account exists, a reset link has been sent." });
      }

      console.log(`[FORGOT-PASSWORD] ✅ User found: ${user.username} (ID: ${user.id})`);

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      try {
        await storage.updateUserResetToken(user.id, resetToken, resetTokenExpiry);
        console.log(`[FORGOT-PASSWORD] ✅ Reset token stored in DB for ${user.username}`);
      } catch (dbError: any) {
        console.error("[FORGOT-PASSWORD] ❌ Database error updating reset token:", dbError);
        return res.status(500).json({ message: `Database error: ${dbError.message}` });
      }

      // Robust Link Generation
      let baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:5173";
      // Remove trailing slash if present to avoid double slashes
      baseUrl = baseUrl.replace(/\/$/, "");
      
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
      console.log(`[FORGOT-PASSWORD] 🔗 Generated link: ${resetLink}`);
      
      const emailHtml = generateForgotPasswordEmailHtml(user.username || "User", resetLink, user.profileImageUrl);
      const emailText = `Hi ${user.username || "User"},\n\nWe received a request to reset your password.\n\nReset your password: ${resetLink}\n\nThis link will expire in 24 hours. If you didn’t request this, you can ignore this email.`;
      
      // Use setImmediate to send email asynchronously (non-blocking) similar to registration
      setImmediate(async () => {
        try {
          console.log(`[FORGOT-PASSWORD] 📧 Attempting to dispatch email to: ${email}`);
          await sendEmail({
            to: email,
            subject: "Reset Your Campus Ratings Password",
            html: emailHtml,
            text: emailText,
          });
          console.log(`[FORGOT-PASSWORD] ✅ Email successfully dispatched to ${email}`);
        } catch (emailError: any) {
          console.error(`[FORGOT-PASSWORD] ❌ DISPATCH FAILED for ${email}:`, emailError.message || emailError);
        }
      });

      console.log(`[FORGOT-PASSWORD] 🏁 Request accepted. Dispatched async. Returning 200.`);
      console.log(`${'='.repeat(40)}\n`);
      res.status(200).json({ message: "If an account exists, a reset link has been sent." });
    } catch (error: any) {
      console.error("[FORGOT-PASSWORD] ❌ Unexpected fatal error:", error);
      res.status(500).json({ message: `Unexpected error: ${error.message}` });
    }
  });

  app.post("/api/auth/reset-password", async (req: any, res) => {
    try {
      const { token, newPassword } = req.body;
      console.log(`[RESET-PASSWORD] Processing reset request for token: ${token ? token.substring(0, 8) + '...' : 'NONE'}`);
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry) {
        console.log(`[RESET-PASSWORD] ❌ Invalid or missing expiry for token: ${token.substring(0, 8)}...`);
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
      const { email: rawEmail } = req.body;
      const email = rawEmail ? rawEmail.trim() : "";
      console.log(`[forgot-username] Received request for email: '${email}'`);
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      console.log(`[forgot-username] Found user: ${user ? user.username : "NOT FOUND"}`);
      
      if (!user) {
        // For security, don't reveal if email exists
        return res.status(200).json({ message: "If an account exists, your username has been sent to the email on file." });
      }

      // Robust Link Generation
      let baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:5173";
      baseUrl = baseUrl.replace(/\/$/, "");
      const loginLink = `${baseUrl}/login`;

      // Send email with username
      console.log(`[forgot-username] Sending email to ${email}`);
      const emailHtml = generateForgotUsernameEmailHtml(user.username || "Your Username", loginLink, user.profileImageUrl);
      
      try {
        await sendEmail({
          to: email,
          subject: "Your Campus Ratings Username",
          html: emailHtml,
        });
      } catch (emailError: any) {
        console.error("Email sending failed:", emailError);
        return res.status(500).json({ message: `Email sending failed: ${emailError.message}` });
      }

      res.status(200).json({ message: "If an account exists, your username has been sent to the email on file." });
    } catch (error: any) {
      console.error("Unexpected error in forgot username:", error);
      res.status(500).json({ message: `Failed to process forgot username request: ${error.message}` });
    }
  });

  // Email Verification Route
  app.get("/api/auth/verify-email", async (req: any, res) => {
    try {
      const { token } = req.query;
      console.log(`[verify-email] Received verification request with token: ${token ? token.substring(0, 8) + '...' : 'NONE'}`);
      
      if (!token) {
        return res.status(400).json({ message: "auth.verify.noToken" });
      }

      const user = await storage.getUserByVerificationToken(token as string);
      console.log(`[verify-email] Found user: ${user ? user.username : "NOT FOUND"}`);
      
      if (!user) {
        console.log(`[verify-email] ❌ Invalid token provided: ${token?.substring(0, 8)}...`);
        return res.status(400).json({ 
          message: "auth.verify.invalidToken"
        });
      }

      // Verify the user's email
      await storage.verifyUserEmail(user.id);
      console.log(`[verify-email] ✅ Email verified for user: ${user.username}`);

      res.status(200).json({ 
        message: "auth.verify.successMsg",
        username: user.username
      });
    } catch (error: any) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "auth.verify.errorMsg" });
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
      const stats = await storage.getStats();
      // Add pending reports placeholder if needed, or remove if not used
      res.json({
        ...stats,
        pendingReports: 0, 
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
      // Remove passwords from response and truncate giant images
      const safeUsers = users.map(({ password, resetToken, resetTokenExpiry, ...user }) => {
        const optimizedUser = { ...user };
        if (optimizedUser.profileImageUrl && optimizedUser.profileImageUrl.length > 50000) {
          optimizedUser.profileImageUrl = optimizedUser.profileImageUrl.substring(0, 100) + "... (large image)";
        }
        return optimizedUser;
      });
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

      // Prevent self-demotion
      const currentUserId = getUserId(req);
      if (userId === currentUserId && role !== "admin") {
        return res.status(403).json({ message: "You cannot remove your own admin privileges" });
      }
      

      
      await storage.updateUserRole(userId, role);

      // Audit Log
      try {
        const adminUser = await storage.getUser(currentUserId!);
        if (adminUser) {
          await storage.logActivity({
            userId: adminUser.id,
            username: adminUser.username || "Unknown",
            role: adminUser.role,
            action: `Changed role of user ${userId} to ${role}`,
            type: "admin_action",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          });
        }
      } catch (logError) {
        console.error("Failed to log admin activity:", logError);
      }

      console.log(`[Admin] Role updated for user ${userId} to ${role}`);
      res.json({ message: "Role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Create new admin (admin-only endpoint)
  app.post("/api/admin/create-admin", isAdmin, validateCsrfHeader, async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if already admin
      if (user.role === "admin") {
        return res.status(400).json({ message: "User is already an admin" });
      }
      
      // Update role to admin
      await storage.updateUserRole(userId, "admin");
      
      console.log(`✅ [Admin] New admin created: ${user.username} (ID: ${userId})`);
      console.log(`   Created by: ${(req.session as any).userId}`);
      
      res.json({ 
        message: `✅ Successfully promoted ${user.username} to admin`, 
        user: { ...user, role: "admin" } 
      });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  // Delete user
  app.delete("/api/admin/users/:userId", isAdmin, validateCsrfHeader, async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`[Admin] Deleting user ${userId}`);
      
      // Check if user exists first
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent self-deletion
      const currentUserId = getUserId(req);
      if (userId === currentUserId) {
        return res.status(403).json({ message: "You cannot delete your own account while logged in" });
      }

      await storage.deleteUser(userId);

      // Audit Log
      try {
        const adminUser = await storage.getUser(currentUserId!);
        if (adminUser) {
          await storage.logActivity({
            userId: adminUser.id,
            username: adminUser.username || "Unknown",
            role: adminUser.role,
            action: `Deleted user ${user.username} (${userId})`,
            type: "admin_action",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          });
        }
      } catch (logError) {
        console.error("Failed to log admin activity:", logError);
      }

      console.log(`[Admin] User ${userId} deleted`);
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: `Failed to delete user: ${error.message}` });
    }
  });

  // Delete user by email (for cleanup/testing)
  app.delete("/api/admin/users/by-email/:email", isAdmin, validateCsrfHeader, async (req, res) => {
    try {
      const { email } = req.params;
      console.log(`[Admin] Deleting user by email: ${email}`);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found with that email" });
      }
      
      await storage.deleteUser(user.id);
      console.log(`✅ [Admin] User deleted by email: ${user.username} (${email})`);
      res.json({ message: `User ${user.username} deleted successfully` });
    } catch (error: any) {
      console.error("Error deleting user by email:", error);
      res.status(500).json({ message: `Failed to delete user: ${error.message}` });
    }
  });

  // Get all doctors (admin version with full details)
  app.get("/api/admin/doctors", isAdmin, async (req, res) => {
    try {
      const doctors = await storage.getAllDoctors();
      
      // PERFORMANCE OPTIMIZATION: Truncate giant base64 images in admin list view
      const optimizedDoctors = doctors.map(doctor => {
        if (doctor.profileImageUrl && doctor.profileImageUrl.length > 50000) {
          return {
            ...doctor,
            profileImageUrl: doctor.profileImageUrl.substring(0, 100) + "... (large image)"
          };
        }
        return doctor;
      });
      
      res.json(optimizedDoctors);
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
      
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Upload profile picture (converts to base64 data URL)
  app.post("/api/auth/upload-profile-picture", isAuthenticated, async (req, res) => {
    try {
      console.log('📸 [Upload] Received profile picture upload request');
      
      const userId = getUserId(req);
      if (!userId) {
        console.log('📸 [Upload] No user ID in session');
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log('📸 [Upload] User ID:', userId);

      const user = await storage.getUser(userId);
      if (!user) {
        console.log('📸 [Upload] User not found in database');
        return res.status(404).json({ message: "User not found" });
      }

      console.log('📸 [Upload] User found:', user.username);

      // Get image data from request body (base64)
      const { imageData } = req.body;
      if (!imageData) {
        console.log('📸 [Upload] No image data in request body');
        return res.status(400).json({ message: "No image data provided" });
      }

      console.log('📸 [Upload] Image data length:', imageData.length);

      // Validate it's a reasonable data URL
      if (!imageData.startsWith("data:image/")) {
        console.log('📸 [Upload] Invalid image format');
        return res.status(400).json({ message: "Invalid image format" });
      }

      // Higher limit for animations (45MB base64 allows ~33MB binary file)
      if (imageData.length > 45 * 1024 * 1024) {
        console.log('📸 [Upload] Image too large:', imageData.length);
        return res.status(413).json({ message: "Image too large (max 30MB binary)" });
      }

      console.log('📸 [Upload] Updating user in database...');

      // Update user with new profile picture
      const updatedUser = await storage.updateUser(userId, {
        profileImageUrl: imageData,
      });

      console.log(`📸 [Upload] ✅ Profile picture updated for user: ${user.username}`);
      console.log(`📸 [Upload] Updated user has profileImageUrl:`, updatedUser.profileImageUrl ? 'YES' : 'NO');

      // Sync with Doctor profile if user is a teacher or admin
      if (updatedUser.role === 'teacher' || updatedUser.role === 'admin') {
        try {
          console.log(`📸 [Sync] Checking for linked doctor profile for user: ${updatedUser.username}`);
          const doctors = await storage.getAllDoctors();
          
          let matchedDoctor = null;
          
          // Try to match by First Last name
          if (updatedUser.firstName && updatedUser.lastName) {
             const fullName = `${updatedUser.firstName} ${updatedUser.lastName}`;
             matchedDoctor = doctors.find(d => 
               d.name.toLowerCase().includes(fullName.toLowerCase()) || 
               fullName.toLowerCase().includes(d.name.replace("Dr. ", "").trim().toLowerCase())
             );
          }
          
          // Fallback: match by username if no match yet (and username is not "admin")
          if (!matchedDoctor && updatedUser.username && updatedUser.username.toLowerCase() !== 'admin') {
             const username = updatedUser.username;
             matchedDoctor = doctors.find(d => d.name.toLowerCase().includes(username.toLowerCase()));
          }

          if (matchedDoctor) {
             console.log(`📸 [Sync] Found matching doctor: ${matchedDoctor.name} (ID: ${matchedDoctor.id})`);
             await storage.updateDoctor(matchedDoctor.id, { profileImageUrl: imageData });
             console.log(`📸 [Sync] ✅ Updated doctor profile picture`);
          } else {
             console.log(`📸 [Sync] No matching doctor found for syncing`);
          }
        } catch (syncError) {
           console.error("📸 [Sync] Failed to sync with doctor profile:", syncError);
           // Don't fail the main request, just log it
        }
      }

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = updatedUser as any;
      
      console.log(`📸 [Upload] Sending response with user data`);
      
      res.json({ 
        user: userWithoutPassword,
        message: "Profile picture updated successfully" 
      });
    } catch (error) {
      console.error("📸 [Upload] ❌ Error uploading profile picture:", error);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });



  // Delete user
  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Prevent self-deletion
      if ((req.user as any).id === userId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      await storage.deleteUser(userId);

      // Log the activity
      await storage.logActivity({
        userId: (req.user as any).id,
        username: (req.user as any).username,
        role: "admin",
        action: "deleted user",
        type: "admin",
      });

      res.json({ message: "User deleted successfully" });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Profile Image Fetch (for full-size truncated images)
  app.get("/api/profile-image/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;
      let profileImageUrl: string | null = null;

      if (type === "user") {
        const user = await storage.getUser(id);
        profileImageUrl = user?.profileImageUrl || null;
      } else if (type === "doctor") {
        const doctor = await storage.getDoctor(parseInt(id));
        profileImageUrl = doctor?.profileImageUrl || null;
      }

      if (!profileImageUrl || !profileImageUrl.startsWith("data:image/")) {
        console.log(`🖼️ [ProfileImage] No valid image for ${type} ${id}`);
        return res.status(404).json({ message: "Image not found" });
      }

      console.log(`🖼️ [ProfileImage] Serving binary image for ${type} ${id} (${Math.round(profileImageUrl.length/1024)}KB)`);
      
      try {
        const [meta, data] = profileImageUrl.split(",");
        const contentType = meta.split(";")[0].split(":")[1];
        const buffer = Buffer.from(data, "base64");
        
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
        res.send(buffer);
      } catch (parseError) {
        console.error("Error parsing base64 image:", parseError);
        res.status(500).json({ message: "Failed to process image" });
      }
    } catch (error) {
      console.error("Error fetching profile image:", error);
      res.status(500).json({ message: "Failed to fetch profile image" });
    }
  });

  // Catch-all for API routes to prevent fallback to client routing (which causes loops)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  // Admin Email Diagnostic
  app.post("/api/admin/debug-email", isAdmin, validateCsrfHeader, async (req, res) => {
    try {
      const { testEmail } = req.body;
      const target = testEmail || "mohamednaga09@gmail.com";
      
      console.log(`🧪 [DEBUG EMAIL] Starting diagnostic test for: ${target}`);
      
      const result = await sendEmail({
        to: target,
        subject: "Campus Ratings Diagnostic Test",
        text: "This is a diagnostic test to verify your email server configuration. If you received this, your email setup is WORKING CORRECTLY.",
        html: "<h1>Email Diagnostic</h1><p>This is a diagnostic test to verify your email server configuration.</p><p>If you received this, your email setup is <b>WORKING CORRECTLY</b>.</p>"
      });

      if (result) {
        res.json({ 
          success: true, 
          message: `✅ Diagnostic email sent to ${target}. Please check your inbox and SPAM folder.` 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "❌ Email service failed to send the message. Check server logs for specific error details.",
          troubleshooting: "Common issues: Invalid RESEND_API_KEY, Gmail SMTP block, or missing environment variables."
        });
      }
    } catch (error: any) {
      console.error("❌ [DEBUG EMAIL] Fatal error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Fatal error in diagnostic tool",
        error: error.message
      });
    }
  });

  return httpServer;
}
