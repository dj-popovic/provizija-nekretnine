// ---------------------------------------------------------------------------
// Property listing & detail services
//
// Reads from the in-memory cache, applies filtering / sorting / pagination,
// and shapes public API response models.
// ---------------------------------------------------------------------------

import { LAND_TYPE_KEYS } from "../shared/models.js";
import type { Property } from "../shared/models.js";
import { getProperties, getAgents } from "../shared/cache.js";
import { getEnrichment } from "../agents/enrichment.js";
import type { PropertyListingQuery, SortOption } from "./query.js";

// ---------------------------------------------------------------------------
// Public API response types
// ---------------------------------------------------------------------------

export interface ApiImage {
  url: string;
  alt: string;
}

export interface PropertyListItem {
  id: string;
  slug: string;
  url: string;
  title: string;
  transactionType: string;
  propertyType: string;
  location: string;
  price: number | null; // null = "cena na upit"
  images: ApiImage[];
  area: number | null; // m²
  landArea: number | null; // ares
  rooms: number | null;
  highlights: string[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PropertyListingResult {
  items: PropertyListItem[];
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// URL helper
// ---------------------------------------------------------------------------

function buildPropertyUrl(slug: string, id: string): string {
  return `/nekretnine/${slug}-${id}`;
}

// ---------------------------------------------------------------------------
// Image mapping (internal → API)
// ---------------------------------------------------------------------------

function mapImages(property: Property): ApiImage[] {
  const sorted = [...property.images].sort((a, b) => a.order - b.order);
  return sorted.map((img) => ({
    url: img.url,
    alt: property.title,
  }));
}

// ---------------------------------------------------------------------------
// Highlights
//
// Curated subset of otherFeatures + derived boolean flags.
// Keeps highlights short and useful for card display.
// ---------------------------------------------------------------------------

const FLAG_HIGHLIGHTS: { key: keyof Property; label: string }[] = [
  { key: "hasTerrace", label: "Terasa" },
  { key: "hasElevator", label: "Lift" },
  { key: "hasParking", label: "Parking" },
  { key: "hasGarage", label: "Garaža" },
  { key: "isNewConstruction", label: "Novogradnja" },
];

const MAX_HIGHLIGHTS = 5;

function buildHighlights(property: Property): string[] {
  const highlights: string[] = [];

  // Add derived boolean flags first (most useful for cards)
  for (const { key, label } of FLAG_HIGHLIGHTS) {
    if (property[key] === true && highlights.length < MAX_HIGHLIGHTS) {
      highlights.push(label);
    }
  }

  // Fill remaining slots from otherFeatures
  for (const feature of property.otherFeatures) {
    if (highlights.length >= MAX_HIGHLIGHTS) break;
    if (!highlights.includes(feature)) {
      highlights.push(feature);
    }
  }

  return highlights;
}

// ---------------------------------------------------------------------------
// Public price — null for "cena na upit" (the frontend shows that text)
// ---------------------------------------------------------------------------

function publicPrice(property: Property): number | null {
  return property.priceOnRequest ? null : property.price;
}

// ---------------------------------------------------------------------------
// Land area — apartments never show a plot area
// ---------------------------------------------------------------------------

function publicLandArea(property: Property): number | null {
  return property.propertyTypeKey === "apartment" ? null : property.landSurface;
}

// ---------------------------------------------------------------------------
// PropertyListItem shaping
// ---------------------------------------------------------------------------

function toListItem(property: Property): PropertyListItem {
  return {
    id: property.id,
    slug: property.slug,
    url: buildPropertyUrl(property.slug, property.id),
    title: property.title,
    transactionType: property.transactionType,
    propertyType: property.propertyTypeLabel,
    location: property.locationLabel,
    price: publicPrice(property),
    images: mapImages(property),
    area: property.surface,
    landArea: publicLandArea(property),
    rooms: property.roomStructure,
    highlights: buildHighlights(property),
  };
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function matchesFilters(property: Property, query: PropertyListingQuery): boolean {
  if (query.transactionType && property.transactionType !== query.transactionType) {
    return false;
  }

  if (query.propertyTypes.length > 0 && !query.propertyTypes.includes(property.propertyTypeKey)) {
    return false;
  }

  // Location: one city, then optionally any of its districts (case-insensitive)
  if (query.city !== undefined) {
    if (property.city.toLowerCase() !== query.city.toLowerCase()) return false;
    if (query.hoods.length > 0) {
      const hood = property.hood?.toLowerCase();
      if (!hood || !query.hoods.some((h) => h.toLowerCase() === hood)) return false;
    }
  }

  // Rooms range, inclusive; land without rooms never matches it
  if (query.roomsMin !== undefined || query.roomsMax !== undefined) {
    const rooms = property.roomStructure;
    if (rooms === null) return false;
    if (query.roomsMin !== undefined && rooms < query.roomsMin) return false;
    if (query.roomsMax !== undefined && rooms > query.roomsMax) return false;
  }

  // "Cena na upit" has no real price, so it never matches a price filter
  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    if (property.priceOnRequest) return false;
    if (query.priceMin !== undefined && property.price < query.priceMin) {
      return false;
    }
    if (query.priceMax !== undefined && property.price > query.priceMax) {
      return false;
    }
  }

  // Area filter is in m²; land types without a building surface never match it
  if (query.areaMin !== undefined || query.areaMax !== undefined) {
    if (property.surface === null) return false;
    if (query.areaMin !== undefined && property.surface < query.areaMin) {
      return false;
    }
    if (query.areaMax !== undefined && property.surface > query.areaMax) {
      return false;
    }
  }

  // Land area filter is in ares, on the same value the cards show (never for apartments)
  if (query.landAreaMin !== undefined || query.landAreaMax !== undefined) {
    const landArea = publicLandArea(property);
    if (landArea === null) return false;
    if (query.landAreaMin !== undefined && landArea < query.landAreaMin) return false;
    if (query.landAreaMax !== undefined && landArea > query.landAreaMax) return false;
  }

  return matchesMoreFilters(property, query);
}

// ---------------------------------------------------------------------------
// "Više filtera" (#16) — every rule works on the values the site shows
// (spec panel, feature chips), so a filter never finds a hidden value.
// A listing without the value (null / empty) never matches a set filter.
// ---------------------------------------------------------------------------

/** Floor as a number (prizemlje = 0); null when unknown or not an apartment. */
function floorNumber(property: Property): number | null {
  if (property.propertyTypeKey !== "apartment" || property.floor === null) return null;
  if (property.floor === "ground") return 0;
  const n = Number(property.floor);
  return Number.isFinite(n) ? n : null;
}

function hasPublicFeature(property: Property, key: string): boolean {
  return property.featureKeys.includes(key) && featureApplies(key, property.propertyTypeKey);
}

function matchesConstruction(property: Property, value: string): boolean {
  if (value === "new") return property.featureKeys.includes("new_build");
  if (value === "under_construction") return property.featureKeys.includes("under_construction");
  return property.isOldBuild;
}

function inRange(value: number | null, min: number | undefined, max: number | undefined): boolean {
  if (min === undefined && max === undefined) return true;
  if (value === null) return false;
  return (min === undefined || value >= min) && (max === undefined || value <= max);
}

function matchesMoreFilters(property: Property, query: PropertyListingQuery): boolean {
  // Novogradnja tab: new builds and buildings still under construction
  if (query.newBuild && !matchesConstruction(property, "new") && !matchesConstruction(property, "under_construction")) {
    return false;
  }

  if (query.bathroomsMin !== undefined && (property.bathrooms ?? 0) < query.bathroomsMin) return false;

  const floor = floorNumber(property);
  if (!inRange(floor, query.floorMin, query.floorMax)) return false;
  if (query.notGroundFloor && (floor === null || floor === 0)) return false;
  if (query.notTopFloor && (floor === null || property.totalFloors === null || floor >= property.totalFloors)) {
    return false;
  }

  if (!inRange(property.constructionYear, query.yearMin, query.yearMax)) return false;

  // Any of the chosen values
  if (query.heating.length > 0 && !query.heating.some((h) => property.heatingKeys.includes(h))) return false;
  if (query.furnished.length > 0 && !query.furnished.includes(property.furnishedKey ?? "")) return false;
  if (query.construction.length > 0 && !query.construction.some((c) => matchesConstruction(property, c))) {
    return false;
  }
  if (query.condition.length > 0 && !query.condition.includes(property.conditionKey ?? "")) return false;

  if (query.registered && property.registrationStatus !== "registered") return false;

  // All of the chosen values
  if (!query.features.every((f) => hasPublicFeature(property, f))) return false;
  if (!query.equipment.every((e) => property.equipmentKeys.includes(e))) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

function sortProperties(properties: Property[], sort: SortOption): Property[] {
  const sorted = [...properties];

  switch (sort) {
    case "newest":
      // Newest = highest ID first (XML IDs are sequential)
      sorted.sort((a, b) => Number(b.id) - Number(a.id));
      break;
    // "Cena na upit" goes last in both price orders
    case "priceAsc":
      sorted.sort((a, b) => Number(a.priceOnRequest) - Number(b.priceOnRequest) || a.price - b.price);
      break;
    case "priceDesc":
      sorted.sort((a, b) => Number(a.priceOnRequest) - Number(b.priceOnRequest) || b.price - a.price);
      break;
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// Listing service
// ---------------------------------------------------------------------------

export function getPropertyListing(query: PropertyListingQuery): PropertyListingResult {
  const all = getProperties();

  // 1. Filter
  const filtered = all.filter((p) => matchesFilters(p, query));

  // 2. Sort
  const sorted = sortProperties(filtered, query.sort);

  // 3. Paginate
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const start = (query.page - 1) * query.pageSize;
  const paged = sorted.slice(start, start + query.pageSize);

  // 4. Shape
  const items = paged.map(toListItem);

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
}

// ---------------------------------------------------------------------------
// Detail response types
// ---------------------------------------------------------------------------

export interface AgentSummary {
  agentId: string;
  slug: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  shortBio: string | null;
  stats: { label: string } | null;
}

// Main specification panel. Values are stable keys / numbers so the frontend
// can translate them. Fields that don't apply to the property type are null
// (or [] for heating) — the frontend simply skips those rows.
export interface PropertySpecs {
  propertyType: string; // key: apartment, house, plot, land, …
  area: number | null; // m²
  landArea: number | null; // ares
  location: string; // "City, Hood" — never street / number
  rooms: number | null;
  bathrooms: number | null;
  floor: string | null; // "ground" or a floor number — apartments only
  totalFloors: number | null; // apartments only
  furnished: string | null; // key: furnished, semi_furnished, empty
  heating: string[]; // keys: central, gas, underfloor, …
  registration: "registered" | "in_progress" | "unregisterable" | "not_registered";
  constructionYear: number | null;
}

// ---------------------------------------------------------------------------
// Feature chips (kvadratići)
//
// Ordered most interesting first; the frontend shows them in one row.
// ---------------------------------------------------------------------------

const FEATURE_PRIORITY: readonly string[] = [
  // Rare / standout
  "penthouse",
  "villa",
  "duplex",
  "luxury",
  "pool",
  // Notable
  "pet_friendly",
  "new_build",
  "under_construction",
  "salon",
  // Common amenities
  "elevator",
  "terrace",
  "garage_space",
  "parking",
  "basement",
  "storage",
  // Land / house infrastructure
  "paved_road",
  "city_water",
  "city_sewage",
  // Permits (plots / farmland)
  "building_permit",
  "location_permit",
  "occupancy_permit",
  // Condition / buying
  "renovated",
  "move_in_ready",
  "mortgage_eligible",
];

const MAX_FEATURES = 12;

// Infrastructure only says something for houses and land; apartments always have it
const INFRASTRUCTURE_FEATURES: ReadonlySet<string> = new Set(["paved_road", "city_water", "city_sewage"]);
const INFRASTRUCTURE_TYPES: ReadonlySet<string> = new Set(["house", "plot", "land"]);
const PERMIT_FEATURES: ReadonlySet<string> = new Set(["building_permit", "location_permit", "occupancy_permit"]);
const NO_ELEVATOR_TYPES: ReadonlySet<string> = new Set(["house", "plot", "land"]);

function featureApplies(key: string, propertyTypeKey: string): boolean {
  if (INFRASTRUCTURE_FEATURES.has(key)) return INFRASTRUCTURE_TYPES.has(propertyTypeKey);
  if (PERMIT_FEATURES.has(key)) return LAND_TYPE_KEYS.has(propertyTypeKey);
  if (key === "elevator") return !NO_ELEVATOR_TYPES.has(propertyTypeKey);
  return true;
}

function buildFeatureList(property: Property): string[] {
  return FEATURE_PRIORITY.filter(
    (key) => property.featureKeys.includes(key) && featureApplies(key, property.propertyTypeKey),
  ).slice(0, MAX_FEATURES);
}

export interface PropertyDetail {
  id: string;
  slug: string;
  url: string;
  code: string | null;
  title: string;
  transactionType: string;
  propertyType: string;
  price: number | null; // null = "cena na upit"
  images: ApiImage[];
  description: string | null;
  location: string;
  specs: PropertySpecs;
  features: string[];
  area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  heating: string | null;
  furnished: string | null;
  elevator: boolean;
  registrationStatus: string | null;
  highlights: string[];
  agent: AgentSummary | null;
  relatedProperties: PropertyListItem[];
}

// ---------------------------------------------------------------------------
// Detail service
// ---------------------------------------------------------------------------

function buildAgentSummary(agentId: string): AgentSummary | null {
  const agents = getAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return null;

  const enrichment = getEnrichment(agent.id);

  return {
    agentId: agent.id,
    slug: agent.slug,
    fullName: agent.name,
    phone: agent.phone,
    email: agent.email,
    photo: enrichment?.imageUrl ?? agent.imageUrl,
    shortBio: enrichment?.bio ?? agent.bio,
    stats: enrichment?.stats ?? null,
  };
}

// ---------------------------------------------------------------------------
// Related properties ("Slične nekretnine")
//
// Similar = closest in price. Agreed with the client:
// 1. same transaction type only (sale with sale, rent with rent)
// 2. same property type first, then other types to fill the 6 slots
// 3. ranked by relative price distance (|Δ| / price) — works the same for
//    a 500 €/month rent and a 500.000 € villa; the client's original price
//    bands (±10k…±50k) are roughly ±10%, so they are always picked first
// 4. "cena na upit" properties are never suggested (no price to compare);
//    for such a property, only same-type properties are shown
// The 6 picked are displayed most similar first (closest price first).
// ---------------------------------------------------------------------------

const RELATED_LIMIT = 6;

function newestFirst(a: Property, b: Property): number {
  return Number(b.id) - Number(a.id);
}

function getRelatedProperties(property: Property): PropertyListItem[] {
  const candidates = getProperties().filter(
    (p) =>
      p.id !== property.id &&
      p.transactionType === property.transactionType &&
      !p.priceOnRequest,
  );

  let picked: Property[];

  if (property.priceOnRequest) {
    picked = candidates
      .filter((p) => p.propertyTypeKey === property.propertyTypeKey)
      .sort(newestFirst)
      .slice(0, RELATED_LIMIT);
  } else {
    const otherType = (p: Property) => (p.propertyTypeKey === property.propertyTypeKey ? 0 : 1);
    const distance = (p: Property) => Math.abs(p.price - property.price) / property.price;

    picked = candidates
      .sort((a, b) => otherType(a) - otherType(b) || distance(a) - distance(b) || newestFirst(a, b))
      .slice(0, RELATED_LIMIT);
  }

  return picked.map(toListItem);
}

// ---------------------------------------------------------------------------
// Specification panel
//
// Type rules (agreed with the client):
// - floor + totalFloors only for apartments
// - land types (plot, farmland): only type, land area, location, registration
// - missing registration means "not registered"
// ---------------------------------------------------------------------------

function buildSpecs(property: Property): PropertySpecs {
  const isApartment = property.propertyTypeKey === "apartment";
  const isLand = LAND_TYPE_KEYS.has(property.propertyTypeKey);

  return {
    propertyType: property.propertyTypeKey,
    area: property.surface,
    landArea: publicLandArea(property),
    location: property.locationLabel,
    rooms: isLand ? null : property.roomStructure,
    bathrooms: isLand ? null : property.bathrooms,
    floor: isApartment ? property.floor : null,
    totalFloors: isApartment ? property.totalFloors : null,
    furnished: isLand ? null : property.furnishedKey,
    heating: isLand ? [] : property.heatingKeys,
    registration: property.registrationStatus ?? "not_registered",
    constructionYear: isLand ? null : property.constructionYear,
  };
}

/**
 * Look up a single property by ID and return the full detail projection.
 * Returns null if the property is not found in the cache.
 */
export function getPropertyDetail(propertyId: string): PropertyDetail | null {
  const properties = getProperties();
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return null;

  return {
    id: property.id,
    slug: property.slug,
    url: buildPropertyUrl(property.slug, property.id),
    code: property.code,
    title: property.title,
    transactionType: property.transactionType,
    propertyType: property.propertyTypeLabel,
    price: publicPrice(property),
    images: mapImages(property),
    description: property.description,
    location: property.locationLabel,
    specs: buildSpecs(property),
    features: buildFeatureList(property),
    area: property.surface,
    rooms: property.roomStructure,
    bathrooms: property.bathrooms,
    floor: property.floorRaw,
    heating: property.heating.length > 0 ? property.heating.join(", ") : null,
    furnished: property.furnishedLabel,
    elevator: property.hasElevator,
    registrationStatus: property.registrationStatus,
    highlights: buildHighlights(property),
    agent: buildAgentSummary(property.agentId),
    relatedProperties: getRelatedProperties(property),
  };
}

// ---------------------------------------------------------------------------
// Exports for tests and downstream modules
// ---------------------------------------------------------------------------

export { hasPublicFeature, matchesConstruction };
export { buildPropertyUrl, mapImages, buildHighlights, toListItem, matchesFilters, sortProperties, buildAgentSummary, getRelatedProperties, buildSpecs, buildFeatureList, FEATURE_PRIORITY };
