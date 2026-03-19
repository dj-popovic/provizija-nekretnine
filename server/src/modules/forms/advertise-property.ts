// ---------------------------------------------------------------------------
// Advertise property form handler
//
// POST /api/advertise-property
// Validates payload, composes email with property details, sends to agency.
// ---------------------------------------------------------------------------

import { config } from "../../config/index.js";
import { sendEmail } from "../shared/email.js";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface AdvertisePropertyPayload {
  transactionType: string;
  propertyType: string;
  city: string;
  district: string | null;
  address: string | null;
  area: number;
  rooms: number;
  floor: number | null;
  heating: string | null;
  yearBuilt: number | null;
  features: string[];
  expectedPrice: number;
  priceType: string;
  description: string;
  fullName: string;
  phone: string;
  email: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export function validateAdvertisePropertyPayload(body: unknown): {
  data: AdvertisePropertyPayload | null;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== "object") {
    return { data: null, errors: [{ field: "body", message: "Request body is required." }] };
  }

  const b = body as Record<string, unknown>;

  // Required strings
  const transactionType = typeof b.transactionType === "string" ? b.transactionType.trim() : "";
  const propertyType = typeof b.propertyType === "string" ? b.propertyType.trim() : "";
  const city = typeof b.city === "string" ? b.city.trim() : "";
  const priceType = typeof b.priceType === "string" ? b.priceType.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";

  // Required numbers
  const area = typeof b.area === "number" ? b.area : NaN;
  const rooms = typeof b.rooms === "number" ? b.rooms : NaN;
  const expectedPrice = typeof b.expectedPrice === "number" ? b.expectedPrice : NaN;

  // Optional fields
  const district = typeof b.district === "string" ? b.district.trim() || null : null;
  const address = typeof b.address === "string" ? b.address.trim() || null : null;
  const floor = typeof b.floor === "number" ? b.floor : null;
  const heating = typeof b.heating === "string" ? b.heating.trim() || null : null;
  const yearBuilt = typeof b.yearBuilt === "number" ? b.yearBuilt : null;
  const features = Array.isArray(b.features)
    ? b.features.filter((f): f is string => typeof f === "string").map((f) => f.trim())
    : [];

  // Required field checks
  if (!transactionType) errors.push({ field: "transactionType", message: "Transaction type is required." });
  if (!propertyType) errors.push({ field: "propertyType", message: "Property type is required." });
  if (!city) errors.push({ field: "city", message: "City is required." });
  if (isNaN(area) || area <= 0) errors.push({ field: "area", message: "Area is required and must be a positive number." });
  if (isNaN(rooms) || rooms <= 0) errors.push({ field: "rooms", message: "Rooms is required and must be a positive number." });
  if (isNaN(expectedPrice) || expectedPrice <= 0) errors.push({ field: "expectedPrice", message: "Expected price is required and must be a positive number." });
  if (!priceType) errors.push({ field: "priceType", message: "Price type is required." });
  if (!description) errors.push({ field: "description", message: "Description is required." });
  if (!fullName) errors.push({ field: "fullName", message: "Full name is required." });
  if (!phone) errors.push({ field: "phone", message: "Phone is required." });
  if (!email) errors.push({ field: "email", message: "Email is required." });
  if (email && !email.includes("@")) errors.push({ field: "email", message: "Email is not valid." });

  if (errors.length > 0) return { data: null, errors };

  return {
    data: {
      transactionType, propertyType, city, district, address,
      area, rooms, floor, heating, yearBuilt, features,
      expectedPrice, priceType, description, fullName, phone, email,
    },
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

function composeAdvertisePropertyEmail(data: AdvertisePropertyPayload): { subject: string; html: string } {
  const subject = `Novi oglas za nekretninu: ${data.propertyType} — ${data.city}`;

  // Build optional rows only when values exist
  const optionalRows: string[] = [];
  if (data.district) {
    optionalRows.push(row("Opština/Naselje", escapeHtml(data.district)));
  }
  if (data.address) {
    optionalRows.push(row("Adresa", escapeHtml(data.address)));
  }
  if (data.floor !== null) {
    optionalRows.push(row("Sprat", String(data.floor)));
  }
  if (data.heating) {
    optionalRows.push(row("Grejanje", escapeHtml(data.heating)));
  }
  if (data.yearBuilt !== null) {
    optionalRows.push(row("Godina izgradnje", String(data.yearBuilt)));
  }
  if (data.features.length > 0) {
    optionalRows.push(row("Karakteristike", data.features.map(escapeHtml).join(", ")));
  }

  const html = `
    <h2>Novi zahtev za oglašavanje nekretnine</h2>
    <h3 style="font-family: sans-serif; color: #333;">Detalji nekretnine</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif;">
      ${row("Tip transakcije", escapeHtml(data.transactionType))}
      ${row("Tip nekretnine", escapeHtml(data.propertyType))}
      ${row("Grad", escapeHtml(data.city))}
      ${optionalRows.join("\n      ")}
      ${row("Površina", data.area + " m²")}
      ${row("Sobe", String(data.rooms))}
      ${row("Očekivana cena", formatPrice(data.expectedPrice))}
      ${row("Tip cene", escapeHtml(data.priceType))}
      ${rowLast("Opis", escapeHtml(data.description).replace(/\n/g, "<br>"))}
    </table>
    <h3 style="font-family: sans-serif; color: #333; margin-top: 24px;">Podaci o pošiljaocu</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif;">
      ${row("Ime i prezime", escapeHtml(data.fullName))}
      ${row("Telefon", escapeHtml(data.phone))}
      ${rowLast("Email", escapeHtml(data.email))}
    </table>
  `.trim();

  return { subject, html };
}

function row(label: string, value: string): string {
  return `<tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">${label}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${value}</td>
      </tr>`;
}

function rowLast(label: string, value: string): string {
  return `<tr>
        <td style="padding: 8px 12px; font-weight: bold; vertical-align: top;">${label}</td>
        <td style="padding: 8px 12px;">${value}</td>
      </tr>`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleAdvertisePropertyForm(body: unknown): Promise<{
  status: number;
  response: unknown;
}> {
  const { data, errors } = validateAdvertisePropertyPayload(body);

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

  const email = composeAdvertisePropertyEmail(data);

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
          message: "Failed to send advertise-property email.",
        },
      },
    };
  }

  return {
    status: 200,
    response: {
      data: {
        success: true,
        message: "Advertise-property inquiry submitted successfully.",
      },
    },
  };
}
