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

// Property types that are plain land (no building): measured in ares only,
// no rooms / bathrooms / floors / heating / furnishing.
export const LAND_TYPE_KEYS: ReadonlySet<string> = new Set(["plot", "land"]);

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
  otherFeatures: string[];
  featureKeys: string[]; // feature-chip keys mapped from otherFeatures ("elevator", "pool"…); unmapped values dropped

  // Derived boolean flags
  hasTerrace: boolean;
  hasElevator: boolean;
  hasParking: boolean;
  hasGarage: boolean;
  isNewConstruction: boolean;

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
export const DATASET_SCHEMA_VERSION = 4;

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
