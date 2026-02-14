import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import memorystore from "memorystore";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";

const getOidcConfig = memoize(
  async () => {
    const replId = process.env.REPL_ID;
    if (!replId) {
      const isDev = process.env.NODE_ENV === "development";
      if (isDev) {
        console.warn("⚠️  Warning: REPL_ID not set. Auth will be disabled in development.");
        console.warn("   Set REPL_ID in .env for OpenID Connect authentication.");
        return null;
      }
      console.warn("⚠️  REPL_ID not set. OIDC auth will be disabled.");
      return null;
    }
    try {
      // Add timeout to prevent blocking server startup if Replit OIDC is unreachable
      const discoveryPromise = client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        replId
      );
      
      const config = await Promise.race([
        discoveryPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OIDC discovery timeout')), 5000)
        )
      ]);
      
      return config;
    } catch (error) {
      console.error("❌ Failed to fetch OIDC configuration:", error);
      console.log("⚠️  Continuing without OpenID Connect authentication");
      return null;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const MemoryStore = memorystore(session);
  
  // Use memory store if no database is configured (dev or prod without DB)
  if (!process.env.DATABASE_URL || !pool) {
    console.log("⚠️  Using MemoryStore for sessions (no DATABASE_URL provided)");
    return session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      store: new MemoryStore({ checkPeriod: sessionTtl }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // 'lax' is safer for general navigation than 'strict' which can block auth redirects
        maxAge: sessionTtl,
      },
    });
  }

  const pgStore = connectPg(session);
  
  // Manually create session table if it doesn't exist
  // This avoids the table.sql file dependency issue in production builds
  pool.query(`
    CREATE TABLE IF NOT EXISTS session (
      sid varchar NOT NULL COLLATE "default",
      sess json NOT NULL,
      expire timestamp(6) NOT NULL,
      CONSTRAINT session_pkey PRIMARY KEY (sid)
    );
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
  `).catch((err) => {
    console.error('Failed to create session table:', err);
  });
  
  const sessionStore = new pgStore({
    pool: pool, // Use the shared pool with correct SSL settings
    createTableIfMissing: false, // We create it manually above
    ttl: sessionTtl, // in seconds for connect-pg-simple, effectively
    tableName: "session", // "session" is the default standard name
    pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 min
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = (await getOidcConfig()) as client.Configuration | null;
  
  if (!config) {
    // Auth disabled in development without REPL_ID
    console.log("✓ Auth disabled (no REPL_ID set)");
    // Register lightweight fallback routes so client requests to /api/login
    // and /api/logout don't return 404 in development.
    app.get("/api/login", (req, res) => {
      // Redirect to the client landing page and signal the UI to open
      // the role selector via a query parameter.
      res.redirect("/?showRoleSelect=1");
    });

    app.get("/api/logout", (req, res) => {
      // In dev mode, just destroy the session if present and redirect home.
      try {
        req.logout?.(() => {});
      } catch (e) {
        // ignore
      }
      res.redirect("/");
    });

    return;
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `antigravityauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`antigravityauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`antigravityauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Check session-based auth first (username/password)
  if (req.session?.userId) {
    return next();
  }

  // In dev mode without OIDC, skip OIDC auth check
  if (!process.env.REPL_ID) {
    console.log("⚠️  No session and no REPL_ID - user not authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = (await getOidcConfig()) as client.Configuration | null;
    if (!config) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
