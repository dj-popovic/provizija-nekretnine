import pino from "pino";
import { config } from "../../config/index.js";

const level = config.env === "production" ? "info" : "debug";

export const logger = pino({
  level,
  base: { service: "nekretnine-api" },
});

/**
 * Create a named child logger for a specific module.
 * Usage: const log = createLogger("xml-sync")
 */
export function createLogger(module: string) {
  return logger.child({ module });
}
