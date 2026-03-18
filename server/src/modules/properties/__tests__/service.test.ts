import { describe, it, expect, beforeEach } from "vitest";
import { replaceDataset } from "../../shared/cache.js";
import { makeProperty, makeAgent, makeDataset } from "./fixtures.js";
import {
  getPropertyListing,
  getPropertyDetail,
  matchesFilters,
  sortProperties,
  buildHighlights,
  toListItem,
} from "../service.js";
import type { PropertyListingQuery } from "../query.js";

// ---------------------------------------------------------------------------
// Helper: build a default query with overrides
// ---------------------------------------------------------------------------

function makeQuery(overrides: Partial<PropertyListingQuery> = {}): PropertyListingQuery {
  return {
    transactionType: undefined,
    propertyType: undefined,
    location: undefined,
    rooms: undefined,
    priceMin: undefined,
    priceMax: undefined,
    areaMin: undefined,
    areaMax: undefined,
    sort: "newest",
    page: 1,
    pageSize: 12,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

describe("matchesFilters", () => {
  const property = makeProperty();

  it("matches when no filters are set", () => {
    expect(matchesFilters(property, makeQuery())).toBe(true);
  });

  it("filters by transactionType", () => {
    expect(matchesFilters(property, makeQuery({ transactionType: "sale" }))).toBe(true);
    expect(matchesFilters(property, makeQuery({ transactionType: "rent" }))).toBe(false);
  });

  it("filters by propertyType (key)", () => {
    expect(matchesFilters(property, makeQuery({ propertyType: "apartment" }))).toBe(true);
    expect(matchesFilters(property, makeQuery({ propertyType: "house" }))).toBe(false);
  });

  it("filters by location matching city", () => {
    expect(matchesFilters(property, makeQuery({ location: "Beograd" }))).toBe(true);
    expect(matchesFilters(property, makeQuery({ location: "beograd" }))).toBe(true);
    expect(matchesFilters(property, makeQuery({ location: "Novi Sad" }))).toBe(false);
  });

  it("filters by location matching hood", () => {
    expect(matchesFilters(property, makeQuery({ location: "Vračar" }))).toBe(true);
    expect(matchesFilters(property, makeQuery({ location: "vračar" }))).toBe(true);
  });

  it("filters by rooms", () => {
    expect(matchesFilters(property, makeQuery({ rooms: 3 }))).toBe(true);
    expect(matchesFilters(property, makeQuery({ rooms: 2 }))).toBe(false);
  });

  it("filters by price range", () => {
    expect(matchesFilters(property, makeQuery({ priceMin: 100000, priceMax: 200000 }))).toBe(true);
    expect(matchesFilters(property, makeQuery({ priceMin: 160000 }))).toBe(false);
    expect(matchesFilters(property, makeQuery({ priceMax: 100000 }))).toBe(false);
  });

  it("filters by area range", () => {
    expect(matchesFilters(property, makeQuery({ areaMin: 50, areaMax: 100 }))).toBe(true);
    expect(matchesFilters(property, makeQuery({ areaMin: 80 }))).toBe(false);
    expect(matchesFilters(property, makeQuery({ areaMax: 50 }))).toBe(false);
  });

  it("combines multiple filters", () => {
    expect(
      matchesFilters(
        property,
        makeQuery({ transactionType: "sale", location: "Beograd", rooms: 3, priceMax: 200000 }),
      ),
    ).toBe(true);

    expect(
      matchesFilters(
        property,
        makeQuery({ transactionType: "rent", location: "Beograd" }),
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe("sortProperties", () => {
  const p1 = makeProperty({ id: "10", price: 100000 });
  const p2 = makeProperty({ id: "20", price: 200000 });
  const p3 = makeProperty({ id: "30", price: 150000 });

  it("sorts newest first (highest ID)", () => {
    const result = sortProperties([p1, p2, p3], "newest");
    expect(result.map((p) => p.id)).toEqual(["30", "20", "10"]);
  });

  it("sorts priceAsc", () => {
    const result = sortProperties([p1, p2, p3], "priceAsc");
    expect(result.map((p) => p.id)).toEqual(["10", "30", "20"]);
  });

  it("sorts priceDesc", () => {
    const result = sortProperties([p1, p2, p3], "priceDesc");
    expect(result.map((p) => p.id)).toEqual(["20", "30", "10"]);
  });
});

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------

describe("buildHighlights", () => {
  it("includes boolean flag labels", () => {
    const p = makeProperty({ hasTerrace: true, hasElevator: true, hasParking: true });
    const h = buildHighlights(p);
    expect(h).toContain("Terasa");
    expect(h).toContain("Lift");
    expect(h).toContain("Parking");
  });

  it("fills from otherFeatures after flags", () => {
    const p = makeProperty({
      hasTerrace: false,
      hasElevator: false,
      hasParking: false,
      hasGarage: false,
      isNewConstruction: false,
      otherFeatures: ["Klima", "Bazen"],
    });
    const h = buildHighlights(p);
    expect(h).toContain("Klima");
    expect(h).toContain("Bazen");
  });

  it("caps at 5 highlights", () => {
    const p = makeProperty({
      hasTerrace: true,
      hasElevator: true,
      hasParking: true,
      hasGarage: true,
      isNewConstruction: true,
      otherFeatures: ["Extra1", "Extra2"],
    });
    const h = buildHighlights(p);
    expect(h.length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// toListItem shaping
// ---------------------------------------------------------------------------

describe("toListItem", () => {
  it("shapes a property into a list item", () => {
    const p = makeProperty();
    const item = toListItem(p);

    expect(item.id).toBe("100");
    expect(item.slug).toBe("trosoban-stan-na-vracaru");
    expect(item.url).toBe("/nekretnine/trosoban-stan-na-vracaru-100");
    expect(item.title).toBe("Trosoban stan na Vračaru");
    expect(item.transactionType).toBe("sale");
    expect(item.propertyType).toBe("Stan");
    expect(item.location).toBe("Beograd, Vračar");
    expect(item.price).toBe(150000);
    expect(item.area).toBe(75);
    expect(item.rooms).toBe(3);
    expect(item.images.length).toBe(2);
    expect(item.images[0].alt).toBe("Trosoban stan na Vračaru");
  });
});

// ---------------------------------------------------------------------------
// Listing service (integration with cache)
// ---------------------------------------------------------------------------

describe("getPropertyListing", () => {
  beforeEach(() => {
    const properties = [
      makeProperty({ id: "1", price: 100000, surface: 50, transactionType: "sale", city: "Beograd" }),
      makeProperty({ id: "2", price: 200000, surface: 80, transactionType: "sale", city: "Beograd" }),
      makeProperty({ id: "3", price: 150000, surface: 65, transactionType: "rent", city: "Novi Sad" }),
      makeProperty({ id: "4", price: 300000, surface: 120, transactionType: "sale", city: "Novi Sad" }),
      makeProperty({ id: "5", price: 80000, surface: 40, transactionType: "rent", city: "Beograd" }),
    ];
    replaceDataset(makeDataset(properties));
  });

  it("returns all properties with no filters", () => {
    const result = getPropertyListing(makeQuery());
    expect(result.pagination.total).toBe(5);
    expect(result.items.length).toBe(5);
  });

  it("filters by transactionType", () => {
    const result = getPropertyListing(makeQuery({ transactionType: "sale" }));
    expect(result.pagination.total).toBe(3);
    expect(result.items.every((i) => i.transactionType === "sale")).toBe(true);
  });

  it("filters by location (city)", () => {
    const result = getPropertyListing(makeQuery({ location: "Beograd" }));
    expect(result.pagination.total).toBe(3);
  });

  it("filters by price range", () => {
    const result = getPropertyListing(makeQuery({ priceMin: 100000, priceMax: 200000 }));
    expect(result.pagination.total).toBe(3);
  });

  it("filters by area range", () => {
    const result = getPropertyListing(makeQuery({ areaMin: 60, areaMax: 100 }));
    expect(result.pagination.total).toBe(2); // 80, 65
  });

  it("sorts by priceAsc", () => {
    const result = getPropertyListing(makeQuery({ sort: "priceAsc" }));
    const prices = result.items.map((i) => i.price);
    expect(prices).toEqual([80000, 100000, 150000, 200000, 300000]);
  });

  it("sorts by priceDesc", () => {
    const result = getPropertyListing(makeQuery({ sort: "priceDesc" }));
    const prices = result.items.map((i) => i.price);
    expect(prices).toEqual([300000, 200000, 150000, 100000, 80000]);
  });

  it("sorts newest first by default (highest ID)", () => {
    const result = getPropertyListing(makeQuery());
    const ids = result.items.map((i) => i.id);
    expect(ids).toEqual(["5", "4", "3", "2", "1"]);
  });

  it("paginates correctly", () => {
    const result = getPropertyListing(makeQuery({ page: 1, pageSize: 2 }));
    expect(result.items.length).toBe(2);
    expect(result.pagination.total).toBe(5);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.page).toBe(1);
  });

  it("returns correct items for page 2", () => {
    const page1 = getPropertyListing(makeQuery({ page: 1, pageSize: 2, sort: "priceAsc" }));
    const page2 = getPropertyListing(makeQuery({ page: 2, pageSize: 2, sort: "priceAsc" }));
    expect(page1.items.map((i) => i.id)).not.toEqual(page2.items.map((i) => i.id));
    expect(page2.items.length).toBe(2);
  });

  it("returns empty items for a page beyond total", () => {
    const result = getPropertyListing(makeQuery({ page: 100, pageSize: 12 }));
    expect(result.items.length).toBe(0);
    expect(result.pagination.total).toBe(5);
  });

  it("combines filters + sort + pagination", () => {
    const result = getPropertyListing(
      makeQuery({ transactionType: "sale", sort: "priceAsc", page: 1, pageSize: 2 }),
    );
    expect(result.pagination.total).toBe(3);
    expect(result.items.length).toBe(2);
    expect(result.items[0].price).toBe(100000);
    expect(result.items[1].price).toBe(200000);
  });
});

// ---------------------------------------------------------------------------
// Detail service (integration with cache)
// ---------------------------------------------------------------------------

describe("getPropertyDetail", () => {
  beforeEach(() => {
    const properties = [
      makeProperty({ id: "100", city: "Beograd", transactionType: "sale" }),
      makeProperty({ id: "101", city: "Beograd", transactionType: "sale", slug: "drugi-stan" }),
      makeProperty({ id: "102", city: "Novi Sad", transactionType: "rent", slug: "treci-stan" }),
    ];
    const agents = [makeAgent({ id: "42" })];
    replaceDataset(makeDataset(properties, agents));
  });

  it("returns detail for an existing property", () => {
    const detail = getPropertyDetail("100");
    expect(detail).not.toBeNull();
    expect(detail!.id).toBe("100");
    expect(detail!.url).toBe("/nekretnine/trosoban-stan-na-vracaru-100");
  });

  it("returns null for a non-existent property", () => {
    expect(getPropertyDetail("999")).toBeNull();
  });

  it("includes agent summary", () => {
    const detail = getPropertyDetail("100");
    expect(detail!.agent).not.toBeNull();
    expect(detail!.agent!.agentId).toBe("42");
    expect(detail!.agent!.fullName).toBe("Marko Petrović");
  });

  it("includes related properties (same city + transactionType, excludes self)", () => {
    const detail = getPropertyDetail("100");
    expect(detail!.relatedProperties.length).toBe(1);
    expect(detail!.relatedProperties[0].id).toBe("101");
  });

  it("does not include current property in related results", () => {
    const detail = getPropertyDetail("100");
    expect(detail!.relatedProperties.some((r) => r.id === "100")).toBe(false);
  });

  it("returns empty related when no matches exist", () => {
    const detail = getPropertyDetail("102");
    // 102 is rent in Novi Sad — no other rent properties in Novi Sad
    expect(detail!.relatedProperties.length).toBe(0);
  });
});
