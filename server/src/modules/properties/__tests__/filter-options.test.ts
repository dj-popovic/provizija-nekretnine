import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { replaceDataset } from "../../shared/cache.js";
import { makeProperty, makeDataset } from "./fixtures.js";
import { buildFilterOptions } from "../filter-options.js";
import { parseListingQuery } from "../query.js";
import type { PropertyListingQuery } from "../query.js";

// A small Vojvodina-like dataset: Novi Sad is the biggest city, "Okolina"
// is a district in two different cities, Bač has no districts at all.
const dataset = [
  makeProperty({ id: "1", city: "Novi Sad", hood: "Telep" }),
  makeProperty({ id: "2", city: "Novi Sad", hood: "Telep", propertyTypeKey: "house" }),
  makeProperty({ id: "3", city: "Novi Sad", hood: "Čenej", propertyTypeKey: "house" }),
  makeProperty({ id: "4", city: "Novi Sad", hood: "Adamovićevo Naselje" }),
  makeProperty({ id: "5", city: "Novi Sad", hood: "telep" }), // same district, other spelling
  makeProperty({ id: "6", city: "Beočin", hood: "Okolina", propertyTypeKey: "house" }),
  makeProperty({ id: "7", city: "Bačka palanka", hood: "Okolina", propertyTypeKey: "house" }),
  makeProperty({ id: "8", city: "Bač", hood: null, propertyTypeKey: "plot" }),
  makeProperty({ id: "9", city: "Novi Sad", hood: "Grbavica", transactionType: "rent" }),
];

// The default (empty) listing query; tests spread their own filters over it
const parsed = parseListingQuery({});
if (!parsed.ok) throw new Error("default query must parse");
const all: PropertyListingQuery = parsed.query;

