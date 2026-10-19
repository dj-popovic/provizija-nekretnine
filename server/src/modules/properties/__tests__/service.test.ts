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
  buildSpecs,
  buildFeatureList,
  FEATURE_PRIORITY,
} from "../service.js";
import { FEATURE_KEYS } from "../../xml-sync/normalizer.js";
import type { PropertyListingQuery } from "../query.js";
import type { Property } from "../../shared/models.js";

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

  it("excludes land without a building surface from the m² area filter", () => {
    const plot = makeProperty({ propertyTypeKey: "plot", surface: null, landSurface: 21.06 });
    expect(matchesFilters(plot, makeQuery())).toBe(true);
    expect(matchesFilters(plot, makeQuery({ areaMax: 100 }))).toBe(false);
    expect(matchesFilters(plot, makeQuery({ areaMin: 10 }))).toBe(false);
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
    expect(item.landArea).toBeNull();
    expect(item.rooms).toBe(3);
    expect(item.images.length).toBe(2);
    expect(item.images[0].alt).toBe("Trosoban stan na Vračaru");
  });

  it("exposes plots in ares (landArea), never as m² (area)", () => {
    const item = toListItem(
      makeProperty({ propertyTypeKey: "plot", surface: null, landSurface: 21.06 }),
    );
    expect(item.area).toBeNull();
    expect(item.landArea).toBe(21.06);
  });
});

// ---------------------------------------------------------------------------
// Specification panel
// ---------------------------------------------------------------------------

describe("buildSpecs", () => {
  it("apartment: floor + total floors, no land area", () => {
    const specs = buildSpecs(makeProperty({ floor: "ground", landSurface: 5 }));
    expect(specs).toEqual({
      propertyType: "apartment",
      area: 75,
      landArea: null,
      location: "Beograd, Vračar",
      rooms: 3,
      bathrooms: 1,
      floor: "ground",
      totalFloors: 5,
      furnished: "furnished",
      heating: ["central"],
      registration: "registered",
      constructionYear: 2005,
    });
  });

  it("house: area in m² + land area in ares, no floor rows", () => {
    const specs = buildSpecs(
      makeProperty({ propertyTypeKey: "house", surface: 322, landSurface: 60.21, floor: "1", totalFloors: 1 }),
    );
    expect(specs.area).toBe(322);
    expect(specs.landArea).toBe(60.21);
    expect(specs.floor).toBeNull();
    expect(specs.totalFloors).toBeNull();
  });

  it("plot: only type, land area, location and registration", () => {
    const specs = buildSpecs(
      makeProperty({
        propertyTypeKey: "plot",
        surface: null,
        landSurface: 21.06,
        heatingKeys: ["gas"], // real feed quirk: a plot with heating
        registrationStatus: null,
      }),
    );
    expect(specs).toEqual({
      propertyType: "plot",
      area: null,
      landArea: 21.06,
      location: "Beograd, Vračar",
      rooms: null,
      bathrooms: null,
      floor: null,
      totalFloors: null,
      furnished: null,
      heating: [],
      registration: "not_registered",
      constructionYear: null,
    });
  });

  it("treats missing registration as not registered", () => {
    expect(buildSpecs(makeProperty({ registrationStatus: null })).registration).toBe("not_registered");
    expect(buildSpecs(makeProperty({ registrationStatus: "in_progress" })).registration).toBe("in_progress");
  });
});

// ---------------------------------------------------------------------------
// Feature chips (kvadratići)
// ---------------------------------------------------------------------------

