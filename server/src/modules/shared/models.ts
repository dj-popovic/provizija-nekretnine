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

export interface Property {
  // Identity
  id: string;
  slug: string;

  // Classification
  transactionType: "sale" | "rent";
  propertyTypeKey: string;
  propertyTypeLabel: string;

  // Core display
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
  surface: number;
  landSurface: number | null;
  roomStructure: number | null;
  bathrooms: number | null;
  floorRaw: string | null;
  totalFloors: number | null;
  constructionYear: number | null;

  // Furnishing and features
  furnishedKey: string | null;
  furnishedLabel: string | null;
  heating: string[];
  equipment: string[];
  otherFeatures: string[];

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
