import type { FastifyInstance } from "fastify";
import { getSyncStatus } from "../xml-sync/index.js";

export async function statusRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/status", async (_request, reply) => {
    const s = getSyncStatus();

    return reply.send({
      data: {
        status: s.status,
        lastSuccessfulSync: s.lastSuccessfulSyncAt,
        numberOfLoadedProperties: s.loadedPropertiesCount,
        lastSyncError: s.lastError,
      },
    });
  });
}
