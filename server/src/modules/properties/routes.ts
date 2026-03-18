// ---------------------------------------------------------------------------
// Properties routes
//
// GET /api/properties        — filtered, sorted, paginated listing
// GET /api/properties/:slugId — single property detail (Task 8.5)
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import { parseListingQuery } from "./query.js";
import { getPropertyListing, getPropertyDetail } from "./service.js";

export async function propertiesRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // GET /api/properties
  // -----------------------------------------------------------------------
  app.get("/api/properties", async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    const result = parseListingQuery(raw);

    if (!result.ok) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters.",
          details: result.errors,
        },
      });
    }

    const listing = getPropertyListing(result.query);
    return reply.send(listing);
  });

  // -----------------------------------------------------------------------
  // GET /api/properties/:slugId
  //
  // The param contains "slug-id". The ID is the last numeric segment after
  // the final hyphen. Lookup is ID-authoritative — the slug portion is
  // only for SEO. The response always returns the canonical slug and url.
  // -----------------------------------------------------------------------
  app.get("/api/properties/:slugId", async (request, reply) => {
    const { slugId } = request.params as { slugId: string };

    // Extract the ID: everything after the last hyphen
    const lastDash = slugId.lastIndexOf("-");
    const id = lastDash >= 0 ? slugId.slice(lastDash + 1) : slugId;

    if (!id || !/^\d+$/.test(id)) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Property not found.",
        },
      });
    }

    const detail = getPropertyDetail(id);
    if (!detail) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Property not found.",
        },
      });
    }

    return reply.send({ data: detail });
  });
}
