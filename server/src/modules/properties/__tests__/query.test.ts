import { describe, it, expect } from "vitest";
import { parseListingQuery } from "../query.js";

describe("parseListingQuery", () => {
  // -----------------------------------------------------------------------
  // Defaults
  // -----------------------------------------------------------------------

  it("returns defaults when no params are provided", () => {
    const result = parseListingQuery({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.query.sort).toBe("newest");
    expect(result.query.page).toBe(1);
    expect(result.query.pageSize).toBe(12);
    expect(result.query.transactionType).toBeUndefined();
    expect(result.query.propertyTypes).toEqual([]);
    expect(result.query.city).toBeUndefined();
    expect(result.query.hoods).toEqual([]);
    expect(result.query.roomsMin).toBeUndefined();
    expect(result.query.roomsMax).toBeUndefined();
    expect(result.query.priceMin).toBeUndefined();
    expect(result.query.priceMax).toBeUndefined();
    expect(result.query.areaMin).toBeUndefined();
    expect(result.query.areaMax).toBeUndefined();
    expect(result.query.landAreaMin).toBeUndefined();
    expect(result.query.landAreaMax).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Valid filter combinations
  // -----------------------------------------------------------------------

  it("parses all filters correctly", () => {
    const result = parseListingQuery({
      transactionType: "sale",
      propertyType: "apartment",
      city: "Novi Sad",
      hood: "Telep",
      roomsMin: "2",
      roomsMax: "3.5",
      priceMin: "50000",
      priceMax: "200000",
      areaMin: "40",
      areaMax: "120",
      landAreaMin: "3",
      landAreaMax: "10",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.query.transactionType).toBe("sale");
    expect(result.query.propertyTypes).toEqual(["apartment"]);
    expect(result.query.city).toBe("Novi Sad");
    expect(result.query.hoods).toEqual(["Telep"]);
    expect(result.query.roomsMin).toBe(2);
    expect(result.query.roomsMax).toBe(3.5);
    expect(result.query.priceMin).toBe(50000);
    expect(result.query.priceMax).toBe(200000);
    expect(result.query.areaMin).toBe(40);
    expect(result.query.areaMax).toBe(120);
    expect(result.query.landAreaMin).toBe(3);
    expect(result.query.landAreaMax).toBe(10);
  });

  // -----------------------------------------------------------------------
  // Repeated params and location
  // -----------------------------------------------------------------------

  it("accepts several districts and property types (repeated params)", () => {
    const result = parseListingQuery({
      city: "Novi Sad",
      hood: ["Telep", " Grbavica ", "", "Telep"],
      propertyType: ["commercial", "office"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.query.hoods).toEqual(["Telep", "Grbavica"]);
    expect(result.query.propertyTypes).toEqual(["commercial", "office"]);
  });

  it("rejects hood without city", () => {
    const result = parseListingQuery({ hood: "Okolina" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "hood")).toBe(true);
    }
  });

  it("rejects a repeated single-value param", () => {
    const result = parseListingQuery({ city: ["Novi Sad", "Beočin"], priceMin: ["1", "2"] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field)).toEqual(["city", "priceMin"]);
    }
  });

  it("rejects more than 50 values of one param", () => {
    const hood = Array.from({ length: 51 }, (_, i) => `Kvart ${i}`);
    const result = parseListingQuery({ city: "Novi Sad", hood });
    expect(result.ok).toBe(false);
  });

  // -----------------------------------------------------------------------
  // "Više filtera" (#16)
  // -----------------------------------------------------------------------

  it("parses the more-filters params", () => {
    const result = parseListingQuery({
      newBuild: "true",
      bathroomsMin: "2",
      floorMin: "0",
      floorMax: "4",
      notGroundFloor: "1",
      notTopFloor: "true",
      yearMin: "2000",
      yearMax: "2026",
      heating: ["central", "gas"],
      furnished: "furnished",
      construction: ["new", "old"],
      condition: "renovated",
      registered: "true",
      feature: ["elevator", "terrace"],
      equipment: "air_conditioning",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.query).toMatchObject({
      newBuild: true,
      bathroomsMin: 2,
      floorMin: 0,
      floorMax: 4,
      notGroundFloor: true,
      notTopFloor: true,
      yearMin: 2000,
      yearMax: 2026,
      heating: ["central", "gas"],
      furnished: ["furnished"],
      construction: ["new", "old"],
      condition: ["renovated"],
      registered: true,
      features: ["elevator", "terrace"],
      equipment: ["air_conditioning"],
    });
  });

  it("defaults the switches to off and the lists to empty", () => {
    const result = parseListingQuery({ registered: "false" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.query).toMatchObject({
      newBuild: false, notGroundFloor: false, notTopFloor: false, registered: false,
      heating: [], furnished: [], construction: [], condition: [], features: [], equipment: [],
    });
  });

  it("rejects unknown keys and bad switches", () => {
    const result = parseListingQuery({
      feature: ["elevator", "jacuzzi"],
      equipment: "sauna",
      construction: "prefab",
      condition: "ruin",
      registered: "yes",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field)).toEqual(["construction", "condition", "registered", "feature", "equipment"]);
    }
  });

  it("rejects floorMin > floorMax and yearMin > yearMax", () => {
    const result = parseListingQuery({ floorMin: "5", floorMax: "2", yearMin: "2020", yearMax: "1990" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field)).toEqual(["floorMin", "yearMin"]);
    }
  });

  it("no longer reads the removed location / rooms params", () => {
    const result = parseListingQuery({ location: "Beograd", rooms: "3" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.query.city).toBeUndefined();
    expect(result.query.roomsMin).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Sort
  // -----------------------------------------------------------------------

  it("accepts valid sort values", () => {
    for (const sort of ["newest", "priceAsc", "priceDesc"]) {
      const result = parseListingQuery({ sort });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.query.sort).toBe(sort);
    }
  });

  it("rejects invalid sort value", () => {
    const result = parseListingQuery({ sort: "random" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "sort")).toBe(true);
    }
  });

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------

  it("parses page and pageSize", () => {
    const result = parseListingQuery({ page: "3", pageSize: "24" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.query.page).toBe(3);
    expect(result.query.pageSize).toBe(24);
  });

  it("rejects page < 1", () => {
    const result = parseListingQuery({ page: "0" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "page")).toBe(true);
    }
  });

  it("rejects pageSize > 100", () => {
    const result = parseListingQuery({ pageSize: "200" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "pageSize")).toBe(true);
    }
  });

  it("rejects non-numeric pageSize", () => {
    const result = parseListingQuery({ pageSize: "abc" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "pageSize")).toBe(true);
    }
  });

  // -----------------------------------------------------------------------
  // Numeric validation
  // -----------------------------------------------------------------------

  it("rejects non-numeric or zero rooms", () => {
    const result = parseListingQuery({ roomsMin: "abc", roomsMax: "0" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field)).toEqual(["roomsMin", "roomsMax"]);
    }
  });

  it("accepts a studio (0.5 rooms)", () => {
    const result = parseListingQuery({ roomsMin: "0.5", roomsMax: "0.5" });
    expect(result.ok).toBe(true);
  });

  it("rejects negative priceMin", () => {
    const result = parseListingQuery({ priceMin: "-100" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "priceMin")).toBe(true);
    }
  });

  // -----------------------------------------------------------------------
  // Range validation
  // -----------------------------------------------------------------------

  it("rejects priceMin > priceMax", () => {
    const result = parseListingQuery({ priceMin: "200000", priceMax: "100000" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "priceMin")).toBe(true);
    }
  });

  it("rejects areaMin > areaMax", () => {
    const result = parseListingQuery({ areaMin: "120", areaMax: "40" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "areaMin")).toBe(true);
    }
  });

  it("rejects roomsMin > roomsMax and landAreaMin > landAreaMax", () => {
    const result = parseListingQuery({ roomsMin: "4", roomsMax: "2", landAreaMin: "10", landAreaMax: "5" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field)).toEqual(["roomsMin", "landAreaMin"]);
    }
  });

  it("accepts priceMin == priceMax", () => {
    const result = parseListingQuery({ priceMin: "100000", priceMax: "100000" });
    expect(result.ok).toBe(true);
  });
});
