// ---------------------------------------------------------------------------
// Home aggregation service
//
// Assembles the homepage response from cached normalized data.
// Featured properties: config-driven list of property IDs.
// Team preview: all agents with enrichment applied.
// ---------------------------------------------------------------------------

import { getProperties, getAgents } from "../shared/cache.js";
import { toListItem } from "../properties/service.js";
import type { PropertyListItem } from "../properties/service.js";
import type { Agent } from "../shared/models.js";
import { getEnrichment } from "../agents/enrichment.js";

// ---------------------------------------------------------------------------
// Featured properties config
//
// Add property IDs here to control which properties appear on the homepage.
// Order matters — properties are returned in the order listed.
// If a listed ID is not found in the cache (e.g. deleted or invalid),
// it is silently skipped.
// ---------------------------------------------------------------------------

const FEATURED_PROPERTY_IDS: string[] = [
  // Populate with real property IDs, e.g.:
  // "4523",
  // "4510",
  // "4498",
];

// ---------------------------------------------------------------------------
// Public API response types
// ---------------------------------------------------------------------------

export interface TeamPreviewItem {
  slug: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  shortBio: string | null;
  stats: { label: string } | null;
}

export interface HomeData {
  featuredProperties: PropertyListItem[];
  teamPreview: TeamPreviewItem[];
}

// ---------------------------------------------------------------------------
// Team preview shaping
// ---------------------------------------------------------------------------

function toTeamPreviewItem(agent: Agent): TeamPreviewItem {
  const enrichment = getEnrichment(agent.id);
  return {
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
// Featured properties selection
//
// Looks up each configured ID from cache. Skips missing entries so a
// deleted or invalid property doesn't break the homepage.
// ---------------------------------------------------------------------------

function getFeaturedProperties(): PropertyListItem[] {
  const all = getProperties();
  const byId = new Map(all.map((p) => [p.id, p]));

  const featured: PropertyListItem[] = [];
  for (const id of FEATURED_PROPERTY_IDS) {
    const property = byId.get(id);
    if (property) {
      featured.push(toListItem(property));
    }
  }

  return featured;
}

// ---------------------------------------------------------------------------
// Home aggregation
// ---------------------------------------------------------------------------

export function getHomeData(): HomeData {
  return {
    featuredProperties: getFeaturedProperties(),
    teamPreview: getAgents().map(toTeamPreviewItem),
  };
}
