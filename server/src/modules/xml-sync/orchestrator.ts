// ---------------------------------------------------------------------------
// Sync orchestrator
//
// Runs the full XML sync pipeline end-to-end:
//   fetch → parse → map → validate → extract agents → assemble dataset
//   → write backup → swap cache → update status
//
// A few bad records do not fail the sync — only a complete pipeline error
// or zero valid properties triggers a failure.
// ---------------------------------------------------------------------------

import { logger } from "../shared/logger.js";
import { replaceDataset, writeBackup } from "../shared/index.js";
import { fetchXmlFeed } from "./fetcher.js";
import { parseXmlFeed } from "./parser.js";
import { toRawXmlListing } from "./raw-listing.js";
import { validateAndNormalize } from "./validator.js";
import { extractAgents } from "./agent-extractor.js";
import { assembleDataset } from "./dataset.js";
import { recordSuccess, recordFailure } from "./sync-status.js";

const log = logger.child({ module: "sync" });

// Guard against overlapping sync runs
let running = false;

/**
 * Execute one full sync cycle.
 *
 * Returns true on success (including partial success), false on failure.
 * Never throws — all errors are caught, logged, and recorded in sync status.
 */
export async function runSync(): Promise<boolean> {
  if (running) {
    log.warn("Sync already in progress — skipping");
    return false;
  }

  running = true;
  log.info("Sync started");

  try {
    // 1. Fetch
    const xml = await fetchXmlFeed();

    // 2. Parse
    const rawRecords = parseXmlFeed(xml);

    // 3. Map to typed raw listings
    const rawListings = rawRecords.map(toRawXmlListing);

    // 4. Validate + normalize properties
    const { properties, rejectedCount } = validateAndNormalize(rawListings);

    // 5. Extract agents from all raw listings (including those whose
    //    properties were rejected — agent data may still be valid)
    const agents = extractAgents(rawListings);

    // Total failure: no valid properties at all
    if (properties.length === 0) {
      const message = `Sync produced 0 valid properties out of ${rawListings.length} records`;
      log.error(message);
      recordFailure(message);
      return false;
    }

    // 6. Assemble dataset
    const dataset = assembleDataset(properties, agents);

    // 7. Persist JSON backup
    await writeBackup(dataset);

    // 8. Swap in-memory cache
    replaceDataset(dataset);

    // 9. Update sync status
    recordSuccess({
      properties: dataset.properties.length,
      agents: dataset.agents.length,
      invalid: rejectedCount,
    });

    log.info(
      {
        properties: dataset.properties.length,
        agents: dataset.agents.length,
        rejected: rejectedCount,
      },
      "Sync completed successfully",
    );

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err }, "Sync failed");
    recordFailure(message);
    return false;
  } finally {
    running = false;
  }
}
