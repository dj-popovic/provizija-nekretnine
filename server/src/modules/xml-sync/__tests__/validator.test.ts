import { describe, it, expect } from "vitest";
import { validateAndNormalize } from "../validator.js";
import { makeRawListing } from "./fixtures.js";

describe("validateAndNormalize", () => {
  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------

  it("accepts valid listings", () => {
    const result = validateAndNormalize([
      makeRawListing({ property_id: "1" }),
      makeRawListing({ property_id: "2" }),
    ]);

    expect(result.properties).toHaveLength(2);
    expect(result.rejectedCount).toBe(0);
    expect(result.properties[0].id).toBe("1");
    expect(result.properties[1].id).toBe("2");
  });

  it("returns empty result for empty input", () => {
    const result = validateAndNormalize([]);
    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Deleted record exclusion
  // -----------------------------------------------------------------------

  it("excludes records with deleted=1", () => {
    const result = validateAndNormalize([
      makeRawListing({ property_id: "1", deleted: "1" }),
      makeRawListing({ property_id: "2", deleted: "0" }),
    ]);

    expect(result.properties).toHaveLength(1);
    expect(result.properties[0].id).toBe("2");
    expect(result.rejectedCount).toBe(1);
  });

  it("excludes all deleted records", () => {
    const result = validateAndNormalize([
      makeRawListing({ deleted: "1" }),
      makeRawListing({ deleted: "1" }),
    ]);

    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(2);
  });

  // -----------------------------------------------------------------------
  // Required field rejection
  // -----------------------------------------------------------------------

  it("rejects records missing property_id", () => {
    const result = validateAndNormalize([
      makeRawListing({ property_id: undefined }),
    ]);
    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  it("rejects records with invalid purpose_id", () => {
    const result = validateAndNormalize([
      makeRawListing({ purpose_id: "99" }),
    ]);
    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  it("rejects records missing property_name", () => {
    const result = validateAndNormalize([
      makeRawListing({ property_name: undefined }),
    ]);
    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  it("rejects records missing city", () => {
    const result = validateAndNormalize([
      makeRawListing({ property_city: undefined }),
    ]);
    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  it("rejects records missing price", () => {
    const result = validateAndNormalize([
      makeRawListing({ property_price: undefined }),
    ]);
    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  it("rejects records with zero price", () => {
    const result = validateAndNormalize([
      makeRawListing({ property_price: "0" }),
    ]);
    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  it("rejects records missing surface (non-land type)", () => {
    const result = validateAndNormalize([
      makeRawListing({ property_surface: undefined }),
    ]);
    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  it("rejects records missing id_agent", () => {
    const result = validateAndNormalize([
      makeRawListing({ id_agent: undefined }),
    ]);
    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Mixed valid/invalid batch
  // -----------------------------------------------------------------------

  it("processes a mixed batch: accepts valid, rejects invalid, counts correctly", () => {
    const result = validateAndNormalize([
      makeRawListing({ property_id: "1" }),                    // valid
      makeRawListing({ property_id: "2", deleted: "1" }),      // deleted
      makeRawListing({ property_id: "3", purpose_id: "99" }),  // bad purpose
      makeRawListing({ property_id: "4" }),                    // valid
      makeRawListing({ property_id: "5", id_agent: "" }),      // no agent
    ]);

    expect(result.properties).toHaveLength(2);
    expect(result.rejectedCount).toBe(3);
    expect(result.properties.map((p) => p.id)).toEqual(["1", "4"]);
  });

  // -----------------------------------------------------------------------
  // Land type surface fallback is handled correctly through the normalizer
  // -----------------------------------------------------------------------

  it("accepts land type with surface=0 but valid land_surface", () => {
    const result = validateAndNormalize([
      makeRawListing({
        property_type: "Plac",
        property_surface: "0",
        property_land_surface: "800",
      }),
    ]);

    expect(result.properties).toHaveLength(1);
    expect(result.properties[0].surface).toBe(800);
  });

  it("rejects land type with surface=0 and no land_surface", () => {
    const result = validateAndNormalize([
      makeRawListing({
        property_type: "Plac",
        property_surface: "0",
        property_land_surface: undefined,
      }),
    ]);

    expect(result.properties).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Bad records don't break valid ones
  // -----------------------------------------------------------------------

  it("a single corrupt record does not fail the whole batch", () => {
    const raws = [
      makeRawListing({ property_id: "good-1" }),
      // This one has multiple problems
      makeRawListing({
        property_id: undefined,
        purpose_id: undefined,
        property_name: undefined,
      }),
      makeRawListing({ property_id: "good-2" }),
    ];

    const result = validateAndNormalize(raws);
    expect(result.properties).toHaveLength(2);
    expect(result.rejectedCount).toBe(1);
  });
});
