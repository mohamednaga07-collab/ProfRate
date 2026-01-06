import crypto from "crypto";
import bcrypt from "bcrypt";
import sanitizeHtml from "sanitize-html";
import rateLimit from "express-rate-limit";
import { type Request, type Response, type NextFunction } from "express";

// Rate limiting - Prevent brute force and DoS attacks
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts per window
  message: "Too many login attempts, please try again later",
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  skip: (req) => process.env.NODE_ENV === "development", // Skip in development
  // Don't use custom keyGenerator - use defaults which handle IPv6
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 registrations per hour per IP
  message: "Too many accounts created, please try again later",
  standardHeaders: true,
  skip: (req) => process.env.NODE_ENV === "development",
  // Don't use custom keyGenerator - use defaults which handle IPv6
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
 * Verify a password against a bcrypt hash
 * Uses constant-time comparison to prevent timing attacks
 * Returns false if hash is in old SHA-256 format (for migration)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Ensure we're not comparing empty strings
    if (!password || !hash) {
      return false;
    }

    // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (hash.startsWith("$2")) {
      // bcrypt.compare uses constant-time comparison ✓
      return await bcrypt.compare(password, hash);
    }
    
    // Fallback for legacy SHA-256 hashes during migration
    // Remove this after all passwords are migrated
    const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
    // Use constant-time comparison even for legacy hashes
    return timingSafeCompare(legacyHash, hash);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Prevents attackers from learning about password structure through response times
 */
function timingSafeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");
  
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  
  // Use crypto.timingSafeEqual for constant-time comparison
  try {
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    // Lengths are different, which we already checked
    return false;
  }
}

/**
 * Generate a random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - Mix of uppercase and lowercase
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(password: string): {
  isStrong: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    feedback.push("Password must be at least 8 characters");
  } else {
    score += 25;
    if (password.length >= 12) score += 5;
    if (password.length >= 16) score += 5;
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    feedback.push("Add uppercase letters (A-Z)");
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push("Add lowercase letters (a-z)");
  }

  // Number check
  if (/\d/.test(password)) {
    score += 15;
  } else {
    feedback.push("Add numbers (0-9)");
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  } else {
    feedback.push("Add special characters (!@#$%^&*)");
  }

  // No common patterns
  const commonPatterns = [
    /123/,
    /abc/i,
    /password/i,
    /admin/i,
    /letmein/i,
    /qwerty/i,
  ];

  if (commonPatterns.some((pattern) => pattern.test(password))) {
    score = Math.max(0, score - 30);
    feedback.unshift("Avoid common patterns or dictionary words");
  }

  return {
    isStrong: score >= 40,
    score: Math.min(100, score),
    feedback,
  };
}

/**
 * Sanitize username to prevent injection attacks
 */
export function sanitizeUsername(username: string): string {
  // Allow alphanumeric, dots, underscores, hyphens, and @ (for email as username)
  return username.toLowerCase().replace(/[^a-z0-9._\-@]/g, "");
}

/**
 * Check if username is valid format
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 30) return false;
  return /^[a-z0-9._\-@]+$/.test(username.toLowerCase());}

/**
 * Validate email format (basic check)
 * For production, implement email verification
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  // Basic RFC 5322 compliant regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate first/last names
 */
export function isValidName(name: string | null): boolean {
  if (!name) return true; // Optional field
  if (name.length === 0 || name.length > 100) return false;
  // Allow letters, spaces, hyphens, apostrophes
  return /^[a-zA-Z\s\-']+$/.test(name);
}

/**
 * Track failed login attempts - Account Lockout System
 * Lock account after 5 failed attempts in 15 minutes
 */
const loginAttempts = new Map<string, number[]>();

/**
 * Record a failed login attempt
 */
export function recordLoginAttempt(username: string, ip: string, success: boolean): void {
  const key = `${username}:${ip}`;
  const now = Date.now();
  
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, []);
  }
  
  const attempts = loginAttempts.get(key)!;
  if (!success) {
    attempts.push(now);
    // Keep only recent attempts (last 24 hours)
    const cutoff = now - 24 * 60 * 60 * 1000;
    const filtered = attempts.filter(t => t > cutoff);
    loginAttempts.set(key, filtered.slice(-10));
  }
}

/**
 * Check if account is locked (5+ failed attempts in 15 minutes)
 */
export function isAccountLocked(username: string, ip: string): boolean {
  const key = `${username}:${ip}`;
  const attempts = loginAttempts.get(key) || [];
  const now = Date.now();
  const fifteenMinutesAgo = now - 15 * 60 * 1000;
  
  const recentAttempts = attempts.filter(t => t > fifteenMinutesAgo);
  return recentAttempts.length >= 5;
}

