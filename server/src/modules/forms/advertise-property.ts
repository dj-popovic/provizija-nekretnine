// ---------------------------------------------------------------------------
// Advertise property form handler
//
// POST /api/advertise-property
// Validates payload, composes email with property details, sends to agency.
// ---------------------------------------------------------------------------

import { config } from "../../config/index.js";
import { sendEmail } from "../shared/email.js";
import { parseVisitorLang, visitorLangRow, type VisitorLang } from "./lang.js";

// ---------------------------------------------------------------------------
// Accepted keys → the Serbian label used in the e-mail
// ---------------------------------------------------------------------------

const TRANSACTION_TYPES: Record<string, string> = {
  sale: "Prodaja",
  rent: "Izdavanje",
};

const PROPERTY_TYPES: Record<string, string> = {
  apartment: "Stan",
  house: "Kuća",
  commercial: "Poslovni prostor",
  retail: "Lokal",
  hospitality: "Ugostiteljski objekat",
  warehouse: "Hala",
  garage: "Garaža",
  plot: "Građevinsko zemljište",
  farmland: "Poljoprivredno zemljište",
  industrial_land: "Industrijsko zemljište",
  other: "Ostalo",
};

const PRICE_TYPES: Record<string, string> = {
  fixed: "Fiksna",
  negotiable: "Po dogovoru",
  urgent: "Hitna prodaja",
};

const FEATURES: Record<string, string> = {
  lift: "Lift",
  parking: "Parking",
  terrace: "Terasa",
  pool: "Bazen",
  yard: "Dvorište",
  airConditioning: "Klima",
  internet: "Internet",
  alarm: "Alarm",
};

