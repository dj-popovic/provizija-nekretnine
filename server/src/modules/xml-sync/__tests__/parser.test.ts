import { describe, it, expect } from "vitest";
import { parseXmlFeed } from "../parser.js";
import { toRawXmlListing } from "../raw-listing.js";
import { normalizeProperty } from "../normalizer.js";
import { extractAgents } from "../agent-extractor.js";

function feed(listingBody: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><listings><listing>${listingBody}</listing></listings>`;
}

const LISTING = `
  <property_id>9</property_id>
  <purpose_id>2</purpose_id>
  <property_name>ŠIFRA NEKRETNINE: 100009 LEDINCI, KUĆA</property_name>
  <property_city>Novi Sad</property_city>
  <property_type>Kuća</property_type>
  <property_surface>322</property_surface>
  <property_land_surface>60.21</property_land_surface>
  <property_price>250000</property_price>
  <structure>4.5</structure>
  <deleted>0</deleted>
  <id_agent>22</id_agent>
  <agent_name>Marija Ranisavljević</agent_name>
  <agent_phone>0691822652</agent_phone>
`;

describe("parseXmlFeed", () => {
  it("keeps phone numbers as text (leading zero and + preserved)", () => {
    const [local] = parseXmlFeed(feed(LISTING)) as Record<string, unknown>[];
    expect(local.agent_phone).toBe("0691822652");

    const [intl] = parseXmlFeed(
      feed(LISTING.replace("0691822652", "+381605511106")),
    ) as Record<string, unknown>[];
    expect(intl.agent_phone).toBe("+381605511106");
  });

  it("returns all scalar values as strings", () => {
    const [record] = parseXmlFeed(feed(LISTING)) as Record<string, unknown>[];
    expect(record.property_id).toBe("9");
    expect(record.property_price).toBe("250000");
    expect(record.structure).toBe("4.5");
  });

  it("still normalizes numbers and agent phone correctly end-to-end", () => {
    const raw = toRawXmlListing(parseXmlFeed(feed(LISTING))[0]);

    const property = normalizeProperty(raw)!;
    expect(property.price).toBe(250000);
    expect(property.surface).toBe(322);
    expect(property.landSurface).toBe(60.21);
    expect(property.roomStructure).toBe(4.5);

    const [agent] = extractAgents([raw]);
    expect(agent.phone).toBe("0691822652");
  });
});
