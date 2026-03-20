// ---------------------------------------------------------------------------
// Honeypot check for form submissions
//
// The frontend includes a hidden field "website" that real users never fill.
// If it contains a value, the submission is treated as bot spam.
// Returns a fake success response to avoid revealing the detection.
// ---------------------------------------------------------------------------

import { logger } from "../shared/logger.js";

const HONEYPOT_FIELD = "website";

export function isHoneypotFilled(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  if (typeof value === "string" && value.trim().length > 0) {
    logger.warn("Honeypot triggered — likely bot submission");
    return true;
  }
  return false;
}

/** Fake success response returned when honeypot is triggered. */
export const honeypotResponse = {
  status: 200 as const,
  response: {
    data: {
      success: true,
      message: "Form submitted successfully.",
    },
  },
};
