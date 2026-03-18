// ---------------------------------------------------------------------------
// JSON backup persistence
//
// Writes / reads the NormalizedDataset to/from a JSON file on disk.
// The file acts as a fallback so the backend can start with the last known
// good dataset even when the XML feed is unavailable.
//
// File location: server/src/data/properties-cache.json
// ---------------------------------------------------------------------------

import { writeFile, readFile, rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NormalizedDataset } from "./models.js";
import { logger } from "./logger.js";

const log = logger.child({ module: "backup" });

// ---------------------------------------------------------------------------
// Path resolution
//
// Resolve relative to the source tree so the file always lands in
// server/src/data/ regardless of whether we run from src/ or dist/.
// ---------------------------------------------------------------------------

const thisDir = path.dirname(fileURLToPath(import.meta.url));
// thisDir is either …/src/modules/shared  or  …/dist/modules/shared
// Walk up to server root, then into src/data/
const serverRoot = path.resolve(thisDir, "..", "..", "..");
const DATA_DIR = path.join(serverRoot, "src", "data");
const CACHE_FILE = path.join(DATA_DIR, "properties-cache.json");
const TEMP_FILE = `${CACHE_FILE}.tmp`;

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Persist the normalized dataset to disk as JSON.
 * Uses write-to-temp + rename for safe overwrite.
 */
export async function writeBackup(dataset: NormalizedDataset): Promise<void> {
  try {
    // Ensure the data directory exists (should already, but be safe)
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }

    const json = JSON.stringify(dataset);
    await writeFile(TEMP_FILE, json, "utf-8");
    await rename(TEMP_FILE, CACHE_FILE);

    log.info(
      { properties: dataset.properties.length, agents: dataset.agents.length },
      "Backup written to disk",
    );
  } catch (err) {
    log.error({ err }, "Failed to write backup to disk");
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Read the backup file from disk and return the parsed dataset,
 * or null if the file is missing or invalid.
 */
export async function readBackup(): Promise<NormalizedDataset | null> {
  try {
    if (!existsSync(CACHE_FILE)) {
      log.info("No backup file found — starting with empty cache");
      return null;
    }

    const raw = await readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as NormalizedDataset;

    // Basic structural check
    if (!Array.isArray(parsed.properties) || !Array.isArray(parsed.agents)) {
      log.warn("Backup file has invalid structure — ignoring");
      return null;
    }

    log.info(
      { properties: parsed.properties.length, agents: parsed.agents.length },
      "Backup loaded from disk",
    );
    return parsed;
  } catch (err) {
    log.warn({ err }, "Failed to read backup file — starting with empty cache");
    return null;
  }
}
