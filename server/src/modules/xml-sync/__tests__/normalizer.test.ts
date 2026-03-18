import { describe, it, expect } from "vitest";
import { normalizeProperty } from "../normalizer.js";
import { makeRawListing } from "./fixtures.js";

describe("normalizeProperty", () => {
  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------

  it("normalizes a fully populated listing", () => {
    const raw = makeRawListing();
    const result = normalizeProperty(raw);

    expect(result).not.toBeNull();
    const p = result!;

    // Identity
    expect(p.id).toBe("100");
    expect(p.slug).toBe("trosoban-stan-na-vracaru");
    expect(p.agentId).toBe("42");

    // Classification
    expect(p.transactionType).toBe("sale");
    expect(p.propertyTypeKey).toBe("apartment");
    expect(p.propertyTypeLabel).toBe("Stan");

    // Core display
    expect(p.title).toBe("Trosoban stan na Vračaru");
    expect(p.description).toBe("Lep stan u centru grada.");

    // Location
    expect(p.city).toBe("Beograd");
    expect(p.hood).toBe("Vračar");
    expect(p.address).toBe("Krunska 12");
    expect(p.locationLabel).toBe("Beograd, Vračar");

    // Numeric
    expect(p.price).toBe(150000);
    expect(p.surface).toBe(75);
    expect(p.roomStructure).toBe(3);
    expect(p.bathrooms).toBe(1);
    expect(p.totalFloors).toBe(5);
    expect(p.constructionYear).toBe(2005);

    // Furnishing
    expect(p.furnishedKey).toBe("furnished");
    expect(p.furnishedLabel).toBe("Namešten");

    // Features
    expect(p.heating).toEqual(["Centralno"]);
    expect(p.equipment).toEqual(["Klima", "Veš mašina"]);

    // Derived booleans
    expect(p.hasTerrace).toBe(true);
    expect(p.hasElevator).toBe(true);
    expect(p.hasParking).toBe(false);
    expect(p.hasGarage).toBe(false);
    expect(p.isNewConstruction).toBe(false);

    // Registration
    expect(p.registrationStatus).toBe("registered");

    // Images
    expect(p.images).toHaveLength(2);
    expect(p.images[0]).toEqual({ url: "https://example.com/img1.jpg", order: 0 });
    expect(p.images[1]).toEqual({ url: "https://example.com/img2.jpg", order: 1 });
    expect(p.primaryImage).toEqual({ url: "https://example.com/img1.jpg", order: 0 });

    // Source metadata
    expect(p.sourceDeletedFlag).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Transaction type mapping
  // -----------------------------------------------------------------------

  it("maps purpose_id 1 → rent", () => {
    const p = normalizeProperty(makeRawListing({ purpose_id: "1" }));
    expect(p!.transactionType).toBe("rent");
  });

  it("maps purpose_id 2 → sale", () => {
    const p = normalizeProperty(makeRawListing({ purpose_id: "2" }));
    expect(p!.transactionType).toBe("sale");
  });

  it("rejects unknown purpose_id", () => {
    expect(normalizeProperty(makeRawListing({ purpose_id: "3" }))).toBeNull();
    expect(normalizeProperty(makeRawListing({ purpose_id: "" }))).toBeNull();
    expect(normalizeProperty(makeRawListing({ purpose_id: undefined }))).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Property type mapping
  // -----------------------------------------------------------------------

  it("maps known Serbian property types", () => {
    const cases: [unknown, string][] = [
      ["Stan", "apartment"],
      ["Kuća", "house"],
      ["Plac", "land"],
      ["Poljoprivredno zemljište", "land"],
      ["Garaža", "garage"],
      ["Poslovni prostor", "commercial"],
      ["Kancelarija", "office"],
      ["Vikendica", "cottage"],
    ];
    for (const [xmlType, expectedKey] of cases) {
      const raw = makeRawListing({
        property_type: xmlType,
        // land types need land_surface as fallback when surface is 0
        ...(expectedKey === "land"
          ? { property_surface: "0", property_land_surface: "500" }
          : {}),
      });
      const p = normalizeProperty(raw);
      expect(p).not.toBeNull();
      expect(p!.propertyTypeKey).toBe(expectedKey);
    }
  });

  it("maps unknown property type to 'other'", () => {
    const p = normalizeProperty(makeRawListing({ property_type: "Šupa" }));
    expect(p!.propertyTypeKey).toBe("other");
    expect(p!.propertyTypeLabel).toBe("Šupa");
  });

  // -----------------------------------------------------------------------
  // Surface & land fallback
  // -----------------------------------------------------------------------

  it("uses property_surface when positive", () => {
    const p = normalizeProperty(makeRawListing({ property_surface: "100" }));
    expect(p!.surface).toBe(100);
  });

  it("falls back to land_surface for land types when surface is 0", () => {
    const p = normalizeProperty(
      makeRawListing({
        property_type: "Plac",
        property_surface: "0",
        property_land_surface: "1200",
      }),
    );
    expect(p!.surface).toBe(1200);
    expect(p!.landSurface).toBe(1200);
  });

  it("rejects non-land type with surface 0 and no fallback", () => {
    const p = normalizeProperty(
      makeRawListing({ property_surface: "0", property_land_surface: undefined }),
    );
    expect(p).toBeNull();
  });

  it("rejects land type when both surface and land_surface are missing", () => {
    const p = normalizeProperty(
      makeRawListing({
        property_type: "Plac",
        property_surface: "0",
        property_land_surface: undefined,
      }),
    );
    expect(p).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Bathrooms parsing
  // -----------------------------------------------------------------------

  it("parses '2 kupatila' → 2", () => {
    const p = normalizeProperty(makeRawListing({ bath: "2 kupatila" }));
    expect(p!.bathrooms).toBe(2);
  });

  it("parses bare number from parser", () => {
    const p = normalizeProperty(makeRawListing({ bath: 3 }));
    expect(p!.bathrooms).toBe(3);
  });

  it("returns null for empty/missing bath", () => {
    expect(normalizeProperty(makeRawListing({ bath: "" }))!.bathrooms).toBeNull();
    expect(normalizeProperty(makeRawListing({ bath: undefined }))!.bathrooms).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Furnishing
  // -----------------------------------------------------------------------

  it("maps known furnishing values", () => {
    const cases: [unknown, string][] = [
      ["Namešten", "furnished"],
      ["Polunamešten", "semi_furnished"],
      ["Nenamešten", "empty"],
      ["Prazan", "empty"],
    ];
    for (const [xmlValue, expectedKey] of cases) {
      const p = normalizeProperty(makeRawListing({ furnished: xmlValue }));
      expect(p!.furnishedKey).toBe(expectedKey);
    }
  });

  it("returns null furnishing for missing value", () => {
    const p = normalizeProperty(makeRawListing({ furnished: undefined }));
    expect(p!.furnishedKey).toBeNull();
    expect(p!.furnishedLabel).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Derived booleans from otherFeatures
  // -----------------------------------------------------------------------

  it("derives boolean flags from otherFeatures", () => {
    const p = normalizeProperty(
      makeRawListing({
        otherFeatures: ["Parking", "Garaža", "Novogradnja"],
      }),
    );
    expect(p!.hasTerrace).toBe(false);
    expect(p!.hasElevator).toBe(false);
    expect(p!.hasParking).toBe(true);
    expect(p!.hasGarage).toBe(true);
    expect(p!.isNewConstruction).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Registration status
  // -----------------------------------------------------------------------

  it("derives registration status from otherFeatures", () => {
    expect(
      normalizeProperty(makeRawListing({ otherFeatures: ["Uknjižen"] }))!
        .registrationStatus,
    ).toBe("registered");
    expect(
      normalizeProperty(makeRawListing({ otherFeatures: ["Neuknjiživ"] }))!
        .registrationStatus,
    ).toBe("unregisterable");
    expect(
      normalizeProperty(makeRawListing({ otherFeatures: ["U fazi knjiženja"] }))!
        .registrationStatus,
    ).toBe("in_progress");
    expect(
      normalizeProperty(makeRawListing({ otherFeatures: [] }))!
        .registrationStatus,
    ).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Location helpers
  // -----------------------------------------------------------------------

  it("builds address from street + number", () => {
    const p = normalizeProperty(
      makeRawListing({ property_street: "Knez Mihailova", property_street_number: "5" }),
    );
    expect(p!.address).toBe("Knez Mihailova 5");
  });

  it("falls back to city when street is missing", () => {
    const p = normalizeProperty(
      makeRawListing({ property_street: undefined, property_street_number: undefined }),
    );
    expect(p!.address).toBe("Beograd");
  });

  it("builds locationLabel with hood", () => {
    const p = normalizeProperty(makeRawListing({ property_hood: "Dorćol" }));
    expect(p!.locationLabel).toBe("Beograd, Dorćol");
  });

  it("builds locationLabel without hood", () => {
    const p = normalizeProperty(makeRawListing({ property_hood: undefined }));
    expect(p!.locationLabel).toBe("Beograd");
  });

  // -----------------------------------------------------------------------
  // Images
  // -----------------------------------------------------------------------

  it("builds images with positional order", () => {
    const p = normalizeProperty(
      makeRawListing({ images: ["a.jpg", "b.jpg", "c.jpg"] }),
    );
    expect(p!.images).toEqual([
      { url: "a.jpg", order: 0 },
      { url: "b.jpg", order: 1 },
      { url: "c.jpg", order: 2 },
    ]);
    expect(p!.primaryImage).toEqual({ url: "a.jpg", order: 0 });
  });

  it("sets primaryImage to null when no images", () => {
    const p = normalizeProperty(makeRawListing({ images: [] }));
    expect(p!.images).toEqual([]);
    expect(p!.primaryImage).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Slug generation
  // -----------------------------------------------------------------------

  it("generates slug with Serbian diacritic transliteration", () => {
    const p = normalizeProperty(
      makeRawListing({ property_name: "Kuća sa đakuzijem na Čukarici" }),
    );
    expect(p!.slug).toBe("kuca-sa-djakuzijem-na-cukarici");
  });

  // -----------------------------------------------------------------------
  // Required field rejection
  // -----------------------------------------------------------------------

  it("rejects missing property_id", () => {
    expect(normalizeProperty(makeRawListing({ property_id: undefined }))).toBeNull();
    expect(normalizeProperty(makeRawListing({ property_id: "" }))).toBeNull();
  });

  it("rejects missing property_name", () => {
    expect(normalizeProperty(makeRawListing({ property_name: undefined }))).toBeNull();
  });

  it("rejects missing city", () => {
    expect(normalizeProperty(makeRawListing({ property_city: undefined }))).toBeNull();
  });

  it("rejects missing price", () => {
    expect(normalizeProperty(makeRawListing({ property_price: undefined }))).toBeNull();
    expect(normalizeProperty(makeRawListing({ property_price: "0" }))).toBeNull();
  });

  it("rejects missing id_agent", () => {
    expect(normalizeProperty(makeRawListing({ id_agent: undefined }))).toBeNull();
    expect(normalizeProperty(makeRawListing({ id_agent: "" }))).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Numeric fields parsed by parser as number (not string)
  // -----------------------------------------------------------------------

  it("handles parser returning numbers instead of strings", () => {
    const p = normalizeProperty(
      makeRawListing({
        property_id: 200,
        purpose_id: 2,
        property_price: 250000,
        property_surface: 80,
        property_floors: 4,
        property_construction_year: 2020,
        structure: 2.5,
      }),
    );
    expect(p).not.toBeNull();
    expect(p!.id).toBe("200");
    expect(p!.price).toBe(250000);
    expect(p!.surface).toBe(80);
    expect(p!.totalFloors).toBe(4);
    expect(p!.constructionYear).toBe(2020);
    expect(p!.roomStructure).toBe(2.5);
  });

  // -----------------------------------------------------------------------
  // sourceDeletedFlag preserved (not used for rejection — that's the validator's job)
  // -----------------------------------------------------------------------

  it("preserves sourceDeletedFlag=true without rejecting", () => {
    const p = normalizeProperty(makeRawListing({ deleted: "1" }));
    expect(p).not.toBeNull();
    expect(p!.sourceDeletedFlag).toBe(true);
  });

  it("preserves sourceDeletedFlag=false", () => {
    const p = normalizeProperty(makeRawListing({ deleted: "0" }));
    expect(p!.sourceDeletedFlag).toBe(false);
  });
});
