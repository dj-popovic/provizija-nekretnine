// ---------------------------------------------------------------------------
// Home routes
//
// GET /api/home — homepage aggregation
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import { getHomeData } from "./service.js";

export async function homeRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // GET /api/home
  // -----------------------------------------------------------------------
  app.get("/api/home", async (_request, reply) => {
    const data = getHomeData();
    return reply.send({ data });
  });
}
