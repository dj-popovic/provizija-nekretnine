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
      ["Plac", "plot"],
      ["Poljoprivredno zemljište", "land"],
      ["Garaža", "garage"],
      ["Poslovni prostor", "commercial"],
      ["Kancelarija", "office"],
      ["Vikendica", "house"],
    ];
    for (const [xmlType, expectedKey] of cases) {
      const raw = makeRawListing({
        property_type: xmlType,
        // land types come with surface 0 and only a land surface
        ...(expectedKey === "plot" || expectedKey === "land"
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

  it("keeps land types in ares only — never copies ares into surface (m²)", () => {
    const p = normalizeProperty(
      makeRawListing({
        property_type: "Plac",
        property_surface: "0",
        property_land_surface: "21.06",
      }),
    );
    expect(p).not.toBeNull();
    expect(p!.surface).toBeNull();
    expect(p!.landSurface).toBe(21.06);
  });

  it("keeps house surface (m²) and plot surface (ares) separate", () => {
    const p = normalizeProperty(
      makeRawListing({
        property_type: "Kuća",
        property_surface: "322",
        property_land_surface: "60.21",
      }),
    );
    expect(p!.surface).toBe(322);
    expect(p!.landSurface).toBe(60.21);
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

  it("passes unknown furnishing values through as their own key", () => {
    const p = normalizeProperty(makeRawListing({ furnished: "Delimično" }));
    expect(p!.furnishedKey).toBe("Delimično");
    expect(p!.furnishedLabel).toBe("Delimično");
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

  it("recognizes the garage as RELPER actually sends it ('Garažno mesto')", () => {
    const p = normalizeProperty(makeRawListing({ otherFeatures: ["Garažno mesto"] }));
    expect(p!.hasGarage).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Filter values (#16): old build, condition, equipment keys
  // -----------------------------------------------------------------------

  it("flags 'Stara gradnja' as an old build", () => {
    expect(normalizeProperty(makeRawListing({ otherFeatures: ["Stara gradnja"] }))!.isOldBuild).toBe(true);
    expect(normalizeProperty(makeRawListing({ otherFeatures: ["Novogradnja"] }))!.isOldBuild).toBe(false);
  });

  it("derives the condition key; Renoviran wins over the others", () => {
    const condition = (values: string[]) =>
      normalizeProperty(makeRawListing({ otherFeatures: values }))!.conditionKey;
    expect(condition(["Izvorno stanje"])).toBe("original");
    expect(condition(["za adaptaciju"])).toBe("needs_renovation");
    expect(condition(["Izvorno stanje", "Renoviran"])).toBe("renovated");
    expect(condition(["Lift"])).toBeNull();
  });

  it("maps equipment to keys case-insensitively and drops unknown values", () => {
    const p = normalizeProperty(
      makeRawListing({ equipment: ["Klima", "video nadzor", "Video interfon", "Veš mašina"] }),
    );
    expect(p!.equipmentKeys).toEqual(["air_conditioning", "video_surveillance", "video_intercom"]);
    expect(p!.equipment).toContain("Veš mašina"); // raw list stays complete
  });

  // -----------------------------------------------------------------------
  // Feature keys (kvadratići)
  // -----------------------------------------------------------------------

  it("maps <other> values to feature keys and drops non-feature values", () => {
    const p = normalizeProperty(
      makeRawListing({
        otherFeatures: [
          "Penthouse", "Lift", "Garažno mesto", "Gradska", "Gradska kanalizacija",
          "Asfaltni put", "Građevinska", "Može na kredit",
          "Uknjižen", "Nije prizemlje", "Stara gradnja",
        ],
      }),
    );
    expect(p!.featureKeys).toEqual([
      "penthouse", "elevator", "garage_space", "city_water", "city_sewage",
      "paved_road", "building_permit", "mortgage_eligible",
    ]);
  });

  it("matches feature values case-insensitively (unconfirmed RELPER spelling)", () => {
    const p = normalizeProperty(
      makeRawListing({ otherFeatures: ["Pet Friendly", "u izgradnji"] }),
    );
    expect(p!.featureKeys).toEqual(["pet_friendly", "under_construction"]);
  });

  it("does not duplicate a key when two XML values map to it", () => {
    const p = normalizeProperty(makeRawListing({ otherFeatures: ["Garaža", "Garažno mesto"] }));
    expect(p!.featureKeys).toEqual(["garage_space"]);
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
  // Title / property code ("šifra") — formats seen in the real feed
  // -----------------------------------------------------------------------

  it("splits the code off the title in all known formats", () => {
    const cases: [string, string, string][] = [
      ["ŠIFRA NEKRETNINE: 100009 SREMSKA KAMENICA, LEDINCI, KUĆA 322 m2", "100009", "SREMSKA KAMENICA, LEDINCI, KUĆA 322 m2"],
      ["ŠIFRA NEKRETNINE: 100043, BANOŠTOR, GRAĐEVINSKA PARCELA", "100043", "BANOŠTOR, GRAĐEVINSKA PARCELA"],
      ["ŠIFRA OGLASA: 100021, NOVI SAD, NOVA DETELINARA", "100021", "NOVI SAD, NOVA DETELINARA"],
      ["ŠIFRA NEKRETNINE: 592 , IZDAJEMO LUX DVOIPOSOBAN STAN", "592", "IZDAJEMO LUX DVOIPOSOBAN STAN"],
    ];
    for (const [name, code, title] of cases) {
      const p = normalizeProperty(makeRawListing({ property_name: name }));
      expect(p!.code).toBe(code);
      expect(p!.title).toBe(title);
    }
  });

  it("keeps the title as-is and code null when there is no code prefix", () => {
    const p = normalizeProperty(makeRawListing({ property_name: "Prodaja, Stan, Novi Sad, Centar" }));
    expect(p!.code).toBeNull();
    expect(p!.title).toBe("Prodaja, Stan, Novi Sad, Centar");
  });

  it("falls back to '<type>, <location>' when the title is only the code", () => {
    const p = normalizeProperty(makeRawListing({ property_name: "ŠIFRA NEKRETNINE: 100025," }));
    expect(p!.code).toBe("100025");
    expect(p!.title).toBe("Stan, Beograd, Vračar");
  });

  it("builds the slug from the cleaned title", () => {
    const p = normalizeProperty(
      makeRawListing({ property_name: "ŠIFRA NEKRETNINE: 100043, BANOŠTOR, GRAĐEVINSKA PARCELA" }),
    );
    expect(p!.slug).toBe("banostor-gradjevinska-parcela");
  });

  // -----------------------------------------------------------------------
  // Floor and heating keys
  // -----------------------------------------------------------------------

  it("normalizes floor 'pr' to 'ground' and keeps numbers", () => {
    expect(normalizeProperty(makeRawListing({ property_floor: "pr" }))!.floor).toBe("ground");
    expect(normalizeProperty(makeRawListing({ property_floor: "5" }))!.floor).toBe("5");
    expect(normalizeProperty(makeRawListing({ property_floor: undefined }))!.floor).toBeNull();
  });

  it("maps heating values to keys and passes unknown ones through", () => {
    const p = normalizeProperty(
      makeRawListing({ heating: ["Centralno", "Podno", "TA", "Toplotna pumpa"] }),
    );
    expect(p!.heatingKeys).toEqual(["central", "underfloor", "storage_heater", "Toplotna pumpa"]);
    expect(p!.heating).toEqual(["Centralno", "Podno", "TA", "Toplotna pumpa"]);
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

  it("marks the symbolic 1 € price as 'cena na upit'", () => {
    expect(normalizeProperty(makeRawListing({ property_price: "1" }))!.priceOnRequest).toBe(true);
    expect(normalizeProperty(makeRawListing({ property_price: "150000" }))!.priceOnRequest).toBe(false);
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