describe("buildFeatureList", () => {
  it("has a priority slot for every key the normalizer can produce", () => {
    for (const key of FEATURE_KEYS) {
      expect(FEATURE_PRIORITY).toContain(key);
    }
  });

  it("orders features most interesting first, regardless of XML order", () => {
    const p = makeProperty({
      featureKeys: ["storage", "elevator", "terrace", "penthouse", "move_in_ready", "luxury"],
    });
    expect(buildFeatureList(p)).toEqual([
      "penthouse", "luxury", "elevator", "terrace", "storage", "move_in_ready",
    ]);
  });

  it("apartment: no infrastructure or permit chips", () => {
    const p = makeProperty({
      featureKeys: ["elevator", "city_water", "city_sewage", "paved_road", "building_permit"],
    });
    expect(buildFeatureList(p)).toEqual(["elevator"]);
  });

  it("house: infrastructure chips, no elevator", () => {
    const p = makeProperty({
      propertyTypeKey: "house",
      featureKeys: ["pool", "terrace", "elevator", "paved_road", "city_water", "city_sewage"],
    });
    expect(buildFeatureList(p)).toEqual(["pool", "terrace", "paved_road", "city_water", "city_sewage"]);
  });

  it("plot: infrastructure and permit chips", () => {
    const p = makeProperty({
      propertyTypeKey: "plot",
      featureKeys: ["building_permit", "paved_road", "location_permit"],
    });
    expect(buildFeatureList(p)).toEqual(["paved_road", "building_permit", "location_permit"]);
  });

  it("caps at 12 chips", () => {
    const p = makeProperty({ featureKeys: [...FEATURE_PRIORITY] });
    expect(buildFeatureList(p).length).toBe(12);
  });

  it("is included in the detail response", () => {
    replaceDataset(makeDataset([makeProperty()]));
    expect(getPropertyDetail("100")!.features).toEqual(["elevator", "terrace"]);
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
    expect(detail!.code).toBe("100100");
    expect(detail!.specs.propertyType).toBe("apartment");
  });

  it("does not expose the street address", () => {
    const detail = getPropertyDetail("100")!;
    expect(detail).not.toHaveProperty("address");
    expect(JSON.stringify(detail)).not.toContain("Krunska");
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

  it("includes related properties (same transactionType, excludes self)", () => {
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
    // 102 is the only rent property
    expect(detail!.relatedProperties.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Related properties ("Slične nekretnine")
// ---------------------------------------------------------------------------

describe("related properties", () => {
  const apt = (id: string, price: number, extra: Partial<Property> = {}) =>
    makeProperty({ id, price, slug: `stan-${id}`, ...extra });
  const house = (id: string, price: number) =>
    makeProperty({ id, price, slug: `kuca-${id}`, propertyTypeKey: "house" });

  function relatedIds(id: string): string[] {
    return getPropertyDetail(id)!.relatedProperties.map((r) => r.id);
  }

  it("picks the 6 closest in price and shows the most similar first", () => {
    replaceDataset(makeDataset([
      apt("1", 189000), // viewed
      apt("2", 190000), apt("3", 185000), apt("4", 192000), apt("5", 170000),
      apt("6", 208000), apt("7", 99000), apt("8", 590000), apt("9", 172000),
    ]));
    // 190k (0.5%), 192k (1.6%), 185k (2.1%), 172k (9%), then 208k / 170k
    // (both 10.05% — newer listing first); 99k and 590k left out
    expect(relatedIds("1")).toEqual(["2", "4", "3", "9", "6", "5"]);
  });

  it("is never city-restricted", () => {
    replaceDataset(makeDataset([
      apt("1", 100000, { city: "Novi Sad" }),
      apt("2", 101000, { city: "Beočin" }),
    ]));
    expect(relatedIds("1")).toEqual(["2"]);
  });

  it("prefers the same type, then fills with other types by price", () => {
    replaceDataset(makeDataset([
      apt("1", 150000),
      apt("2", 400000), // same type but far in price — still before other types
      house("3", 151000), house("4", 149000), house("5", 300000),
      house("6", 152000), house("7", 148000), house("8", 900000),
    ]));
    const ids = relatedIds("1");
    expect(ids).toHaveLength(6);
    expect(ids).toContain("2");
    expect(ids).not.toContain("8"); // farthest house is the one left out
  });

  it("never mixes sale and rent", () => {
    replaceDataset(makeDataset([
      apt("1", 150000),
      apt("2", 600, { transactionType: "rent" }),
      apt("3", 160000),
    ]));
    expect(relatedIds("1")).toEqual(["3"]);
  });

  it("does not suggest 'cena na upit' properties", () => {
    replaceDataset(makeDataset([
      apt("1", 150000),
      apt("2", 1, { priceOnRequest: true }),
      apt("3", 160000),
    ]));
    expect(relatedIds("1")).toEqual(["3"]);
  });

  it("gives a 'cena na upit' property same-type suggestions only", () => {
    replaceDataset(makeDataset([
      makeProperty({ id: "1", slug: "kuca-1", propertyTypeKey: "house", price: 1, priceOnRequest: true }),
      house("2", 300000), house("3", 200000),
      apt("4", 1000), apt("5", 2000),
    ]));
    expect(relatedIds("1")).toEqual(["3", "2"]);
  });
});

// ---------------------------------------------------------------------------
// "Cena na upit" (price on request)
// ---------------------------------------------------------------------------

describe("price on request", () => {
  const onRequest = makeProperty({ id: "9", price: 1, priceOnRequest: true });

  it("exposes price as null in list and detail", () => {
    replaceDataset(makeDataset([onRequest]));
    expect(toListItem(onRequest).price).toBeNull();
    expect(getPropertyDetail("9")!.price).toBeNull();
  });

  it("is excluded by any price filter", () => {
    expect(matchesFilters(onRequest, makeQuery())).toBe(true);
    expect(matchesFilters(onRequest, makeQuery({ priceMax: 100000 }))).toBe(false);
    expect(matchesFilters(onRequest, makeQuery({ priceMin: 0 }))).toBe(false);
  });

  it("goes last in both price sorts", () => {
    const cheap = makeProperty({ id: "1", price: 50000 });
    const pricey = makeProperty({ id: "2", price: 500000 });
    expect(sortProperties([onRequest, pricey, cheap], "priceAsc").map((p) => p.id)).toEqual(["1", "2", "9"]);
    expect(sortProperties([onRequest, cheap, pricey], "priceDesc").map((p) => p.id)).toEqual(["2", "1", "9"]);
  });
});
