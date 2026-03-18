import type { RawXmlListing } from "../raw-listing.js";

/**
 * Returns a valid RawXmlListing with all required fields populated.
 * Pass partial overrides to test specific field combinations.
 */
export function makeRawListing(
  overrides: Partial<RawXmlListing> = {},
): RawXmlListing {
  return {
    // Identity
    property_id: "100",
    purpose_id: "2", // sale
    property_name: "Trosoban stan na Vračaru",
    deleted: "0",
    property_type: "Stan",

    // Location
    property_city: "Beograd",
    property_hood: "Vračar",
    property_hood_part: undefined,
    property_street: "Krunska",
    property_street_number: "12",
    property_flat_number: undefined,

    // Numeric
    property_price: "150000",
    property_surface: "75",
    property_land_surface: undefined,
    property_floor: "3",
    property_floors: "5",
    property_construction_year: "2005",
    structure: "3",
    bath: "1 kupatilo",

    // Description
    property_description: "Lep stan u centru grada.",

    // Furnishing
    furnished: "Namešten",

    // Features
    heating: ["Centralno"],
    furniture: ["Krevet", "Sto"],
    equipment: ["Klima", "Veš mašina"],
    otherFeatures: ["Terasa", "Lift", "Uknjižen"],

    // Images
    images: [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
    ],

    // Agent
    id_agent: "42",
    agent_email: "marko@example.com",
    agent_phone: "0611234567",
    agent_name: "Marko Petrović",

    ...overrides,
  };
}
