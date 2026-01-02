import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertDoctorSchema, insertReviewSchema } from "@shared/schema";
import { hashPassword, verifyPassword } from "./auth";
import { randomUUID } from "crypto";

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
      
      console.log("⚠️  No authenticated user found");
      return res.json(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("🔐 Login attempt for username:", username);

      if (!username || !password) {
        console.log("❌ Missing username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      console.log("👤 Found user:", user ? "yes ✓" : "no ✗");
      
      if (!user || !user.password) {
        console.log("❌ User not found");
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const isValid = verifyPassword(password, user.password);
      console.log("🔑 Password valid:", isValid ? "yes ✓" : "no ✗");
      
      if (!isValid) {
        console.log("❌ Invalid password for user:", username);
        return res.status(401).json({ message: "Invalid password - the password you entered is incorrect. Please check your password." });
      }

      // Set session and save it
      if (req.session) {
        req.session.userId = user.id;
        console.log("📝 Session set for user:", user.id);
        
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

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user as any;
      console.log("✅ Login successful for:", username);
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed - an unexpected error occurred" });
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, firstName, lastName, role, recaptchaToken } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (!recaptchaToken) {
        return res.status(400).json({ message: "reCAPTCHA verification is required" });
      }

      // Verify reCAPTCHA token with Google
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
          return res.status(400).json({ message: "Suspicious activity detected. Please try again." });
        }
      } catch (recaptchaError) {
        console.error("Error verifying reCAPTCHA:", recaptchaError);
        return res.status(500).json({ message: "reCAPTCHA verification error" });
      }

      if (!role || !["student", "teacher", "admin"].includes(role)) {
        return res.status(400).json({ message: "Valid role is required (student, teacher, or admin)" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = hashPassword(password);
      const newUser = await storage.createUser({
        id: randomUUID(),
        username,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
      });

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

  app.post("/api/doctors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);

      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Only admins can add doctors" });
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

  app.patch("/api/doctors/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/doctors/:id", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/doctors/:id/reviews", isAuthenticated, async (req: any, res) => {
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

  return httpServer;
}
