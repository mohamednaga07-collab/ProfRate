import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

const app = express();
const httpServer = createServer(app);

process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandledRejection", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[process] uncaughtException", err);
});

httpServer.on("error", (err) => {
  console.error("[http] server error", err);
});

httpServer.on("close", () => {
  log("server closed", "http");
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security headers middleware using Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://www.googletagmanager.com",
          "https://www.google.com/recaptcha/",
          "https://www.gstatic.com/recaptcha/",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: [
          "'self'",
          "https://www.google.com/recaptcha/",
          "https://www.gstatic.com/",
        ],
        frameSrc: ["https://www.google.com/recaptcha/"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // Prevent MIME-type sniffing
    noSniff: true,
    // Prevent clickjacking attacks
    frameguard: { action: "deny" },
    // Enable HSTS
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Referrer policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// Custom security headers and cache control
app.use((req: Request, res: Response, next: NextFunction) => {
  // Extra security header for older browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Disable caching for sensitive content
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  // Permissions Policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );

  next();
});

// Request size limits - Prevent DoS attacks (except for profile picture uploads)
app.use(
  express.json({
    limit: "50mb", // Increased to 50MB to support large GIF animations without truncation
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(
  express.urlencoded({
    limit: "10kb", // Limit URL-encoded payload to 10KB
    extended: false,
  }),
);

// Rate limiting
// Rate limiting
const isDev = String(process.env.NODE_ENV).trim() === "development";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

// Apply rate limiting to API routes only in production
if (!isDev) {
  app.use("/api", limiter);
  console.log("🔒 Rate limiting enabled");
} else {
  console.log("🔓 Rate limiting disabled for development");
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        // Safe stringify to prevent logging massive chunks of data (like base64 images)
        const jsonStr = JSON.stringify(capturedJsonResponse);
        if (jsonStr.length > 200) {
          logLine += ` :: ${jsonStr.slice(0, 200)}... (truncated ${jsonStr.length} chars)`;
        } else {
          logLine += ` :: ${jsonStr}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === "development";
    
    // Log full error with stack trace internally (for debugging)
    console.error("❌ Server Error:", {
      status,
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });

    // Never expose internal error details to clients in production
    let message = err.message || "Internal Server Error";
    
    // In production, return generic error message
    if (!isDevelopment) {
      if (status >= 500) {
        message = "An unexpected error occurred. Please try again later.";
      } else if (status >= 400) {
        message = err.message || "Bad Request";
      }
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // Default to IPv4 any-address for best Windows compatibility.
  // If you need a different bind address, set HOST.
  const host = process.env.HOST || "0.0.0.0";

  httpServer.on("error", (err: any) => {
    console.error("Server error:", err);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled rejection at:", promise, "reason:", reason);
  });

  const onListening = () => {
    const addr = httpServer.address();
    if (addr && typeof addr === "object") {
      log(`serving on ${addr.address}:${addr.port}`);
    } else {
      log(`serving on port ${port}`);
    }
  };

  httpServer.listen(port, host, onListening);
})();
