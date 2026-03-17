import {
  normalizeString,
  slugify,
  parsePositiveNumber,
  parseNonNegativeInt,
} from "../shared/utils.js";
import type { RawXmlListing } from "./raw-listing.js";
import type { Property, PropertyImage } from "../shared/models.js";

// ---------------------------------------------------------------------------
// Transaction type mapping
// ---------------------------------------------------------------------------

const TRANSACTION_TYPE: Record<string, "sale" | "rent"> = {
  "1": "rent",
  "2": "sale",
};

function mapTransactionType(value: unknown): "sale" | "rent" | null {
  const key = normalizeString(value);
  if (!key) return null;
  return TRANSACTION_TYPE[key] ?? null;
}

// ---------------------------------------------------------------------------
// Property type mapping
// ---------------------------------------------------------------------------

const PROPERTY_TYPE: Record<string, { key: string; label: string }> = {
  Stan: { key: "apartment", label: "Stan" },
  Kuća: { key: "house", label: "Kuća" },
  Plac: { key: "land", label: "Plac" },
  "Poljoprivredno zemljište": {
    key: "land",
    label: "Poljoprivredno zemljište",
  },
  Garaža: { key: "garage", label: "Garaža" },
  "Poslovni prostor": { key: "commercial", label: "Poslovni prostor" },
  Kancelarija: { key: "office", label: "Kancelarija" },
  Vikendica: { key: "cottage", label: "Vikendica" },
};

function mapPropertyType(value: unknown): { key: string; label: string } {
  const label = normalizeString(value);
  if (!label) return { key: "other", label: "Ostalo" };
  return PROPERTY_TYPE[label] ?? { key: "other", label };
}

// ---------------------------------------------------------------------------
// Furnished mapping
// ---------------------------------------------------------------------------

const FURNISHED: Record<string, { key: string; label: string }> = {
  Namešten: { key: "furnished", label: "Namešten" },
  Polunamešten: { key: "semi_furnished", label: "Polunamešten" },
  Nenamešten: { key: "empty", label: "Nenamešten" },
  Prazan: { key: "empty", label: "Prazan" },
};

function mapFurnished(
  value: unknown,
): { key: string; label: string } | null {
  const label = normalizeString(value);
  if (!label) return null;
  return FURNISHED[label] ?? { key: "unknown", label };
}

// ---------------------------------------------------------------------------
// Bath count parsing
//
// The XML `bath` field contains values like "1 kupatilo", "2 kupatila".
// We extract only the leading integer.
// The parser may also return a bare number when the element contains only digits.
// ---------------------------------------------------------------------------

