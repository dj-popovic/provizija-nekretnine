// ---------------------------------------------------------------------------
// Periodic sync scheduler
//
// Runs the sync orchestrator on a configurable interval.
// Started after initial boot, stoppable for clean shutdown.
// ---------------------------------------------------------------------------

import { config } from "../../config/index.js";
import { logger } from "../shared/logger.js";
import { runSync } from "./orchestrator.js";

const log = logger.child({ module: "scheduler" });

let timer: ReturnType<typeof setInterval> | null = null;

/** Start the periodic refresh job. Safe to call multiple times — duplicates are ignored. */
export function startScheduler(): void {
  if (timer) {
    log.warn("Scheduler already running");
    return;
  }

  const intervalMs = config.xmlRefreshIntervalMs;
  log.info({ intervalMs }, "Starting periodic sync scheduler");

  timer = setInterval(() => {
    void runSync();
  }, intervalMs);
}

/** Stop the periodic refresh job. */
export function stopScheduler(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  log.info("Periodic sync scheduler stopped");
}
