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
    expect(result.query.propertyType).toBeUndefined();
    expect(result.query.location).toBeUndefined();
    expect(result.query.rooms).toBeUndefined();
    expect(result.query.priceMin).toBeUndefined();
    expect(result.query.priceMax).toBeUndefined();
    expect(result.query.areaMin).toBeUndefined();
    expect(result.query.areaMax).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Valid filter combinations
  // -----------------------------------------------------------------------

  it("parses all filters correctly", () => {
    const result = parseListingQuery({
      transactionType: "sale",
      propertyType: "apartment",
      location: "Beograd",
      rooms: "3",
      priceMin: "50000",
      priceMax: "200000",
      areaMin: "40",
      areaMax: "120",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.query.transactionType).toBe("sale");
    expect(result.query.propertyType).toBe("apartment");
    expect(result.query.location).toBe("Beograd");
    expect(result.query.rooms).toBe(3);
    expect(result.query.priceMin).toBe(50000);
    expect(result.query.priceMax).toBe(200000);
    expect(result.query.areaMin).toBe(40);
    expect(result.query.areaMax).toBe(120);
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

  it("rejects non-numeric rooms", () => {
    const result = parseListingQuery({ rooms: "abc" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "rooms")).toBe(true);
    }
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

  it("accepts priceMin == priceMax", () => {
    const result = parseListingQuery({ priceMin: "100000", priceMax: "100000" });
    expect(result.ok).toBe(true);
  });
});
