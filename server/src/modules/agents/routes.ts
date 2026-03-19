// ---------------------------------------------------------------------------
// Agents routes
//
// GET /api/agents       — agents listing
// GET /api/agents/:slug — single agent detail with associated properties
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import { listAgents, getAgentBySlug } from "./service.js";

export async function agentsRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // GET /api/agents
  // -----------------------------------------------------------------------
  app.get("/api/agents", async (_request, reply) => {
    const result = listAgents();
    return reply.send(result);
  });

  // -----------------------------------------------------------------------
  // GET /api/agents/:slug
  // -----------------------------------------------------------------------
  app.get("/api/agents/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const result = getAgentBySlug(slug);
    if (!result) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Agent not found.",
        },
      });
    }

    return reply.send({ data: result });
  });
}
