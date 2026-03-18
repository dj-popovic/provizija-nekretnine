// ---------------------------------------------------------------------------
// Sync status state holder
//
// Module-scoped state tracking the outcome of sync attempts.
// Updated by the sync orchestrator, read by the status endpoint (Phase 7).
// ---------------------------------------------------------------------------

import type { SyncStatus } from "../shared/models.js";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let current: SyncStatus = {
  status: "pending",
  lastSuccessfulSyncAt: null,
  lastAttemptAt: null,
  loadedPropertiesCount: 0,
  loadedAgentsCount: 0,
  invalidPropertiesCount: 0,
  lastError: null,
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function getSyncStatus(): SyncStatus {
  return { ...current };
}

// ---------------------------------------------------------------------------
// Write — called by the sync orchestrator
// ---------------------------------------------------------------------------

export function recordSuccess(counts: {
  properties: number;
  agents: number;
  invalid: number;
}): void {
  const now = new Date().toISOString();
  current = {
    status: "ok",
    lastSuccessfulSyncAt: now,
    lastAttemptAt: now,
    loadedPropertiesCount: counts.properties,
    loadedAgentsCount: counts.agents,
    invalidPropertiesCount: counts.invalid,
    lastError: null,
  };
}

export function recordFailure(error: string): void {
  current = {
    ...current,
    status: "error",
    lastAttemptAt: new Date().toISOString(),
    lastError: error,
  };
}
