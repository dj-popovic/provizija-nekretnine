// ---------------------------------------------------------------------------
// Forms routes
//
// POST /api/contact              — general contact form
// POST /api/inquiries/property   — property inquiry form (Task 11.3)
// POST /api/inquiries/agent      — agent inquiry form (Task 11.4)
// POST /api/advertise-property   — advertise property form (Task 11.5)
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import { handleContactForm } from "./contact.js";
import { handlePropertyInquiryForm } from "./property-inquiry.js";
import { handleAgentInquiryForm } from "./agent-inquiry.js";
import { handleAdvertisePropertyForm } from "./advertise-property.js";

export async function formsRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // POST /api/contact
  // -----------------------------------------------------------------------
  app.post("/api/contact", async (request, reply) => {
    const { status, response } = await handleContactForm(request.body);
    return reply.status(status).send(response);
  });

  // -----------------------------------------------------------------------
  // POST /api/inquiries/property
  // -----------------------------------------------------------------------
  app.post("/api/inquiries/property", async (request, reply) => {
    const { status, response } = await handlePropertyInquiryForm(request.body);
    return reply.status(status).send(response);
  });

  // -----------------------------------------------------------------------
  // POST /api/inquiries/agent
  // -----------------------------------------------------------------------
  app.post("/api/inquiries/agent", async (request, reply) => {
    const { status, response } = await handleAgentInquiryForm(request.body);
    return reply.status(status).send(response);
  });

  // -----------------------------------------------------------------------
  // POST /api/advertise-property
  // -----------------------------------------------------------------------
  app.post("/api/advertise-property", async (request, reply) => {
    const { status, response } = await handleAdvertisePropertyForm(request.body);
    return reply.status(status).send(response);
  });
}
