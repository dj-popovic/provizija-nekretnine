// ---------------------------------------------------------------------------
// Domain models
//
// Internal normalized models shared across modules.
// These are NOT public API shapes — the API layer projects from these.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Property models
// ---------------------------------------------------------------------------


export interface PropertyImage {
  url: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Property type rules (agreed with the client, 2026-11-05)
//
// Which values make sense for each type. The spec panel shows only these, and
// the filters only look at these, so a filter never finds a hidden value.
// The listing page keeps the same table for its filter groups (page-properties.js).
// ---------------------------------------------------------------------------

export interface PropertyTypeRules {
  land: boolean; // plain land: measured in ares only, no building values at all
  rooms: boolean;
  bathrooms: boolean;
  floor: boolean; // floor + total floors
  furnished: boolean;
  heating: boolean;
  constructionYear: boolean;
  plotArea: boolean; // the land around a building, in ares
  infrastructure: boolean; // paved road, city water, city sewage chips
  elevator: boolean;
}

const BUILDING: PropertyTypeRules = {
  land: false,
  rooms: true,
  bathrooms: true,
  floor: false,
  furnished: true,
  heating: true,
  constructionYear: true,
  plotArea: false,
  infrastructure: false,
  elevator: true,
};

const LAND: PropertyTypeRules = {
  land: true,
  rooms: false,
  bathrooms: false,
  floor: false,
  furnished: false,
  heating: false,
  constructionYear: false,
  plotArea: false,
  infrastructure: true,
  elevator: false,
};

const WITH_YARD = { plotArea: true, infrastructure: true, elevator: false };

export const PROPERTY_TYPE_RULES: Readonly<Record<string, PropertyTypeRules>> = {
  apartment: { ...BUILDING, floor: true },
  house: { ...BUILDING, ...WITH_YARD },
  commercial: { ...BUILDING, floor: true }, // Poslovni prostor + Kancelarija
  retail: { ...BUILDING, rooms: false, furnished: false, elevator: false }, // Lokal
  hospitality: { ...BUILDING, ...WITH_YARD }, // Ugostiteljski objekat
  warehouse: { ...BUILDING, ...WITH_YARD, rooms: false, furnished: false }, // Hala
  garage: {
    ...BUILDING,
    rooms: false,
    bathrooms: false,
    furnished: false,
    heating: false,
    constructionYear: false,
    elevator: false,
  },
  plot: LAND, // Građevinsko zemljište (RELPER "Plac")
  farmland: LAND, // Poljoprivredno zemljište
  industrial_land: LAND, // Industrijsko zemljište
  // A RELPER type without a key yet: show whatever the agency entered, except a floor
  other: { ...BUILDING, plotArea: true },
};

export function typeRules(propertyTypeKey: string): PropertyTypeRules {
  return PROPERTY_TYPE_RULES[propertyTypeKey] ?? PROPERTY_TYPE_RULES.other;
}

// Property types that are plain land (no building)
export const LAND_TYPE_KEYS: ReadonlySet<string> = new Set(
  Object.keys(PROPERTY_TYPE_RULES).filter((key) => PROPERTY_TYPE_RULES[key].land),
);

export interface Property {
  // Identity
  id: string;
  slug: string;

  // Agency property code ("šifra"), parsed out of the XML property_name prefix
  code: string | null;

  // Classification
  transactionType: "sale" | "rent";
  propertyTypeKey: string;
  propertyTypeLabel: string;

  // Core display — title has the "ŠIFRA ...: <code>" prefix removed
  title: string;
  description: string | null;

  // Location
  city: string;
  hood: string | null;
  hoodPart: string | null;
  street: string | null;
  streetNumber: string | null;
  flatNumber: string | null;
  address: string;
  locationLabel: string;

  // Numeric / structural
  price: number;
  priceOnRequest: boolean; // agents enter 1 € for "cena na upit"; the public API then sends price: null
  surface: number | null; // m² — null for land types without a building surface
  landSurface: number | null; // ares
  roomStructure: number | null;
  bathrooms: number | null;
  floorRaw: string | null;
  floor: string | null; // normalized: "ground" for prizemlje, otherwise the raw value ("5")
  totalFloors: number | null;
  constructionYear: number | null;

  // Furnishing and features
  furnishedKey: string | null;
  furnishedLabel: string | null;
  heating: string[];
  heatingKeys: string[]; // stable keys ("central", "gas"…); unknown values pass through as-is
  equipment: string[];
  equipmentKeys: string[]; // stable keys from <equipment> ("air_conditioning"…); unmapped values dropped
  otherFeatures: string[];
  featureKeys: string[]; // feature-chip keys mapped from otherFeatures ("elevator", "pool"…); unmapped values dropped

  // Derived boolean flags
  hasTerrace: boolean;
  hasElevator: boolean;
  hasParking: boolean;
  hasGarage: boolean;
  isNewConstruction: boolean;
  isOldBuild: boolean; // <other> "Stara gradnja"
  conditionKey: "original" | "renovated" | "needs_renovation" | null; // Izvorno stanje / Renoviran / Za adaptaciju

  // Registration status derived from <other> XML values
  registrationStatus: "registered" | "unregisterable" | "in_progress" | null;

  // Media
  images: PropertyImage[];
  primaryImage: PropertyImage | null;

  // Agent relationship — from XML id_agent
  agentId: string;

  // Source metadata
  sourceDeletedFlag: boolean;
}

// ---------------------------------------------------------------------------
// Agent models
// ---------------------------------------------------------------------------

export interface Agent {
  // Identity
  id: string;
  slug: string;

  // Core XML-driven fields
  name: string;
  email: string | null;
  phone: string | null;

  // Local enrichment fields — not from XML, populated separately (Task 9.2)
  imageUrl: string | null;
  bio: string | null;
}

// ---------------------------------------------------------------------------
// Normalized dataset
//
// The assembled output of one complete sync run.
// This is what the in-memory cache holds and what all read modules consume.
// ---------------------------------------------------------------------------

export interface NormalizedDataset {
  properties: Property[];
  agents: Agent[];
}

// Bump whenever the Property / Agent shape changes, so an old JSON snapshot
// on disk is ignored at startup instead of being served with missing fields.
// 6: new type keys (retail, hospitality, warehouse, farmland, industrial_land; office → commercial)
export const DATASET_SCHEMA_VERSION = 6;

// ---------------------------------------------------------------------------
// Sync status
//
// Tracks the outcome of the latest sync attempt and the latest successful
// sync. Read by the status endpoint (Phase 7) for observability.
// ---------------------------------------------------------------------------

export interface SyncStatus {
  status: "ok" | "error" | "pending";
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
  loadedPropertiesCount: number;
  loadedAgentsCount: number;
  invalidPropertiesCount: number;
  lastError: string | null;
}
