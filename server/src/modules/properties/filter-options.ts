// ---------------------------------------------------------------------------
// Filter options — the choices the listing filters offer, with counts
//
// Takes the same filters as GET /api/properties (the filter panel as it is
// on screen) and answers, for every choice, how many listings it would find
// together with the rest of the panel, so the frontend can dim and disable
// choices that would find nothing.
//
// - Which places and types are LISTED depends only on the tab (transactionType,
//   newBuild for Novogradnja), so the lists don't jump while the user clicks.
// - Each "any of" group (location, heating, furnished, construction,
//   condition, registration) is counted WITHOUT its own selection: picking
//   "Centralno" must not dim "Gas", and another city must stay pickable.
// - Property types are counted with the location and price only (see below).
// - "All of" groups (feature, equipment) are counted WITH every selection:
//   after picking Lift, a feature no listing with a lift has gets 0.
//
// Built from the runtime dataset on each request — a few hundred properties
// and a handful of passes, so it stays well under a millisecond.
// ---------------------------------------------------------------------------

import type { Property } from "../shared/models.js";
import { getProperties } from "../shared/cache.js";
import { parseListingQuery } from "./query.js";
import type { PropertyListingQuery } from "./query.js";
import { hasPublicFeature, matchesConstruction, matchesFilters } from "./service.js";

// A query with no filters at all (the defaults of an empty query string)
const EMPTY_QUERY: PropertyListingQuery = (() => {
  const parsed = parseListingQuery({});
  if (!parsed.ok) throw new Error("the empty listing query must parse");
  return parsed.query;
})();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TypeOption {
  key: string;
  count: number;
}

export interface HoodOption {
  name: string;
  count: number;
}

export interface CityOption {
  name: string;
  count: number;
  hoods: HoodOption[];
}

export type KeyCounts = Record<string, number>;

export interface FilterCounts {
  feature: KeyCounts;
  equipment: KeyCounts;
  heating: KeyCounts;
  furnished: KeyCounts;
  construction: KeyCounts;
  condition: KeyCounts;
  registration: KeyCounts;
}

export interface FilterOptions {
  propertyTypes: TypeOption[];
  cities: CityOption[];
  counts: FilterCounts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Serbian alphabetical order (č, ć, đ, š, ž in their proper places)
const collator = new Intl.Collator("sr-Latn", { sensitivity: "base" });

const CONSTRUCTION_KEYS = ["new", "under_construction", "old"];

function bump(counts: KeyCounts, key: string | null): void {
  if (key) counts[key] = (counts[key] ?? 0) + 1;
}

function countBy(properties: Property[], keysOf: (p: Property) => (string | null)[]): KeyCounts {
  const counts: KeyCounts = {};
  for (const p of properties) {
    new Set(keysOf(p)).forEach((key) => bump(counts, key));
  }
  return counts;
}

function isNewBuild(p: Property): boolean {
  return matchesConstruction(p, "new") || matchesConstruction(p, "under_construction");
}

interface Bucket {
  name: string; // the first spelling seen; names are grouped case-insensitively
  total: number; // all listings of the tab — decides city order
  count: number; // listings that match the panel (without its location)
}

function bucketFor(map: Map<string, Bucket>, name: string): Bucket {
  const key = name.toLowerCase();
  let bucket = map.get(key);
  if (!bucket) {
    bucket = { name, total: 0, count: 0 };
    map.set(key, bucket);
  }
  return bucket;
}

// ---------------------------------------------------------------------------
// Building the options
// ---------------------------------------------------------------------------

export function buildFilterOptions(
  properties: Property[],
  query: PropertyListingQuery,
): FilterOptions {
  // The tab decides what is listed at all
  const tab = properties.filter(
    (p) =>
      (!query.transactionType || p.transactionType === query.transactionType) &&
      (!query.newBuild || isNewBuild(p)),
  );

  // Listings matching the whole panel, with some selections left out
  const matching = (without: Partial<PropertyListingQuery>): Property[] => {
    const q = { ...query, ...without };
    return tab.filter((p) => matchesFilters(p, q));
  };

  // --- Property types: listed if present in the tab ---
  // Counted only with the location and the price: switching the type clears
  // everything else that doesn't fit the new type (rooms for a plot, Terasa,
  // the m² ↔ ares area…), so those must not block the switch.
  const typeTotals = countBy(tab, (p) => [p.propertyTypeKey]);
  const typeQuery: PropertyListingQuery = {
    ...EMPTY_QUERY,
    transactionType: query.transactionType,
    newBuild: query.newBuild,
    city: query.city,
    hoods: query.hoods,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
  };
  const typeMatches = countBy(
    tab.filter((p) => matchesFilters(p, typeQuery)),
    (p) => [p.propertyTypeKey],
  );
  const propertyTypes = Object.keys(typeTotals)
    .sort((a, b) => typeTotals[b] - typeTotals[a] || a.localeCompare(b))
    .map((key) => ({ key, count: typeMatches[key] ?? 0 }));

  // --- Cities → districts: listed from the tab, counted without the location ---
  const cities = new Map<string, Bucket>();
  const hoodsByCity = new Map<string, Map<string, Bucket>>();
  const hoodsOf = (city: string): Map<string, Bucket> => {
    const key = city.toLowerCase();
    let hoods = hoodsByCity.get(key);
    if (!hoods) {
      hoods = new Map();
      hoodsByCity.set(key, hoods);
    }
    return hoods;
  };
  for (const p of tab) {
    bucketFor(cities, p.city).total += 1;
    if (p.hood) bucketFor(hoodsOf(p.city), p.hood).total += 1;
  }
  for (const p of matching({ city: undefined, hoods: [] })) {
    bucketFor(cities, p.city).count += 1;
    if (p.hood) bucketFor(hoodsOf(p.city), p.hood).count += 1;
  }

  // The biggest city first (stable while the panel changes), districts A–Ž
  const cityList = [...cities.values()]
    .sort((a, b) => b.total - a.total || collator.compare(a.name, b.name))
    .map((city) => ({
      name: city.name,
      count: city.count,
      hoods: [...(hoodsByCity.get(city.name.toLowerCase())?.values() ?? [])]
        .sort((a, b) => collator.compare(a.name, b.name))
        .map((hood) => ({ name: hood.name, count: hood.count })),
    }));

  // --- "Više filtera" values ---
  const all = matching({});
  const counts: FilterCounts = {
    feature: countBy(all, (p) => p.featureKeys.filter((k) => hasPublicFeature(p, k))),
    equipment: countBy(all, (p) => p.equipmentKeys),
    heating: countBy(matching({ heating: [] }), (p) => p.heatingKeys),
    furnished: countBy(matching({ furnished: [] }), (p) => [p.furnishedKey]),
    construction: countBy(matching({ construction: [] }), (p) =>
      CONSTRUCTION_KEYS.filter((k) => matchesConstruction(p, k)),
    ),
    condition: countBy(matching({ condition: [] }), (p) => [p.conditionKey]),
    registration: countBy(matching({ registered: false }), (p) => [p.registrationStatus]),
  };

  return { propertyTypes, cities: cityList, counts };
}

export function getFilterOptions(query: PropertyListingQuery): FilterOptions {
  return buildFilterOptions(getProperties(), query);
}
