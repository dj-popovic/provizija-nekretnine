// ---------------------------------------------------------------------------
// In-memory runtime cache
//
// Holds the current NormalizedDataset used by all public read modules.
// Replaced atomically after each successful sync.
// ---------------------------------------------------------------------------

import type { NormalizedDataset, Property, Agent } from "./models.js";
import { logger } from "./logger.js";

const log = logger.child({ module: "cache" });

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let dataset: NormalizedDataset | null = null;

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** Replace the entire cached dataset. Only call after a successful sync. */
export function replaceDataset(next: NormalizedDataset): void {
  dataset = next;
  log.info(
    { properties: next.properties.length, agents: next.agents.length },
    "Cache replaced",
  );
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Return the full dataset, or null if the cache has not been initialized. */
export function getDataset(): NormalizedDataset | null {
  return dataset;
}

/** Return all cached properties (empty array when uninitialized). */
export function getProperties(): Property[] {
  return dataset?.properties ?? [];
}

/** Return all cached agents (empty array when uninitialized). */
export function getAgents(): Agent[] {
  return dataset?.agents ?? [];
}

/** Whether the cache currently holds data. */
export function isLoaded(): boolean {
  return dataset !== null;
}
