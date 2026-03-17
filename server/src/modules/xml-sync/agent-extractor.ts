import { logger } from "../shared/logger.js";
import { normalizeString, slugify } from "../shared/utils.js";
import type { RawXmlListing } from "./raw-listing.js";
import type { Agent } from "../shared/models.js";

// ---------------------------------------------------------------------------
// Agent extractor
//
// Derives a deduplicated Agent collection from raw XML listings.
//
// Each listing may carry agent fields (id_agent, agent_name, agent_email,
// agent_phone). Multiple listings can share the same agent. This function
// collects one Agent record per unique id_agent using first-wins deduplication.
//
// Records without a valid id_agent are silently skipped here — those were
// already logged as rejected properties by the validator.
// ---------------------------------------------------------------------------

export function extractAgents(raws: RawXmlListing[]): Agent[] {
  const seen = new Map<string, Agent>();

  for (const raw of raws) {
    const id = normalizeString(raw.id_agent);
    if (!id) continue;

    // First occurrence wins — agent fields are expected to be consistent
    // across listings for the same agent.
    if (seen.has(id)) continue;

    const name = normalizeString(raw.agent_name);
    if (!name) {
      // id_agent present but no usable name — skip this candidate.
      // The next listing for the same agent may have a name.
      logger.debug(
        { id_agent: id },
        "xml-sync: agent skipped — id_agent present but name is empty",
      );
      continue;
    }

    seen.set(id, {
      id,
      slug: slugify(name),
      name,
      email: normalizeString(raw.agent_email) ?? null,
      phone: normalizeString(raw.agent_phone) ?? null,
      imageUrl: null,
      bio: null,
    });
  }

  const agents = Array.from(seen.values());

  logger.info(
    { count: agents.length },
    "xml-sync: agent extraction complete",
  );

  return agents;
}
