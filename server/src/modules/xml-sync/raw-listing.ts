import { toArray } from "../shared/utils.js";

// ---------------------------------------------------------------------------
// RawXmlListing
//
// Represents a single listing record as it comes out of the XML parser.
// Scalar fields are typed as `unknown` — fast-xml-parser may return string,
// number, boolean, or empty string depending on the element content.
// Nested repeatable fields are extracted into plain string[] here so that
// the downstream normalizer (Task 4.2) does not need to deal with the
// parser's object-wrapping behavior.
//
// This type is internal to the xml-sync pipeline. It must not be exposed
// through the public API.
// ---------------------------------------------------------------------------

export interface RawXmlListing {
  // Identity and classification
  property_id: unknown;
  purpose_id: unknown;
  property_name: unknown;
  deleted: unknown;
  property_type: unknown;

  // Location
  property_city: unknown;
  property_hood: unknown;
  property_hood_part: unknown;
  property_street: unknown;
  property_street_number: unknown;
  property_flat_number: unknown;

  // Numeric / structural
  property_price: unknown;
  property_surface: unknown;
  property_land_surface: unknown;
  property_floor: unknown;
  property_floors: unknown;
  property_construction_year: unknown;
  structure: unknown;
  bath: unknown;

  // Description
  property_description: unknown;

  // Furnishing (scalar label)
  furnished: unknown;

  // Feature lists — normalized to string[] by the mapper
  heating: string[];
  furniture: string[];
  equipment: string[];
  otherFeatures: string[];

  // Media — image URLs normalized to string[] by the mapper
  images: string[];

  // Agent
  id_agent: unknown;
  agent_email: unknown;
  agent_phone: unknown;
  agent_name: unknown;
}

// ---------------------------------------------------------------------------
// Mapper: unknown parser record → RawXmlListing
// ---------------------------------------------------------------------------

/**
 * Maps one parsed XML record (unknown shape) into a typed RawXmlListing.
 *
 * Scalar fields are passed through as-is (still unknown — normalization
 * happens in Task 4.2). Nested repeatable fields are extracted into
 * plain string[] here.
 *
 * Throws if the record is not an object, which would indicate a parser bug.
 */
export function toRawXmlListing(record: unknown): RawXmlListing {
  if (typeof record !== "object" || record === null) {
    throw new Error(
      `xml-sync: expected listing record to be an object, got ${typeof record}`,
    );
  }

  const r = record as Record<string, unknown>;

  return {
    // Identity and classification
    property_id: r["property_id"],
    purpose_id: r["purpose_id"],
    property_name: r["property_name"],
    deleted: r["deleted"],
    property_type: r["property_type"],

    // Location
    property_city: r["property_city"],
    property_hood: r["property_hood"],
    property_hood_part: r["property_hood_part"],
    property_street: r["property_street"],
    property_street_number: r["property_street_number"],
    property_flat_number: r["property_flat_number"],

    // Numeric / structural
    property_price: r["property_price"],
    property_surface: r["property_surface"],
    property_land_surface: r["property_land_surface"],
    property_floor: r["property_floor"],
    property_floors: r["property_floors"],
    property_construction_year: r["property_construction_year"],
    structure: r["structure"],
    bath: r["bath"],

    // Description
    property_description: r["property_description"],

    // Furnishing
    furnished: r["furnished"],

    // Feature lists — extract nested arrays
    heating: extractStringArray(r["heating"], "heating_type"),
    furniture: extractStringArray(r["furniture"], "furniture_element"),
    equipment: extractStringArray(r["equipment"], "equipment_element"),
    otherFeatures: extractStringArray(r["other"], "other_element"),

    // Images — extract from nested <image> elements
    images: extractImageUrls(r["images"]),

    // Agent
    id_agent: r["id_agent"],
    agent_email: r["agent_email"],
    agent_phone: r["agent_phone"],
    agent_name: r["agent_name"],
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a string array from a nested XML element object.
 *
 * The parser produces either:
 * - an object like { heating_type: ["Gas"] } when content is present
 * - an empty string "" when the element is self-closing (<heating/>)
 * - undefined when the field is absent
 */
function extractStringArray(
  parent: unknown,
  childKey: string,
): string[] {
  if (typeof parent !== "object" || parent === null) return [];
  const children = (parent as Record<string, unknown>)[childKey];
  return toArray(children as string | string[] | null | undefined).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

/**
 * Extracts image URLs from the parsed <images> element.
 *
 * The parser produces either:
 * - an object like { image: ["url1", "url2"] } when images are present
 * - an empty string "" when the element is self-closing (<images/>)
 * - undefined when the field is absent
 *
 * Image order is positional (first in XML = first in array).
 */
function extractImageUrls(images: unknown): string[] {
  if (typeof images !== "object" || images === null) return [];
  const raw = (images as Record<string, unknown>)["image"];
  return toArray(raw as string | string[] | null | undefined).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}
