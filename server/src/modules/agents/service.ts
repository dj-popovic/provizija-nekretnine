// ---------------------------------------------------------------------------
// Agent read service
//
// Reads from the in-memory cache and shapes public API response models.
// Enrichment is applied via the enrichment layer (Task 9.2).
// ---------------------------------------------------------------------------

import type { Agent } from "../shared/models.js";
import { getAgents, getProperties } from "../shared/cache.js";
import { toListItem } from "../properties/service.js";
import type { PropertyListItem } from "../properties/service.js";
import { getEnrichment } from "./enrichment.js";

// ---------------------------------------------------------------------------
// Public API response types
// ---------------------------------------------------------------------------

export interface AgentListItem {
  slug: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  shortBio: string | null;
  stats: { label: string } | null;
}

export interface AgentDetailData {
  agentId: string;
  slug: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  shortBio: string | null;
  stats: { label: string } | null;
}

export interface AgentDetailResult {
  agent: AgentDetailData;
  properties: PropertyListItem[];
}

export interface AgentListResult {
  items: AgentListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Shaping helpers
// ---------------------------------------------------------------------------

function applyEnrichment(agent: Agent): {
  photo: string | null;
  shortBio: string | null;
  stats: { label: string } | null;
} {
  const enrichment = getEnrichment(agent.id);
  return {
    photo: enrichment?.imageUrl ?? agent.imageUrl,
    shortBio: enrichment?.bio ?? agent.bio,
    stats: enrichment?.stats ?? null,
  };
}

function toAgentListItem(agent: Agent): AgentListItem {
  const enriched = applyEnrichment(agent);
  return {
    slug: agent.slug,
    fullName: agent.name,
    phone: agent.phone,
    email: agent.email,
    photo: enriched.photo,
    shortBio: enriched.shortBio,
    stats: enriched.stats,
  };
}

function toAgentDetail(agent: Agent): AgentDetailData {
  const enriched = applyEnrichment(agent);
  return {
    agentId: agent.id,
    slug: agent.slug,
    fullName: agent.name,
    phone: agent.phone,
    email: agent.email,
    photo: enriched.photo,
    shortBio: enriched.shortBio,
    stats: enriched.stats,
  };
}

// ---------------------------------------------------------------------------
// List agents
// ---------------------------------------------------------------------------

const AGENTS_PAGE_SIZE = 50;

export function listAgents(): AgentListResult {
  const agents = getAgents();
  const items = agents.map(toAgentListItem);
  const total = items.length;

  return {
    items,
    pagination: {
      page: 1,
      pageSize: AGENTS_PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / AGENTS_PAGE_SIZE)),
    },
  };
}

// ---------------------------------------------------------------------------
// Get agent by slug (with associated properties)
// ---------------------------------------------------------------------------

export function getAgentBySlug(slug: string): AgentDetailResult | null {
  const agents = getAgents();
  const agent = agents.find((a) => a.slug === slug);
  if (!agent) return null;

  // Get all properties assigned to this agent
  const allProperties = getProperties();
  const agentProperties = allProperties
    .filter((p) => p.agentId === agent.id)
    .map(toListItem);

  return {
    agent: toAgentDetail(agent),
    properties: agentProperties,
  };
}
