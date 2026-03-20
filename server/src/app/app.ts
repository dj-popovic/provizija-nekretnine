import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "../config/index.js";
import { runSync } from "../modules/xml-sync/index.js";
import { healthRoutes } from "../modules/health/routes.js";
import { statusRoutes } from "../modules/health/status-routes.js";
import { propertiesRoutes } from "../modules/properties/routes.js";
import { agentsRoutes } from "../modules/agents/routes.js";
import { homeRoutes } from "../modules/home/routes.js";
import { formsRoutes } from "../modules/forms/routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  // CORS
  void app.register(cors, {
    origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",").map((o) => o.trim()),
  });

  // Global rate limiting (general endpoints)
  void app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
  });

  // Routes
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