describe("buildFilterOptions", () => {
  it("lists every city with its districts and counts", () => {
    const { cities } = buildFilterOptions(dataset, { ...all, transactionType: "sale" });
    expect(cities.map((c) => [c.name, c.count])).toEqual([
      ["Novi Sad", 5],
      ["Bač", 1],
      ["Bačka palanka", 1],
      ["Beočin", 1],
    ]);
    expect(cities[0].hoods).toEqual([
      { name: "Adamovićevo Naselje", count: 1 },
      { name: "Čenej", count: 1 },
      { name: "Telep", count: 3 },
    ]);
  });

  it("keeps same-named districts apart per city and gives Bač no districts", () => {
    const { cities } = buildFilterOptions(dataset, { ...all, transactionType: "sale" });
    const byName = new Map(cities.map((c) => [c.name, c]));
    expect(byName.get("Beočin")!.hoods).toEqual([{ name: "Okolina", count: 1 }]);
    expect(byName.get("Bačka palanka")!.hoods).toEqual([{ name: "Okolina", count: 1 }]);
    expect(byName.get("Bač")!.hoods).toEqual([]);
  });

  it("keeps sale and rent apart", () => {
    const { cities } = buildFilterOptions(dataset, { ...all, transactionType: "rent" });
    expect(cities).toEqual([{ name: "Novi Sad", count: 1, hoods: [{ name: "Grbavica", count: 1 }] }]);
  });

  it("counts only the selected property types but still lists every place", () => {
    const { cities } = buildFilterOptions(dataset, { ...all, transactionType: "sale", propertyTypes: ["house"] });
    expect(cities.map((c) => [c.name, c.count])).toEqual([
      ["Novi Sad", 2],
      ["Bač", 0],
      ["Bačka palanka", 1],
      ["Beočin", 1],
    ]);
    expect(cities[0].hoods).toEqual([
      { name: "Adamovićevo Naselje", count: 0 },
      { name: "Čenej", count: 1 },
      { name: "Telep", count: 1 },
    ]);
  });

  it("lists the property types present for the transaction type, most common first", () => {
    const { propertyTypes } = buildFilterOptions(dataset, { ...all, transactionType: "sale", propertyTypes: ["plot"] });
    expect(propertyTypes).toEqual([
      { key: "house", count: 4 },
      { key: "apartment", count: 3 },
      { key: "plot", count: 1 },
    ]);
  });

  it("counts the more-filters values for the tab and type", () => {
    const flats = [
      makeProperty({ id: "1", featureKeys: ["elevator", "new_build"], equipmentKeys: ["air_conditioning"], heatingKeys: ["central"], furnishedKey: "empty", conditionKey: null, registrationStatus: "registered" }),
      makeProperty({ id: "2", featureKeys: ["elevator"], equipmentKeys: [], heatingKeys: ["gas", "gas"], furnishedKey: null, isOldBuild: true, conditionKey: "original", registrationStatus: null }),
      makeProperty({ id: "3", propertyTypeKey: "house", featureKeys: ["elevator", "paved_road"], equipmentKeys: [], heatingKeys: [], furnishedKey: null }),
    ];
    const { counts } = buildFilterOptions(flats, { ...all, transactionType: "sale", propertyTypes: ["apartment"] });
    expect(counts.feature).toEqual({ elevator: 2, new_build: 1 });
    expect(counts.equipment).toEqual({ air_conditioning: 1 });
    expect(counts.heating).toEqual({ central: 1, gas: 1 });
    expect(counts.furnished).toEqual({ empty: 1 });
    expect(counts.construction).toEqual({ new: 1, old: 1 });
    expect(counts.condition).toEqual({ original: 1 });
    expect(counts.registration).toEqual({ registered: 1 });

    // A house's lift isn't shown on the site, so it isn't counted either
    const houses = buildFilterOptions(flats, { ...all, transactionType: "sale", propertyTypes: ["house"] });
    expect(houses.counts.feature).toEqual({ paved_road: 1 });
  });

  it("the Novogradnja tab (newBuild) only looks at new builds", () => {
    const list = [
      makeProperty({ id: "1", city: "Novi Sad", hood: "Telep", featureKeys: ["new_build"] }),
      makeProperty({ id: "2", city: "Beočin", hood: "Okolina", featureKeys: ["under_construction"] }),
      makeProperty({ id: "3", city: "Bač", hood: null, featureKeys: [] }),
    ];
    const { cities } = buildFilterOptions(list, { ...all, transactionType: "sale", newBuild: true });
    expect(cities.map((c) => c.name)).toEqual(["Beočin", "Novi Sad"]);
  });

  it("returns empty lists for an empty dataset", () => {
    expect(buildFilterOptions([], all)).toMatchObject({ propertyTypes: [], cities: [] });
  });
});

// ---------------------------------------------------------------------------
// Counts follow the whole panel (e.g. Stan + Novi Sad + Telep)
// ---------------------------------------------------------------------------