/**
 * Get remaining lockout time in seconds
 */
export function getLockoutTimeRemaining(username: string, ip: string): number {
  const key = `${username}:${ip}`;
  const attempts = loginAttempts.get(key) || [];
  
  if (attempts.length === 0) return 0;
  
  const recentAttempts = attempts.filter(t => t > Date.now() - 15 * 60 * 1000);
  if (recentAttempts.length === 0) return 0;
  
  const oldestRecentAttempt = Math.min(...recentAttempts);
  const lockoutExpiresAt = oldestRecentAttempt + 15 * 60 * 1000;
  const remaining = Math.max(0, Math.ceil((lockoutExpiresAt - Date.now()) / 1000));
  
  return remaining;
}

/**
 * Clear login attempts after successful login
 */
export function clearLoginAttempts(username: string, ip: string): void {
  const key = `${username}:${ip}`;
  loginAttempts.delete(key);
}

/**
 * CSRF Token Management
 * Store tokens in memory (with timestamp for expiration)
 * In production, use database or session storage
 */
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * Generate a CSRF token
 * Tokens expire after 1 hour
 */
export function generateCsrfToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  csrfTokens.set(sessionId, { token, expiresAt });
  return token;
}

/**
 * Validate a CSRF token
 * Returns true if token is valid and not expired
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  
  if (!stored) {
    return false;
  }
  
  const now = Date.now();
  
  // Check if token is expired
  if (now > stored.expiresAt) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  // Use constant-time comparison to prevent timing attacks
  const storedBuffer = Buffer.from(stored.token, "hex");
  const providedBuffer = Buffer.from(token, "hex");
  
  if (storedBuffer.length !== providedBuffer.length) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(storedBuffer, providedBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Clear CSRF token after successful validation (prevents token reuse)
 */
export function clearCsrfToken(sessionId: string): void {
  csrfTokens.delete(sessionId);
}

/**
 * Input Length Validation Helper
 * Prevent DoS attacks via abnormally long inputs
 */
export const MAX_INPUT_LENGTHS = {
  username: 30,
  password: 128,
  email: 254,
  firstName: 100,
  lastName: 100,
  title: 200,
  bio: 5000,
  department: 100,
  rating: 500, // For review text
  comment: 5000,
  url: 2048,
};

/**
 * Validate input length
 */
export function validateInputLength(value: string | null | undefined, maxLength: number, fieldName: string): { valid: boolean; error?: string } {
  if (!value) return { valid: true };
  
  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
  }
  
  // Check for null bytes (potential injection attack)
  if (value.includes("\0")) {
    return { valid: false, error: `${fieldName} contains invalid characters` };
  }
  
  return { valid: true };
}

/**
 * Validate all form inputs with length limits
 */
export function validateFormInputs(inputs: Record<string, any>, rules: Record<string, number>): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  for (const [field, maxLength] of Object.entries(rules)) {
    const value = inputs[field];
    const validation = validateInputLength(value, maxLength, field);
    
    if (!validation.valid && validation.error) {
      errors[field] = validation.error;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitize HTML content to prevent XSS
 * Uses strict whitelist for allowed tags and attributes
 */
export function sanitizeHtmlContent(content: string): string {
  if (!content) return "";
  
  return sanitizeHtml(content, {
    allowedTags: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    allowedAttributes: {
      "a": ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Automatically add nofollow to links
    transformTags: {
      "a": sanitizeHtml.simpleTransform("a", { rel: "nofollow noopener noreferrer", target: "_blank" }),
    },
  });
}

/**
 * CSRF Validation Middleware
 * Checks for X-CSRF-Token header in non-GET requests
 */
export async function validateCsrfHeader(req: Request, res: Response, next: NextFunction) {
  const method = req.method;
  
  // Skip CSRF check for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next();
  }
  
  const csrfToken = req.headers["x-csrf-token"] as string;
  const sessionId = req.sessionID || (req.session as any)?.id;
  
  if (!csrfToken) {
    console.warn(`[CSRF] Missing token for ${method} ${req.path} from IP: ${req.ip}`);
    return res.status(403).json({ message: "CSRF token required" });
  }
  
  if (!sessionId || !validateCsrfToken(sessionId, csrfToken)) {
    console.warn(`[CSRF] Invalid token for ${method} ${req.path} from IP: ${req.ip}`);
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  
  next();
}