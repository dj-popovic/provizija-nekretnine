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

  // CORS (placeholder — wired up in Phase 12)
  corsOrigin: optional("CORS_ORIGIN", "*"),

  // Email (placeholder — wired up in Phase 11)
  emailFrom: optional("EMAIL_FROM", ""),
  emailSmtpHost: optional("EMAIL_SMTP_HOST", ""),
  emailSmtpPort: optionalInt("EMAIL_SMTP_PORT", 587),
  emailSmtpUser: optional("EMAIL_SMTP_USER", ""),
  emailSmtpPass: optional("EMAIL_SMTP_PASS", ""),

  // Development
  manualRefreshEnabled: optional("MANUAL_REFRESH_ENABLED", "false") === "true",
} as const;

export type Config = typeof config;
