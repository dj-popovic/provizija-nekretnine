import type { FastifyInstance } from "fastify";
import { getSyncStatus } from "../xml-sync/index.js";
import { getProperties } from "../shared/cache.js";
import { translationStats } from "../translations/store.js";

export async function statusRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/status", async (_request, reply) => {
    const s = getSyncStatus();

    return reply.send({
      data: {
        status: s.status,
        lastSuccessfulSync: s.lastSuccessfulSyncAt,
        numberOfLoadedProperties: s.loadedPropertiesCount,
        lastSyncError: s.lastError,
        // en / ru machine translations: translated, missing, outdated (Serbian text changed since)
        translations: translationStats(getProperties()),
      },
    });
  });
}
