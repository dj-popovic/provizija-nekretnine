// ---------------------------------------------------------------------------
// Property listing & detail services
//
// Reads from the in-memory cache, applies filtering / sorting / pagination,
// and shapes public API response models.
// ---------------------------------------------------------------------------

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
  price: number;
  images: ApiImage[];
  area: number;
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
    price: property.price,
    images: mapImages(property),
    area: property.surface,
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

  if (query.propertyType && property.propertyTypeKey !== query.propertyType) {
    return false;
  }

  if (query.location) {
    const loc = query.location.toLowerCase();
    const matchesCity = property.city.toLowerCase() === loc;
    const matchesHood = property.hood?.toLowerCase() === loc;
    if (!matchesCity && !matchesHood) {
      return false;
    }
  }

  if (query.rooms !== undefined && property.roomStructure !== query.rooms) {
    return false;
  }

  if (query.priceMin !== undefined && property.price < query.priceMin) {
    return false;
  }
  if (query.priceMax !== undefined && property.price > query.priceMax) {
    return false;
  }

  if (query.areaMin !== undefined && property.surface < query.areaMin) {
    return false;
  }
  if (query.areaMax !== undefined && property.surface > query.areaMax) {
    return false;
  }

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
    case "priceAsc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "priceDesc":
      sorted.sort((a, b) => b.price - a.price);
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

export interface PropertyDetail {
  id: string;
  slug: string;
  url: string;
  title: string;
  transactionType: string;
  propertyType: string;
  price: number;
  images: ApiImage[];
  description: string | null;
  location: string;
  address: string;
  area: number;
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
// Related properties
//
// Deterministic selection: same transactionType + same city, exclude current,
// newest first (highest ID), capped at RELATED_LIMIT.
// ---------------------------------------------------------------------------

const RELATED_LIMIT = 4;

function getRelatedProperties(property: Property): PropertyListItem[] {
  const all = getProperties();

  const candidates = all.filter(
    (p) =>
      p.id !== property.id &&
      p.transactionType === property.transactionType &&
      p.city.toLowerCase() === property.city.toLowerCase(),
  );

  // Newest first (highest ID)
  candidates.sort((a, b) => Number(b.id) - Number(a.id));

  return candidates.slice(0, RELATED_LIMIT).map(toListItem);
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
    title: property.title,
    transactionType: property.transactionType,
    propertyType: property.propertyTypeLabel,
    price: property.price,
    images: mapImages(property),
    description: property.description,
    location: property.locationLabel,
    address: property.address,
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

export { buildPropertyUrl, mapImages, buildHighlights, toListItem, matchesFilters, sortProperties, buildAgentSummary, getRelatedProperties };
