import type { Property, Agent, NormalizedDataset } from "../../shared/models.js";

/**
 * Returns a valid Property with all required fields populated.
 * Pass partial overrides to test specific field combinations.
 */
export function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "100",
    slug: "trosoban-stan-na-vracaru",
    transactionType: "sale",
    propertyTypeKey: "apartment",
    propertyTypeLabel: "Stan",
    title: "Trosoban stan na Vračaru",
    description: "Lep stan u centru grada.",
    city: "Beograd",
    hood: "Vračar",
    hoodPart: null,
    street: "Krunska",
    streetNumber: "12",
    flatNumber: null,
    address: "Krunska 12",
    locationLabel: "Beograd, Vračar",
    price: 150000,
    surface: 75,
    landSurface: null,
    roomStructure: 3,
    bathrooms: 1,
    floorRaw: "3",
    totalFloors: 5,
    constructionYear: 2005,
    furnishedKey: "furnished",
    furnishedLabel: "Namešten",
    heating: ["Centralno"],
    equipment: ["Klima", "Veš mašina"],
    otherFeatures: ["Terasa", "Lift", "Uknjižen"],
    hasTerrace: true,
    hasElevator: true,
    hasParking: false,
    hasGarage: false,
    isNewConstruction: false,
    registrationStatus: "registered",
    images: [
      { url: "https://example.com/img1.jpg", order: 1 },
      { url: "https://example.com/img2.jpg", order: 2 },
    ],
    primaryImage: { url: "https://example.com/img1.jpg", order: 1 },
    agentId: "42",
    sourceDeletedFlag: false,
    ...overrides,
  };
}

export function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "42",
    slug: "marko-petrovic",
    name: "Marko Petrović",
    email: "marko@example.com",
    phone: "0611234567",
    imageUrl: null,
    bio: null,
    ...overrides,
  };
}

/**
 * Builds a test dataset with the given properties and agents.
 */
export function makeDataset(
  properties?: Property[],
  agents?: Agent[],
): NormalizedDataset {
  return {
    properties: properties ?? [makeProperty()],
    agents: agents ?? [makeAgent()],
  };
}
