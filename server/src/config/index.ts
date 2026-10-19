import "dotenv/config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${name} must be an integer, got: "${raw}"`,
    );
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const config = {
  // Runtime
  env: optional("NODE_ENV", "development") as "development" | "production" | "test",
  port: optionalInt("PORT", 3000),
  host: optional("HOST", "0.0.0.0"),

  // XML feed
  xmlFeedUrl: required("XML_FEED_URL"),
  xmlRefreshIntervalMs: optionalInt("XML_REFRESH_INTERVAL_MS", 60 * 60 * 1000), // default: 1 hour

  // CORS — empty (default) = disabled; the frontend is same-origin
  corsOrigin: optional("CORS_ORIGIN", ""),

  // Email (Resend)
  resendApiKey: optional("RESEND_API_KEY", ""),
  emailFrom: optional("EMAIL_FROM", "onboarding@resend.dev"),
  agencyEmail: optional("AGENCY_EMAIL", "pro.vizijanekretnine@gmail.com"),

  // Proxy — hosting platforms (Render etc.) put the app behind a proxy. When true,
  // the client IP is read from X-Forwarded-For so each visitor gets their own
  // rate-limit bucket. Set to "false" only if the app is exposed directly,
  // otherwise clients could spoof that header.
  trustProxy: optional("TRUST_PROXY", "true") === "true",

  // Rate limiting — applies to /api routes only (static site files are never limited)
  rateLimitMax: optionalInt("RATE_LIMIT_MAX", 300),             // general: API requests per window per IP
  rateLimitWindowMs: optionalInt("RATE_LIMIT_WINDOW_MS", 60_000), // general: window in ms (default 1 min)
  rateLimitFormsMax: optionalInt("RATE_LIMIT_FORMS_MAX", 5),     // forms: requests per window
  rateLimitFormsWindowMs: optionalInt("RATE_LIMIT_FORMS_WINDOW_MS", 60_000),

  // Development
  manualRefreshEnabled: optional("MANUAL_REFRESH_ENABLED", "false") === "true",
} as const;

export type Config = typeof config;
