import { logger } from "../shared/logger.js";
import type { Property, Agent, NormalizedDataset } from "../shared/models.js";

// ---------------------------------------------------------------------------
// Dataset assembly
//
// Combines the validated property collection and the extracted agent collection
// into one coherent NormalizedDataset.
//
// Responsibilities:
// - Exclude agents that are not referenced by any accepted property.
// - Log a warning for any property whose agentId has no corresponding agent
//   record (e.g. id_agent was present but agent name was blank in every
//   listing, so extractAgents skipped it).
// - Emit a final summary log.
//
// Does NOT re-validate or re-normalize — those steps happened upstream.
// ---------------------------------------------------------------------------

export function assembleDataset(
  properties: Property[],
  agents: Agent[],
): NormalizedDataset {
  // Index agents by id for O(1) cross-reference checks.
  const agentsById = new Map<string, Agent>(agents.map((a) => [a.id, a]));

  // Warn about properties whose agentId has no agent record.
  // This can happen when id_agent is set on a property but every listing
  // for that agent had a blank name, causing extractAgents to skip it.
  for (const property of properties) {
    if (!agentsById.has(property.agentId)) {
      logger.warn(
        { property_id: property.id, agent_id: property.agentId },
        "xml-sync: property references an agent_id with no extractable agent record",
      );
    }
  }

  // Only include agents that at least one accepted property references.
  // Agents with no accepted properties are not useful in the runtime dataset.
  const referencedAgentIds = new Set(properties.map((p) => p.agentId));
  const filteredAgents = agents.filter((a) => referencedAgentIds.has(a.id));

  const droppedAgents = agents.length - filteredAgents.length;
  if (droppedAgents > 0) {
    logger.debug(
      { count: droppedAgents },
      "xml-sync: agents excluded — no accepted property references them",
    );
  }

  logger.info(
    { properties: properties.length, agents: filteredAgents.length },
    "xml-sync: normalized dataset assembled",
  );

  return {
    properties,
    agents: filteredAgents,
  };
}
