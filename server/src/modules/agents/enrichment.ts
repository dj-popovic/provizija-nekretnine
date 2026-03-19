// ---------------------------------------------------------------------------
// Agent local enrichment layer
//
// Merges locally maintained fields (photo, bio, stats) into XML-driven
// agent data. Keyed by agent id (id_agent from XML).
//
// To add enrichment for an agent, add an entry to AGENT_ENRICHMENT below
// using the agent's XML id_agent as the key.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentEnrichment {
  imageUrl?: string;
  bio?: string;
  stats?: { label: string };
}

// ---------------------------------------------------------------------------
// Enrichment config
//
// Add entries here keyed by agent id_agent (string).
// Example:
//   "15": {
//     imageUrl: "https://example.com/agents/marko.jpg",
//     bio: "Agent za stanove i kuće u Novom Sadu.",
//     stats: { label: "500+ prodatih nekretnina" },
//   },
// ---------------------------------------------------------------------------

const AGENT_ENRICHMENT: Record<string, AgentEnrichment> = {
  // Populate with real agent data when available
};

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export function getEnrichment(agentId: string): AgentEnrichment | undefined {
  return AGENT_ENRICHMENT[agentId];
}