function isKey(map: Record<string, string>, value: string): boolean {
  return Object.hasOwn(map, value);
}

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
  rooms: string;
  floor: string | null;
  heating: string | null;
  yearBuilt: number | null;
  features: string[];
  expectedPrice: number;
  priceType: string;
  description: string;
  fullName: string;
  phone: string;
  email: string;
  lang: VisitorLang | null;
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
  // Rooms / floor are the Serbian option text the visitor picked ("Garsonjera", "5+ soba", "Poslednji sprat")
  const rooms = typeof b.rooms === "string" ? b.rooms.trim() : "";
  const priceType = typeof b.priceType === "string" ? b.priceType.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";

  // Required numbers
  const area = typeof b.area === "number" ? b.area : NaN;
  const expectedPrice = typeof b.expectedPrice === "number" ? b.expectedPrice : NaN;

  // Optional fields
  const district = typeof b.district === "string" ? b.district.trim() || null : null;
  const address = typeof b.address === "string" ? b.address.trim() || null : null;
  const floor = typeof b.floor === "string" ? b.floor.trim() || null : null;
  const heating = typeof b.heating === "string" ? b.heating.trim() || null : null;
  const yearBuilt = typeof b.yearBuilt === "number" ? b.yearBuilt : null;
  const rawFeatures = Array.isArray(b.features)
    ? b.features.filter((f): f is string => typeof f === "string").map((f) => f.trim())
    : [];
  const features = Array.from(new Set(rawFeatures));

  // Required field checks
  if (!transactionType) errors.push({ field: "transactionType", message: "Transaction type is required." });
  else if (!isKey(TRANSACTION_TYPES, transactionType)) errors.push({ field: "transactionType", message: "Transaction type is not valid." });
  if (!propertyType) errors.push({ field: "propertyType", message: "Property type is required." });
  else if (!isKey(PROPERTY_TYPES, propertyType)) errors.push({ field: "propertyType", message: "Property type is not valid." });
  if (!city) errors.push({ field: "city", message: "City is required." });
  else if (city.length > 200) errors.push({ field: "city", message: "City is too long." });
  if (isNaN(area) || area <= 0) errors.push({ field: "area", message: "Area is required and must be a positive number." });
  if (!rooms) errors.push({ field: "rooms", message: "Rooms is required." });
  else if (rooms.length > 50) errors.push({ field: "rooms", message: "Rooms is too long." });
  if (isNaN(expectedPrice) || expectedPrice <= 0) errors.push({ field: "expectedPrice", message: "Expected price is required and must be a positive number." });
  if (!priceType) errors.push({ field: "priceType", message: "Price type is required." });
  else if (!isKey(PRICE_TYPES, priceType)) errors.push({ field: "priceType", message: "Price type is not valid." });
  if (!description) errors.push({ field: "description", message: "Description is required." });
  else if (description.length > 5000) errors.push({ field: "description", message: "Description is too long." });
  if (!fullName) errors.push({ field: "fullName", message: "Full name is required." });
  else if (fullName.length > 200) errors.push({ field: "fullName", message: "Full name is too long." });
  if (!phone) errors.push({ field: "phone", message: "Phone is required." });
  else if (phone.length > 50) errors.push({ field: "phone", message: "Phone is too long." });
  if (!email) errors.push({ field: "email", message: "Email is required." });
  else if (email.length > 254) errors.push({ field: "email", message: "Email is too long." });
  else if (!email.includes("@")) errors.push({ field: "email", message: "Email is not valid." });
  if (district && district.length > 200) errors.push({ field: "district", message: "District is too long." });
  if (address && address.length > 300) errors.push({ field: "address", message: "Address is too long." });
  if (floor && floor.length > 50) errors.push({ field: "floor", message: "Floor is too long." });
  if (heating && heating.length > 100) errors.push({ field: "heating", message: "Heating is too long." });
  if (features.some((f) => !isKey(FEATURES, f))) errors.push({ field: "features", message: "Features contain an unknown value." });
  const lang = parseVisitorLang(b.lang, errors);

  if (errors.length > 0) return { data: null, errors };

  return {
    data: {
      transactionType, propertyType, city, district, address,
      area, rooms, floor, heating, yearBuilt, features,
      expectedPrice, priceType, description, fullName, phone, email, lang,
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

export function composeAdvertisePropertyEmail(data: AdvertisePropertyPayload): { subject: string; html: string } {
  const propertyType = PROPERTY_TYPES[data.propertyType];
  const subject = `Novi oglas za nekretninu: ${propertyType} — ${data.city}`;

  // Build optional rows only when values exist
  const optionalRows: string[] = [];
  if (data.district) {
    optionalRows.push(row("Opština/Naselje", escapeHtml(data.district)));
  }
  if (data.address) {
    optionalRows.push(row("Adresa", escapeHtml(data.address)));
  }
  if (data.floor) {
    optionalRows.push(row("Sprat", escapeHtml(data.floor)));
  }
  if (data.heating) {
    optionalRows.push(row("Grejanje", escapeHtml(data.heating)));
  }
  if (data.yearBuilt !== null) {
    optionalRows.push(row("Godina izgradnje", String(data.yearBuilt)));
  }
  if (data.features.length > 0) {
    optionalRows.push(row("Karakteristike", data.features.map((f) => FEATURES[f]).join(", ")));
  }

  const html = `
    <h2>Novi zahtev za oglašavanje nekretnine</h2>
    <h3 style="font-family: sans-serif; color: #333;">Detalji nekretnine</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif;">
      ${row("Tip transakcije", TRANSACTION_TYPES[data.transactionType])}
      ${row("Tip nekretnine", propertyType)}
      ${row("Grad", escapeHtml(data.city))}
      ${optionalRows.join("\n      ")}
      ${row("Površina", data.area + " m²")}
      ${row("Sobe", escapeHtml(data.rooms))}
      ${row("Očekivana cena", formatPrice(data.expectedPrice))}
      ${row("Tip cene", PRICE_TYPES[data.priceType])}
      ${rowLast("Opis", escapeHtml(data.description).replace(/\n/g, "<br>"))}
    </table>
    <h3 style="font-family: sans-serif; color: #333; margin-top: 24px;">Podaci o pošiljaocu</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif;">
      ${row("Ime i prezime", escapeHtml(data.fullName))}
      ${row("Telefon", escapeHtml(data.phone))}
      ${visitorLangRow(data.lang)}
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
