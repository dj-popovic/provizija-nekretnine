import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { config } from "../config/index.js";
import { runSync } from "../modules/xml-sync/index.js";
import { healthRoutes } from "../modules/health/routes.js";
import { statusRoutes } from "../modules/health/status-routes.js";
import { propertiesRoutes } from "../modules/properties/routes.js";
import { agentsRoutes } from "../modules/agents/routes.js";
import { homeRoutes } from "../modules/home/routes.js";
import { formsRoutes } from "../modules/forms/routes.js";

// ---------------------------------------------------------------------------
// Content-Security-Policy
//
// Whitelist of everything the frontend loads. Anything else (e.g. injected
// script) is blocked by the browser. When the frontend starts loading a new
// external resource, add its source here — otherwise it will silently fail.
// CDN sources are pinned to the exact package paths: jsdelivr hosts every npm
// package, so allowing the whole domain would allow any script.
// ---------------------------------------------------------------------------

const CDN_BOOTSTRAP = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/";
const CDN_BOOTSTRAP_ICONS = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/";

const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", CDN_BOOTSTRAP],
  scriptSrcAttr: ["'none'"], // no inline onclick= handlers
  // Inline style="" attributes are used throughout the generated HTML
  styleSrc: ["'self'", "'unsafe-inline'", CDN_BOOTSTRAP, CDN_BOOTSTRAP_ICONS, "https://fonts.googleapis.com"],
  fontSrc: ["'self'", CDN_BOOTSTRAP_ICONS, "https://fonts.gstatic.com"],
  // Property photos come from RELPER; unsplash / randomuser are placeholders
  // on o-nama.html (to be replaced before production)
  imgSrc: ["'self'", "data:", "https://*.relper.com", "https://images.unsplash.com", "https://randomuser.me"],
  // CDN path only so DevTools can fetch Bootstrap's .map files (no effect for visitors)
  connectSrc: ["'self'", CDN_BOOTSTRAP],
  frameSrc: ["https://maps.google.com", "https://www.google.com"], // kontakt.html map
  frameAncestors: ["'none'"], // nobody may embed the site (clickjacking)
  formAction: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  // Only in production: on plain-http localhost it would break local dev
  upgradeInsecureRequests: config.env === "production" ? [] : null,
};

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
    // Behind the hosting proxy, request.ip is the visitor's IP, not the proxy's
    trustProxy: config.trustProxy,
  });

  // The API accepts JSON only. Fastify also parses text/plain by default — the
  // one body type another website can POST cross-site without a CORS
  // preflight — so it is removed; such requests get 415.
  app.removeContentTypeParser("text/plain");

  // Security headers: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, …
  void app.register(helmet, {
    contentSecurityPolicy: { directives: CSP_DIRECTIVES },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });

  // CORS — off by default: the frontend is served from this same origin and
  // needs none. Enabling it for "*" would let any website submit our forms
  // from its visitors' browsers. Set CORS_ORIGIN only if a separate frontend
  // domain ever needs the API.
  if (config.corsOrigin) {
    void app.register(cors, {
      origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",").map((o) => o.trim()),
    });
  }

  // Rate limiting — API only. One page view loads ~8 static files (HTML, CSS, JS,
  // logo); counting those would block normal browsing. Forms add their own,
  // stricter per-route limit on top of this.
  void app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    allowList: (request) => !request.url.startsWith("/api/"),
  });

  // Serve frontend static files from client/
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  void app.register(fastifyStatic, {
    root: path.resolve(__dirname, "..", "..", "..", "client"),
    prefix: "/",
  });

  // API routes
  void app.register(healthRoutes);
  void app.register(statusRoutes);
  void app.register(propertiesRoutes);
  void app.register(agentsRoutes);
  void app.register(homeRoutes);
  void app.register(formsRoutes);

  // Custom error handler — align all errors with the documented API error shape
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500;

    // Rate limit exceeded (429)
    if (statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        },
      });
    }

    // Validation / bad request (400) — e.g. malformed JSON
    if (statusCode === 400) {
      return reply.status(400).send({
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Invalid request.",
        },
      });
    }

    // Other client errors keep their status instead of becoming a 500
    // (and are not logged as server errors): 415 = body is not JSON,
    // 413 = body too large.
    if (statusCode === 415) {
      return reply.status(415).send({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Request body must be JSON (Content-Type: application/json).",
        },
      });
    }
    if (statusCode === 413) {
      return reply.status(413).send({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request body is too large.",
        },
      });
    }

    // Everything else — 500
    reply.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  });

  // Custom 404 handler — unknown routes
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
      },
    });
  });

  // Dev-only manual sync trigger — disabled in production
  if (config.manualRefreshEnabled) {
    app.post("/_dev/sync", async (_request, reply) => {
      const success = await runSync();
      const status = success ? 200 : 500;
      return reply.status(status).send({ ok: success });
    });
  }

  return app;
}
