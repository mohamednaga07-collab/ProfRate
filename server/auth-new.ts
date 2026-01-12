import crypto from "crypto";
import bcrypt from "bcrypt";
import sanitizeHtml from "sanitize-html";
import rateLimit from "express-rate-limit";
import { type Request, type Response, type NextFunction } from "express";

// Rate limiting - Prevent brute force and DoS attacks
// Username-based rate limiting for login - allows multiple users from same IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per username per window (increased for better UX)
  message: "Too many login attempts for this account, please try again later",
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  skip: (req) => process.env.NODE_ENV === "development", // Skip in development
  keyGenerator: (req) => {
    // Use username from request body for rate limiting
    // This allows multiple users to login from same IP simultaneously
    const username = req.body?.username || req.ip;
    return `login:${username}`;
  },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 registrations per hour per IP (increased for global use)
  message: "Too many accounts created from this network, please try again later",
  standardHeaders: true,
  skip: (req) => process.env.NODE_ENV === "development",
  // Keep IP-based for registration to prevent abuse
});

const BCRYPT_ROUNDS = 12; // Higher rounds = more secure but slower

/**
 * Hash a password using bcrypt (industry standard)
 * Bcrypt is significantly more secure than SHA-256 because:
 * - It's slow (intentionally) - makes brute force attacks impractical
 * - It includes salt automatically
 * - It's resistant to GPU/ASIC attacks
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate password is not empty
  if (!password || password.trim().length === 0) {
    throw new Error("Password cannot be empty");
  }
  
  // Validate password length (min 8, max 128 characters)
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }
  
  if (password.length > 128) {
    throw new Error("Password must not exceed 128 characters");
  }

  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Validate inputs
  if (!password || !hash) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

/**
 * Validate password strength
 * Returns a strength score from 0-100
 */
export function validatePasswordStrength(password: string): {
  score: number;
  isValid: boolean;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check (minimum 8 characters)
  if (password.length < 8) {
    feedback.push("Password must be at least 8 characters long");
    return { score: 0, isValid: false, feedback };
  }

  // Length scoring
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push("Password should contain lowercase letters");
  }

  // Uppercase check (optional but recommended)
  if (/[A-Z]/.test(password)) {
    score += 15;
  }
  // Removed mandatory uppercase check

  // Number check
  if (/\d/.test(password)) {
    score += 15;
  } else {
    feedback.push("Password should contain numbers");
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  }

  // No common patterns
  const commonPatterns = ["password", "123456", "qwerty", "abc123", "admin"];
  const lowerPassword = password.toLowerCase();
  if (commonPatterns.some((pattern) => lowerPassword.includes(pattern))) {
    score -= 20;
    feedback.push("Password contains common patterns");
  }

  // Determine validity - require at least 40 points (Fair)
  const isValid = score >= 40;

  if (!isValid && feedback.length === 0) {
    feedback.push("Password is too weak");
  }

  return { score: Math.max(0, Math.min(100, score)), isValid, feedback };
}

/**
 * Sanitize username to prevent injection attacks
 * Allows only alphanumeric, dots, underscores, and hyphens
 */
export function sanitizeUsername(username: string): string {
  if (!username) return "";

  // Remove any characters that aren't alphanumeric, dots, underscores, or hyphens
  const sanitized = username.toLowerCase().replace(/[^a-z0-9._-]/g, "");

  // Ensure it doesn't start with a dot
  return sanitized.replace(/^\.+/, "");
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  if (!username) return false;

  // Must be 3-30 characters
  if (username.length < 3 || username.length > 30) return false;

  // Must only contain lowercase alphanumeric, dots, underscores, hyphens
  if (!/^[a-z0-9._-]+$/.test(username)) return false;

  // Cannot start with a dot
  if (username.startsWith(".")) return false;

  return true;
}

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return sanitize-html(input, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {},
  });
}

/**
 * Generate a secure random token
 */
export function generateToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) return false;

  // Additional length check
  if (email.length > 254) return false;

  return true;
}

/**
 * Role validation
 */
const VALID_ROLES = ["student", "teacher", "admin"] as const;
export type UserRole = (typeof VALID_ROLES)[number];

export function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

/**
 * Middleware to require authentication
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

/**
 * Middleware to require specific role
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userRole = req.session.userRole as UserRole;
    if (!roles.includes(userRole)) {
      res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      return;
    }

    next();
  };
}

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole("admin");

/**
 * Calculate password hash time for monitoring
 */
export async function benchmarkBcrypt(): Promise<number> {
  const start = Date.now();
  await bcrypt.hash("test-password-for-benchmark", BCRYPT_ROUNDS);
  const duration = Date.now() - start;
  console.log(`[Security] Bcrypt hash time: ${duration}ms (target: ~100ms)`);
  return duration;
}

// Log bcrypt performance on module load (helps detect issues early)
benchmarkBcrypt().catch(console.error);
