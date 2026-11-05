import { describe, it, expect } from "vitest";
import {
  validateAdvertisePropertyPayload,
  composeAdvertisePropertyEmail,
} from "../advertise-property.js";
import { validateContactPayload, composeContactEmail } from "../contact.js";
import { validateAgentInquiryPayload, composeAgentInquiryEmail } from "../agent-inquiry.js";
import { validatePropertyInquiryPayload } from "../property-inquiry.js";

function advertiseBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    transactionType: "sale",
    propertyType: "apartment",
    city: "Novi Sad",
    area: 64,
    rooms: "Garsonjera",
    expectedPrice: 185000,
    priceType: "negotiable",
    description: "Stan je renoviran.",
    fullName: "Pera Perić",
    phone: "0641112233",
    email: "pera@example.com",
    ...overrides,
  };
}

function fieldsOf(errors: { field: string }[]): string[] {
  return errors.map((e) => e.field);
}

describe("advertise-property validation", () => {
  it("accepts a studio (rooms as the Serbian option text) and a floor label", () => {
    const { data, errors } = validateAdvertisePropertyPayload(
      advertiseBody({ floor: "Poslednji sprat", features: ["lift", "airConditioning", "lift"] }),
    );
    expect(errors).toEqual([]);
    expect(data!.rooms).toBe("Garsonjera");
    expect(data!.floor).toBe("Poslednji sprat");
    expect(data!.features).toEqual(["lift", "airConditioning"]);
  });

  it("rejects unknown keys for transaction type, property type, price type and features", () => {
    const { errors } = validateAdvertisePropertyPayload(
      advertiseBody({ transactionType: "Prodaja", propertyType: "toString", priceType: "x", features: ["sauna"] }),
    );
    expect(fieldsOf(errors)).toEqual(["transactionType", "propertyType", "priceType", "features"]);
  });

  it("requires rooms as text (a number is no longer accepted)", () => {
    expect(fieldsOf(validateAdvertisePropertyPayload(advertiseBody({ rooms: 3 })).errors)).toEqual(["rooms"]);
    expect(fieldsOf(validateAdvertisePropertyPayload(advertiseBody({ rooms: "" })).errors)).toEqual(["rooms"]);
  });

  it("rejects an unsupported visitor language", () => {
    expect(fieldsOf(validateAdvertisePropertyPayload(advertiseBody({ lang: "de" })).errors)).toEqual(["lang"]);
    expect(fieldsOf(validateAdvertisePropertyPayload(advertiseBody({ lang: "constructor" })).errors)).toEqual(["lang"]);
  });
});

describe("advertise-property e-mail", () => {
  it("shows Serbian labels instead of API keys, plus the visitor language", () => {
    const { data } = validateAdvertisePropertyPayload(
      advertiseBody({ floor: "3. sprat", features: ["terrace", "airConditioning"], lang: "ru" }),
    );
    const email = composeAdvertisePropertyEmail(data!);

    expect(email.subject).toBe("Novi oglas za nekretninu: Stan — Novi Sad");
    for (const text of ["Prodaja", "Po dogovoru", "Terasa, Klima", "Garsonjera", "3. sprat", "Jezik posetioca", "ruski"]) {
      expect(email.html).toContain(text);
    }
    for (const key of ["sale", "negotiable", "terrace", "airConditioning"]) {
      expect(email.html).not.toContain(">" + key);
    }
  });

  it("accepts every listing type key and shows its Serbian label", () => {
    const labels: Record<string, string> = {
      retail: "Lokal",
      hospitality: "Ugostiteljski objekat",
      warehouse: "Hala",
      plot: "Građevinsko zemljište",
      farmland: "Poljoprivredno zemljište",
      industrial_land: "Industrijsko zemljište",
    };
    for (const [key, label] of Object.entries(labels)) {
      const { data, errors } = validateAdvertisePropertyPayload(advertiseBody({ propertyType: key }));
      expect(errors).toEqual([]);
      expect(composeAdvertisePropertyEmail(data!).subject).toBe(`Novi oglas za nekretninu: ${label} — Novi Sad`);
    }
    expect(fieldsOf(validateAdvertisePropertyPayload(advertiseBody({ propertyType: "land" })).errors)).toEqual(["propertyType"]);
  });

  it("ignores fields that don't fit the type: no rooms for a garage, ares for land", () => {
    const garage = validateAdvertisePropertyPayload(
      advertiseBody({ propertyType: "garage", rooms: undefined, floor: "1. sprat", heating: "Gas", yearBuilt: 2000, features: ["lift"] }),
    );
    expect(garage.errors).toEqual([]);
    expect([garage.data!.rooms, garage.data!.floor, garage.data!.heating, garage.data!.yearBuilt]).toEqual([null, null, null, null]);
    expect(garage.data!.features).toEqual([]);
    const garageHtml = composeAdvertisePropertyEmail(garage.data!).html;
    expect(garageHtml).not.toContain("Sobe");
    expect(garageHtml).toContain("64 m²");

    const plot = validateAdvertisePropertyPayload(advertiseBody({ propertyType: "plot", rooms: "Garsonjera", area: 6 }));
    expect(plot.data!.rooms).toBeNull();
    expect(composeAdvertisePropertyEmail(plot.data!).html).toContain("6 ar");

    // Commercial space keeps rooms + floor; an apartment still needs rooms
    const office = validateAdvertisePropertyPayload(advertiseBody({ propertyType: "commercial", floor: "2. sprat" }));
    expect([office.data!.rooms, office.data!.floor]).toEqual(["Garsonjera", "2. sprat"]);
    expect(fieldsOf(validateAdvertisePropertyPayload(advertiseBody({ rooms: undefined })).errors)).toEqual(["rooms"]);
  });

  it("has no language row when the form didn't send one", () => {
    const { data } = validateAdvertisePropertyPayload(advertiseBody());
    expect(composeAdvertisePropertyEmail(data!).html).not.toContain("Jezik posetioca");
  });
});

describe("visitor language on the other forms", () => {
  const person = { fullName: "Pera Perić", phone: "0641112233", email: "pera@example.com", message: "Zdravo" };

  it("contact form e-mail gets the language row", () => {
    const { data, errors } = validateContactPayload({
      firstName: "Pera", lastName: "Perić", phone: "0641112233", email: "pera@example.com",
      subject: "Kupovina nekretnine", message: "Zdravo", lang: "en",
    });
    expect(errors).toEqual([]);
    const html = composeContactEmail(data!).html;
    expect(html).toContain("Jezik posetioca");
    expect(html).toContain("engleski");
  });

  it("agent inquiry e-mail gets the language row", () => {
    const { data } = validateAgentInquiryPayload({ agentId: "22", ...person, lang: "sr" });
    expect(composeAgentInquiryEmail(data!, "Marija").html).toContain("srpski");
  });

  it("property inquiry validates lang", () => {
    expect(validatePropertyInquiryPayload({ propertyId: "1", ...person, lang: "ru" }).errors).toEqual([]);
    expect(fieldsOf(validatePropertyInquiryPayload({ propertyId: "1", ...person, lang: 5 }).errors)).toEqual(["lang"]);
  });
});