function parseBathrooms(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------------------
// Feature helpers
// ---------------------------------------------------------------------------

function hasFeature(features: string[], term: string): boolean {
  const lower = term.toLowerCase();
  return features.some((f) => f.toLowerCase() === lower);
}

function deriveRegistrationStatus(
  features: string[],
): "registered" | "unregisterable" | "in_progress" | null {
  if (hasFeature(features, "Uknjižen")) return "registered";
  if (hasFeature(features, "Neuknjiživ")) return "unregisterable";
  if (hasFeature(features, "U fazi knjiženja")) return "in_progress";
  return null;
}

// ---------------------------------------------------------------------------
// Derived location fields
// ---------------------------------------------------------------------------

function buildAddress(
  street: string | null,
  streetNumber: string | null,
  city: string,
): string {
  if (street) {
    return [street, streetNumber].filter(Boolean).join(" ");
  }
  return city;
}

function buildLocationLabel(city: string, hood: string | null): string {
  return hood ? `${city}, ${hood}` : city;
}

// ---------------------------------------------------------------------------
// Image list builder
// ---------------------------------------------------------------------------

function buildImages(urls: string[]): PropertyImage[] {
  return urls.map((url, index) => ({ url, order: index }));
}

// ---------------------------------------------------------------------------
// Construction year helper
// ---------------------------------------------------------------------------

function parseConstructionYear(value: unknown): number | null {
  const n = parseNonNegativeInt(value);
  return n !== undefined && n > 0 ? n : null;
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/**
 * Maps a RawXmlListing to a normalized Property.
 *
 * Returns null when the record is fundamentally unmappable — meaning it would
 * produce a structurally incoherent Property that cannot be used safely.
 *
 * The reasons for returning null are:
 * - missing property_id (no identity)
 * - unknown purpose_id (cannot determine transaction type)
 * - missing property_name / title (nothing to display)
 * - missing city (location is required)
 * - price is absent or zero (cannot be presented without a price)
 * - surface is absent or zero, with no landSurface fallback for land types
 * - missing id_agent (agent assignment is required per project rules)
 *
 * Invalid records are handled upstream by the validator (Task 4.3), which
 * wraps this function and logs the reason for each rejected record.
 */
export function normalizeProperty(raw: RawXmlListing): Property | null {
  // --- Required: property identity ---
  const id = normalizeString(raw.property_id);
  if (!id) return null;

  // --- Required: transaction type ---
  const transactionType = mapTransactionType(raw.purpose_id);
  if (!transactionType) return null;

  // --- Required: title ---
  const title = normalizeString(raw.property_name);
  if (!title) return null;

  // --- Required: city ---
  const city = normalizeString(raw.property_city);
  if (!city) return null;

  // --- Property type ---
  const { key: propertyTypeKey, label: propertyTypeLabel } = mapPropertyType(
    raw.property_type,
  );

  // --- Location ---
  const hood = normalizeString(raw.property_hood) ?? null;
  const hoodPart = normalizeString(raw.property_hood_part) ?? null;
  const street = normalizeString(raw.property_street) ?? null;
  const streetNumber = normalizeString(raw.property_street_number) ?? null;
  const flatNumber = normalizeString(raw.property_flat_number) ?? null;
  const address = buildAddress(street, streetNumber, city);
  const locationLabel = buildLocationLabel(city, hood);

  // --- Numeric fields ---
  const rawSurface = parsePositiveNumber(raw.property_surface);
  const landSurface = parsePositiveNumber(raw.property_land_surface) ?? null;

  // For land types, use landSurface as a fallback when property_surface is 0
  // or absent. This handles a known data pattern where land listings carry
  // surface = 0 but have a valid land_surface value.
  let surface: number;
  if (rawSurface !== undefined) {
    surface = rawSurface;
  } else if (propertyTypeKey === "land" && landSurface !== null) {
    surface = landSurface;
  } else {
    return null;
  }

  const price = parsePositiveNumber(raw.property_price);
  if (price === undefined) return null;

  const roomStructure = parsePositiveNumber(raw.structure) ?? null;
  const bathrooms = parseBathrooms(raw.bath);
  const floorRaw = normalizeString(raw.property_floor) ?? null;
  const totalFloors = parseNonNegativeInt(raw.property_floors) ?? null;
  const constructionYear = parseConstructionYear(raw.property_construction_year);

  // --- Furnishing ---
  const furnished = mapFurnished(raw.furnished);

  // --- Feature lists ---
  const { heating, equipment, otherFeatures } = raw;

  // --- Derived booleans from otherFeatures ---
  const hasTerrace = hasFeature(otherFeatures, "Terasa");
  const hasElevator = hasFeature(otherFeatures, "Lift");
  const hasParking = hasFeature(otherFeatures, "Parking");
  const hasGarage = hasFeature(otherFeatures, "Garaža");
  const isNewConstruction = hasFeature(otherFeatures, "Novogradnja");

  // --- Registration status ---
  const registrationStatus = deriveRegistrationStatus(otherFeatures);

  // --- Images ---
  const images = buildImages(raw.images);
  const primaryImage = images[0] ?? null;

  // --- Slug ---
  const slug = slugify(title);

  // --- Agent ---
  const agentId = normalizeString(raw.id_agent);
  if (!agentId) return null;

  // --- Source metadata ---
  const sourceDeletedFlag = String(raw.deleted) === "1";

  return {
    id,
    slug,
    transactionType,
    propertyTypeKey,
    propertyTypeLabel,
    title,
    description: normalizeString(raw.property_description) ?? null,
    city,
    hood,
    hoodPart,
    street,
    streetNumber,
    flatNumber,
    address,
    locationLabel,
    price,
    surface,
    landSurface,
    roomStructure,
    bathrooms,
    floorRaw,
    totalFloors,
    constructionYear,
    furnishedKey: furnished?.key ?? null,
    furnishedLabel: furnished?.label ?? null,
    heating,
    equipment,
    otherFeatures,
    hasTerrace,
    hasElevator,
    hasParking,
    hasGarage,
    isNewConstruction,
    registrationStatus,
    images,
    primaryImage,
    agentId,
    sourceDeletedFlag,
  };
}
