// ---------------------------------------------------------------------------
// Agent inquiry form handler
//
// POST /api/inquiries/agent
// Validates payload, looks up agent, composes email, sends to agent.
// ---------------------------------------------------------------------------

import { config } from "../../config/index.js";
import { getAgents } from "../shared/cache.js";
import { sendEmail } from "../shared/email.js";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface AgentInquiryPayload {
  agentId: string;
  fullName: string;
  phone: string;
  email: string;
  message: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export function validateAgentInquiryPayload(body: unknown): {
  data: AgentInquiryPayload | null;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== "object") {
    return { data: null, errors: [{ field: "body", message: "Request body is required." }] };
  }

  const b = body as Record<string, unknown>;

  const agentId = typeof b.agentId === "string" ? b.agentId.trim() : "";
  const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";

  if (!agentId) errors.push({ field: "agentId", message: "Agent ID is required." });
  if (!fullName) errors.push({ field: "fullName", message: "Full name is required." });
  if (!phone) errors.push({ field: "phone", message: "Phone is required." });
  if (!email) errors.push({ field: "email", message: "Email is required." });
  if (email && !email.includes("@")) errors.push({ field: "email", message: "Email is not valid." });
  if (!message) errors.push({ field: "message", message: "Message is required." });

  if (errors.length > 0) return { data: null, errors };

  return {
    data: { agentId, fullName, phone, email, message },
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Email composition
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function composeAgentInquiryEmail(data: AgentInquiryPayload, agentName: string): { subject: string; html: string } {
  const subject = `Novi upit za agenta: ${agentName}`;

  const html = `
    <h2>Novi upit za agenta</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif;">
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Ime i prezime</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.fullName)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Telefon</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.phone)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Email</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.email)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; vertical-align: top;">Poruka</td>
        <td style="padding: 8px 12px;">${escapeHtml(data.message).replace(/\n/g, "<br>")}</td>
      </tr>
    </table>
  `.trim();

  return { subject, html };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleAgentInquiryForm(body: unknown): Promise<{
  status: number;
  response: unknown;
}> {
  const { data, errors } = validateAgentInquiryPayload(body);

  if (!data) {
    return {
      status: 400,
      response: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body is invalid.",
          details: errors,
        },
      },
    };
  }

  // Look up agent
  const agents = getAgents();
  const agent = agents.find((a) => a.id === data.agentId);

  if (!agent) {
    return {
      status: 404,
      response: {
        error: {
          code: "NOT_FOUND",
          message: "Agent not found.",
        },
      },
    };
  }

  const recipientEmail = agent.email || config.agencyEmail;
  const email = composeAgentInquiryEmail(data, agent.name);

  const result = await sendEmail({
    to: recipientEmail,
    subject: email.subject,
    html: email.html,
    replyTo: data.email,
  });

  if (!result.success) {
    return {
      status: 500,
      response: {
        error: {
          code: "EMAIL_SEND_FAILED",
          message: "Failed to send agent inquiry email.",
        },
      },
    };
  }

  return {
    status: 200,
    response: {
      data: {
        success: true,
        message: "Agent inquiry submitted successfully.",
      },
    },
  };
}
