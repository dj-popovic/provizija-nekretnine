// ---------------------------------------------------------------------------
// Property inquiry form handler
//
// POST /api/inquiries/property
// Validates payload, looks up property + assigned agent, composes email
// with property details, sends to the agent.
// ---------------------------------------------------------------------------

import { config } from "../../config/index.js";
import { getProperties, getAgents } from "../shared/cache.js";
import { sendEmail } from "../shared/email.js";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface PropertyInquiryPayload {
  propertyId: string;
  fullName: string;
  phone: string;
  email: string;
  message: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export function validatePropertyInquiryPayload(body: unknown): {
  data: PropertyInquiryPayload | null;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== "object") {
    return { data: null, errors: [{ field: "body", message: "Request body is required." }] };
  }

  const b = body as Record<string, unknown>;

  const propertyId = typeof b.propertyId === "string" ? b.propertyId.trim() : "";
  const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";

  if (!propertyId) errors.push({ field: "propertyId", message: "Property ID is required." });
  else if (propertyId.length > 50) errors.push({ field: "propertyId", message: "Property ID is too long." });
  if (!fullName) errors.push({ field: "fullName", message: "Full name is required." });
  else if (fullName.length > 200) errors.push({ field: "fullName", message: "Full name is too long." });
  if (!phone) errors.push({ field: "phone", message: "Phone is required." });
  else if (phone.length > 50) errors.push({ field: "phone", message: "Phone is too long." });
  if (!email) errors.push({ field: "email", message: "Email is required." });
  else if (email.length > 254) errors.push({ field: "email", message: "Email is too long." });
  else if (!email.includes("@")) errors.push({ field: "email", message: "Email is not valid." });
  if (!message) errors.push({ field: "message", message: "Message is required." });
  else if (message.length > 5000) errors.push({ field: "message", message: "Message is too long." });

  if (errors.length > 0) return { data: null, errors };

  return {
    data: { propertyId, fullName, phone, email, message },
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

function formatPrice(price: number): string {
  return price.toLocaleString("sr-RS") + " €";
}

interface PropertyContext {
  title: string;
  location: string;
  price: number;
  url: string;
}

function composePropertyInquiryEmail(
  data: PropertyInquiryPayload,
  property: PropertyContext,
): { subject: string; html: string } {
  const subject = `Upit za nekretninu: ${property.title}`;

  const html = `
    <h2>Novi upit za nekretninu</h2>
    <h3 style="font-family: sans-serif; color: #333;">Detalji nekretnine</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif;">
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Nekretnina</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(property.title)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Lokacija</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(property.location)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Cena</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${formatPrice(property.price)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Link</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(property.url)}</td>
      </tr>
    </table>
    <h3 style="font-family: sans-serif; color: #333; margin-top: 24px;">Podaci o pošiljaocu</h3>
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

export async function handlePropertyInquiryForm(body: unknown): Promise<{
  status: number;
  response: unknown;
}> {
  const { data, errors } = validatePropertyInquiryPayload(body);

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

  // Look up property
  const properties = getProperties();
  const property = properties.find((p) => p.id === data.propertyId);

  if (!property) {
    return {
      status: 404,
      response: {
        error: {
          code: "NOT_FOUND",
          message: "Property not found.",
        },
      },
    };
  }

  // Look up assigned agent
  const agents = getAgents();
  const agent = agents.find((a) => a.id === property.agentId);
  const recipientEmail = agent?.email || config.agencyEmail;

  const propertyUrl = `/nekretnine/${property.slug}-${property.id}`;
  const email = composePropertyInquiryEmail(data, {
    title: property.title,
    location: property.locationLabel,
    price: property.price,
    url: propertyUrl,
  });

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
          message: "Failed to send property inquiry email.",
        },
      },
    };
  }

  return {
    status: 200,
    response: {
      data: {
        success: true,
        message: "Property inquiry submitted successfully.",
      },
    },
  };
}
