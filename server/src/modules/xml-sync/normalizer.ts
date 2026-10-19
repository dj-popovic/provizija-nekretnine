import {
  normalizeString,
  slugify,
  parsePositiveNumber,
  parseNonNegativeInt,
} from "../shared/utils.js";
import type { RawXmlListing } from "./raw-listing.js";
import { LAND_TYPE_KEYS } from "../shared/models.js";
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

// "Plac" (building plot) and "Poljoprivredno zemljište" (farmland) are kept
// as separate keys so they can be filtered separately.
const PROPERTY_TYPE: Record<string, { key: string; label: string }> = {
  Stan: { key: "apartment", label: "Stan" },
  Kuća: { key: "house", label: "Kuća" },
  Plac: { key: "plot", label: "Plac" },
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
  // Unknown values pass through as their own key so they still display
  return FURNISHED[label] ?? { key: label, label };
}

// ---------------------------------------------------------------------------
// Heating mapping
//
// Stable keys for translation. Unknown values pass through unchanged so they
// still display (in Serbian) until a key is added here.
// ---------------------------------------------------------------------------

const HEATING: Record<string, string> = {
  Centralno: "central",
  Gas: "gas",
  Podno: "underfloor",
  "Čvrsta goriva": "solid_fuel",
  "Norveški radijatori": "norwegian_radiators",
  TA: "storage_heater",
};

function mapHeating(values: string[]): string[] {
  return values.map((v) => HEATING[v] ?? v);
}

// ---------------------------------------------------------------------------
// Feature mapping (kvadratići)
//
// XML <other> values → stable feature keys. Matched case-insensitively:
// "Pet friendly" / "U izgradnji" exist in RELPER but haven't appeared in the
// feed yet, so their exact spelling is unconfirmed.
// ---------------------------------------------------------------------------

const FEATURES: Record<string, string> = {
  penthouse: "penthouse",
  vila: "villa",
  duplex: "duplex",
  lux: "luxury",
  bazen: "pool",
  "pet friendly": "pet_friendly",
  novogradnja: "new_build",
  "u izgradnji": "under_construction",
  salonski: "salon",
  lift: "elevator",
  terasa: "terrace",
  "garažno mesto": "garage_space",
  garaža: "garage_space",
  parking: "parking",
  podrum: "basement",
  ostava: "storage",
  "asfaltni put": "paved_road",
  gradska: "city_water", // RELPER's water checkbox — the value is just "Gradska"
  "gradska kanalizacija": "city_sewage",
  građevinska: "building_permit",
  lokacijska: "location_permit",
  upotrebna: "occupancy_permit",
  renoviran: "renovated",
  "odmah useljiv": "move_in_ready",
  "može na kredit": "mortgage_eligible",
};

// <other> values that are known but deliberately not feature chips
// (shown in the spec panel, or not a selling point)
const IGNORED_OTHER = new Set([
  "uknjižen",
  "neuknjiživ",
  "u fazi knjiženja",
  "nije prizemlje",
  "nije poslednji sprat",
  "topla voda",
  "izvorno stanje",
  "za adaptaciju",
  "stara gradnja",
]);

/** All feature keys the normalizer can produce. */
export const FEATURE_KEYS: ReadonlySet<string> = new Set(Object.values(FEATURES));

/** True if an <other> value is either mapped to a feature or deliberately ignored. */
export function isKnownOtherValue(value: string): boolean {
  const lower = value.toLowerCase();
  return lower in FEATURES || IGNORED_OTHER.has(lower);
}

function mapFeatures(values: string[]): string[] {
  const keys = new Set<string>();
  for (const v of values) {
    const key = FEATURES[v.toLowerCase()];
    if (key) keys.add(key);
  }
  return [...keys];
}

// ---------------------------------------------------------------------------
// Floor normalization
//
// XML floor is a number ("5") or an abbreviation ("pr" = prizemlje).
// ---------------------------------------------------------------------------

const FLOOR: Record<string, string> = {
  pr: "ground",
};

function normalizeFloor(raw: string | null): string | null {
  if (!raw) return null;
  return FLOOR[raw.toLowerCase()] ?? raw;
}

// ---------------------------------------------------------------------------
// Title / property code ("šifra")
//
// Agents type the code into property_name by hand, in a few formats:
//   "ŠIFRA NEKRETNINE: 100009 SREMSKA KAMENICA, ..."
//   "ŠIFRA OGLASA: 100021, NOVI SAD, ..."
//   "ŠIFRA NEKRETNINE: 592 , IZDAJEMO ..."
// Some titles have no code at all. The code is split off so the title is clean.
// ---------------------------------------------------------------------------

const CODE_PREFIX = /^\s*[ŠS]IFRA\s+(?:NEKRETNINE|OGLASA)\s*:\s*(\d+)\s*[,.:;\-–]?\s*/i;

function splitCodeFromTitle(name: string): { code: string | null; title: string } {
  const match = name.match(CODE_PREFIX);
  if (!match) return { code: null, title: name };
  return { code: match[1], title: name.slice(match[0].length).trim() };
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
// Price on request
//
// RELPER requires a price, so agents enter a symbolic 1 € for "cena na upit".
// ---------------------------------------------------------------------------

const PRICE_ON_REQUEST_VALUE = 1;

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
 * - surface is absent or zero (land types: both surface and land_surface absent)
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
  const rawTitle = normalizeString(raw.property_name);
  if (!rawTitle) return null;

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

  // --- Title / code ---
  // If the title is nothing but the code, fall back to "<type>, <location>".
  const { code, title: cleanTitle } = splitCodeFromTitle(rawTitle);
  const title = cleanTitle || `${propertyTypeLabel}, ${locationLabel}`;

  // --- Numeric fields ---
  // surface is the building area in m², landSurface is the plot area in ares.
  // Land types (plot, farmland) come with property_surface = 0 and only a
  // land surface, so their surface stays null. The two are never mixed —
  // copying ares into surface would show them as m².
  const surface = parsePositiveNumber(raw.property_surface) ?? null;
  const landSurface = parsePositiveNumber(raw.property_land_surface) ?? null;

  const isLandType = LAND_TYPE_KEYS.has(propertyTypeKey);
  if (isLandType ? surface === null && landSurface === null : surface === null) {
    return null;
  }

  const price = parsePositiveNumber(raw.property_price);
  if (price === undefined) return null;

  const roomStructure = parsePositiveNumber(raw.structure) ?? null;
  const bathrooms = parseBathrooms(raw.bath);
  const floorRaw = normalizeString(raw.property_floor) ?? null;
  const floor = normalizeFloor(floorRaw);
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
  // RELPER sends "Garažno mesto"; "Garaža" kept in case it ever appears
  const hasGarage =
    hasFeature(otherFeatures, "Garažno mesto") || hasFeature(otherFeatures, "Garaža");
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
    code,
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
    priceOnRequest: price === PRICE_ON_REQUEST_VALUE,
    surface,
    landSurface,
    roomStructure,
    bathrooms,
    floorRaw,
    floor,
    totalFloors,
    constructionYear,
    furnishedKey: furnished?.key ?? null,
    furnishedLabel: furnished?.label ?? null,
    heating,
    heatingKeys: mapHeating(heating),
    equipment,
    otherFeatures,
    featureKeys: mapFeatures(otherFeatures),
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