describe("buildFilterOptions — counts for a combination", () => {
  const panel = [
    makeProperty({ id: "1", city: "Novi Sad", hood: "Telep", conditionKey: "renovated", heatingKeys: ["central"], featureKeys: ["elevator", "terrace"], price: 100000 }),
    makeProperty({ id: "2", city: "Novi Sad", hood: "Telep", conditionKey: "original", heatingKeys: ["gas"], featureKeys: ["terrace"], price: 200000 }),
    makeProperty({ id: "3", city: "Novi Sad", hood: "Grbavica", conditionKey: "needs_renovation", heatingKeys: ["central"], featureKeys: ["pool"] }),
    makeProperty({ id: "4", city: "Novi Sad", hood: "Telep", propertyTypeKey: "house", conditionKey: "needs_renovation", heatingKeys: [], featureKeys: [] }),
    makeProperty({ id: "5", city: "Beočin", hood: "Okolina", propertyTypeKey: "plot", featureKeys: [] }),
  ];
  const sale = { ...all, transactionType: "sale" };

  it("a value no listing of the combination has gets no count (Stan + Telep → no 'Za adaptaciju')", () => {
    const { counts } = buildFilterOptions(panel, { ...sale, propertyTypes: ["apartment"], city: "Novi Sad", hoods: ["Telep"] });
    expect(counts.condition).toEqual({ renovated: 1, original: 1 });
    expect(counts.feature).toEqual({ terrace: 2, elevator: 1 });
  });

  it("an 'any of' group is counted without its own choice (Centralno doesn't dim Gas)", () => {
    const { counts } = buildFilterOptions(panel, { ...sale, city: "Novi Sad", hoods: ["Telep"], heating: ["central"] });
    expect(counts.heating).toEqual({ central: 1, gas: 1 });
    // …while the other groups do follow it
    expect(counts.condition).toEqual({ renovated: 1 });
  });

  it("'all of' groups follow their own choices (after Lift, Bazen has 0)", () => {
    const { counts } = buildFilterOptions(panel, { ...sale, features: ["elevator"] });
    expect(counts.feature).toEqual({ elevator: 1, terrace: 1 });
  });

  it("other cities and districts stay pickable: location is counted without the location", () => {
    const { cities } = buildFilterOptions(panel, { ...sale, propertyTypes: ["apartment"], city: "Novi Sad", hoods: ["Telep"] });
    expect(cities.map((c) => [c.name, c.count])).toEqual([["Novi Sad", 3], ["Beočin", 0]]);
    expect(cities[0].hoods).toEqual([{ name: "Grbavica", count: 1 }, { name: "Telep", count: 2 }]);
  });

  it("types are counted with the location but without the type (Telep has no Plac)", () => {
    const { propertyTypes } = buildFilterOptions(panel, { ...sale, propertyTypes: ["apartment"], city: "Novi Sad", hoods: ["Telep"] });
    expect(propertyTypes).toEqual([
      { key: "apartment", count: 2 },
      { key: "house", count: 1 },
      { key: "plot", count: 0 },
    ]);
  });

  it("types ignore what a type switch would clear (Kuća + Terasa doesn't dim Plac)", () => {
    const { propertyTypes } = buildFilterOptions(panel, {
      ...sale, propertyTypes: ["house"], features: ["terrace"], roomsMin: 3, landAreaMin: 5,
    });
    expect(propertyTypes.find((t) => t.key === "plot")).toEqual({ key: "plot", count: 1 });
  });

  it("the price range counts too", () => {
    const { counts } = buildFilterOptions(panel, { ...sale, priceMax: 120000 }); // only #1 (others cost 150 000+)
    expect(counts.condition).toEqual({ renovated: 1 });
  });
});

// ---------------------------------------------------------------------------
// Over HTTP — checks that repeated query params really arrive as arrays
// ---------------------------------------------------------------------------

describe("HTTP: filter-options and repeated listing params", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.XML_FEED_URL ??= "https://example.com/feed.xml";
    const { buildApp } = await import("../../../app/app.js");
    app = buildApp();
    await app.ready();
    replaceDataset(makeDataset(dataset));
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/filter-options returns { data }", async () => {
    const res = await app.inject({ method: "GET", url: "/api/filter-options?transactionType=sale" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.cities[0].name).toBe("Novi Sad");
    expect(body.data.propertyTypes.length).toBeGreaterThan(0);
  });

  it("GET /api/filter-options rejects a repeated transactionType with 400", async () => {
    const res = await app.inject({ method: "GET", url: "/api/filter-options?transactionType=sale&transactionType=rent" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/properties matches any of several districts", async () => {
    const url = "/api/properties?transactionType=sale&city=Novi%20Sad&hood=Telep&hood=%C4%8Cenej";
    const res = await app.inject({ method: "GET", url });
    expect(res.statusCode).toBe(200);
    expect(res.json().items.map((i: { id: string }) => i.id).sort()).toEqual(["1", "2", "3", "5"]);
  });

  it("GET /api/properties rejects hood without city with 400", async () => {
    const res = await app.inject({ method: "GET", url: "/api/properties?hood=Telep" });
    expect(res.statusCode).toBe(400);
  });
});
