import { XMLParser } from "fast-xml-parser";
import { logger } from "../shared/logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export class XmlParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "XmlParseError";
  }
}

// ---------------------------------------------------------------------------
// Parser config
// ---------------------------------------------------------------------------

// These fields can appear multiple times inside their parent element.
// fast-xml-parser collapses single-child elements to a scalar by default,
// so we force them to always be arrays.
const ALWAYS_ARRAY_FIELDS = new Set([
  "listing",
  "furniture_element",
  "equipment_element",
  "other_element",
  "heating_type",
  "image",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
  isArray: (tagName) => ALWAYS_ARRAY_FIELDS.has(tagName),
});

// ---------------------------------------------------------------------------
// Parse service
// ---------------------------------------------------------------------------

/**
 * Parses raw XML from the RELPER feed into an array of raw listing objects.
 *
 * Returns `unknown[]` — Phase 4 maps these into the typed `RawXmlListing` model.
 * Throws `XmlParseError` on malformed XML or unexpected document structure.
 */
export function parseXmlFeed(xml: string): unknown[] {
  let parsed: unknown;

  try {
    parsed = parser.parse(xml);
  } catch (err) {
    const message = "xml-sync: failed to parse XML";
    logger.error({ err }, message);
    throw new XmlParseError(message, err);
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("listings" in parsed)
  ) {
    const message = "xml-sync: parsed XML has no <listings> root element";
    logger.error({ parsed }, message);
    throw new XmlParseError(message);
  }

  const listings = (parsed as Record<string, unknown>).listings;

  if (typeof listings !== "object" || listings === null) {
    const message = "xml-sync: <listings> element is empty or malformed";
    logger.error({ listings }, message);
    throw new XmlParseError(message);
  }

  const listingsObj = listings as Record<string, unknown>;

  // Feed may have zero listings (e.g. during initial setup)
  if (!("listing" in listingsObj)) {
    logger.warn("xml-sync: XML feed contains no <listing> elements");
    return [];
  }

  const records = listingsObj.listing;

  if (!Array.isArray(records)) {
    const message = "xml-sync: <listing> did not resolve to an array";
    logger.error({ records }, message);
    throw new XmlParseError(message);
  }

  logger.info({ count: records.length }, "xml-sync: XML parsed successfully");

  return records;
}
