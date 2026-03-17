import { logger } from "../shared/logger.js";
import { normalizeString, parsePositiveNumber } from "../shared/utils.js";
import type { RawXmlListing } from "./raw-listing.js";
import { normalizeProperty } from "./normalizer.js";
import type { Property } from "../shared/models.js";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface NormalizationResult {
  properties: Property[];
  rejectedCount: number;
}

// ---------------------------------------------------------------------------
// Batch validator
//
// Processes all raw listings from one sync run.
//
// For each record:
// - Deleted records are excluded immediately (expected, logged at debug level).
// - Records that fail normalization are rejected with a logged reason.
// - Valid records are collected into the output array.
//
// A few bad records must not fail the whole batch.
// ---------------------------------------------------------------------------

export function validateAndNormalize(
  raws: RawXmlListing[],
): NormalizationResult {
  const properties: Property[] = [];
  let rejectedCount = 0;

  for (const raw of raws) {
    const propertyId = String(raw.property_id ?? "unknown");

    // Deleted records are excluded. This is an expected condition —
    // the feed includes deleted listings with deleted=1.
    if (String(raw.deleted) === "1") {
      logger.debug(
        { property_id: propertyId },
        "xml-sync: property skipped — marked as deleted",
      );
      rejectedCount++;
      continue;
    }

    const property = normalizeProperty(raw);

    if (!property) {
      const reason = findRejectionReason(raw);
      logger.warn(
        { property_id: propertyId, reason },
        "xml-sync: property rejected — failed normalization",
      );
      rejectedCount++;
      continue;
    }

    properties.push(property);
  }

  logger.info(
    { accepted: properties.length, rejected: rejectedCount, total: raws.length },
    "xml-sync: property validation complete",
  );

  return { properties, rejectedCount };
}

// ---------------------------------------------------------------------------
// Rejection reason helper
//
// Called only when normalizeProperty has already returned null.
// Walks the same required-field conditions in the same order the normalizer
// does, so the log message identifies the specific failure point.
// ---------------------------------------------------------------------------

function findRejectionReason(raw: RawXmlListing): string {
  if (!normalizeString(raw.property_id)) {
    return "missing property_id";
  }

  const purposeId = normalizeString(raw.purpose_id);
  if (!purposeId || !["1", "2"].includes(purposeId)) {
    return `unknown purpose_id: ${purposeId ?? "undefined"}`;
  }

  if (!normalizeString(raw.property_name)) {
    return "missing property_name";
  }

  if (!normalizeString(raw.property_city)) {
    return "missing city";
  }

  if (parsePositiveNumber(raw.property_price) === undefined) {
    return `invalid or missing price: ${String(raw.property_price)}`;
  }

  // Surface check mirrors the normalizer's land-type fallback logic
  if (parsePositiveNumber(raw.property_surface) === undefined) {
    const landSurface = parsePositiveNumber(raw.property_land_surface);
    const propertyType = normalizeString(raw.property_type);
    const isLandType =
      propertyType === "Plac" || propertyType === "Poljoprivredno zemljište";

    if (!isLandType || landSurface === undefined) {
      return `invalid or missing surface: ${String(raw.property_surface)}`;
    }
  }

  if (!normalizeString(raw.id_agent)) {
    return "missing id_agent";
  }

  return "normalization failed (unknown reason)";
}
