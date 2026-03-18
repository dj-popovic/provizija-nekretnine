import Fastify, { FastifyInstance } from "fastify";
import { config } from "../config/index.js";
import { runSync } from "../modules/xml-sync/index.js";
import { healthRoutes } from "../modules/health/routes.js";
import { statusRoutes } from "../modules/health/status-routes.js";
import { propertiesRoutes } from "../modules/properties/routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  // Routes
  void app.register(healthRoutes);
  void app.register(statusRoutes);
  void app.register(propertiesRoutes);

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
