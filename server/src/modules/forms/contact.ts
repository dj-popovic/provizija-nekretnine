// ---------------------------------------------------------------------------
// Contact form handler
//
// POST /api/contact
// Validates payload, composes email, sends to agency inbox.
// ---------------------------------------------------------------------------

import { config } from "../../config/index.js";
import { sendEmail } from "../shared/email.js";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface ContactPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export function validateContactPayload(body: unknown): {
  data: ContactPayload | null;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== "object") {
    return { data: null, errors: [{ field: "body", message: "Request body is required." }] };
  }

  const b = body as Record<string, unknown>;

  const firstName = typeof b.firstName === "string" ? b.firstName.trim() : "";
  const lastName = typeof b.lastName === "string" ? b.lastName.trim() : "";
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const subject = typeof b.subject === "string" ? b.subject.trim() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";

  if (!firstName) errors.push({ field: "firstName", message: "First name is required." });
  else if (firstName.length > 100) errors.push({ field: "firstName", message: "First name is too long." });
  if (!lastName) errors.push({ field: "lastName", message: "Last name is required." });
  else if (lastName.length > 100) errors.push({ field: "lastName", message: "Last name is too long." });
  if (!phone) errors.push({ field: "phone", message: "Phone is required." });
  else if (phone.length > 50) errors.push({ field: "phone", message: "Phone is too long." });
  if (!email) errors.push({ field: "email", message: "Email is required." });
  else if (email.length > 254) errors.push({ field: "email", message: "Email is too long." });
  else if (!email.includes("@")) errors.push({ field: "email", message: "Email is not valid." });
  if (!subject) errors.push({ field: "subject", message: "Subject is required." });
  else if (subject.length > 200) errors.push({ field: "subject", message: "Subject is too long." });
  if (!message) errors.push({ field: "message", message: "Message is required." });
  else if (message.length > 5000) errors.push({ field: "message", message: "Message is too long." });

  if (errors.length > 0) return { data: null, errors };

  return {
    data: { firstName, lastName, phone, email, subject, message },
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Email composition
// ---------------------------------------------------------------------------

function composeContactEmail(data: ContactPayload): { subject: string; html: string } {
  const subject = `Nova poruka sa sajta: ${data.subject}`;

  const html = `
    <h2>Nova poruka sa kontakt forme</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif;">
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Ime</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.firstName)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Prezime</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.lastName)}</td>
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
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Tema</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(data.subject)}</td>
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
// HTML escaping
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleContactForm(body: unknown): Promise<{
  status: number;
  response: unknown;
}> {
  const { data, errors } = validateContactPayload(body);

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

  const email = composeContactEmail(data);
  const result = await sendEmail({
    to: config.agencyEmail,
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
          message: "Failed to send contact email.",
        },
      },
    };
  }

  return {
    status: 200,
    response: {
      data: {
        success: true,
        message: "Contact inquiry submitted successfully.",
      },
    },
  };
}
