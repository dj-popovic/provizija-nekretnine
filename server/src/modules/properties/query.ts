// ---------------------------------------------------------------------------
// Property listing query model
//
// Parses, validates, and normalizes query params for GET /api/properties.
// ---------------------------------------------------------------------------

import { FEATURE_KEYS, EQUIPMENT_KEYS } from "../xml-sync/normalizer.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortOption = "newest" | "priceAsc" | "priceDesc";

export interface PropertyListingQuery {
  // Filters
  transactionType: string | undefined;
  propertyTypes: string[]; // empty = all types; several = any of them ("Poslovni prostor" = commercial + office)
  city: string | undefined;
  hoods: string[]; // districts of `city`; empty = the whole city
  roomsMin: number | undefined;
  roomsMax: number | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
  areaMin: number | undefined; // m²
  areaMax: number | undefined;
  landAreaMin: number | undefined; // ares
  landAreaMax: number | undefined;

  // "Više filtera" (#16)
  newBuild: boolean; // Novogradnja tab: new builds and buildings under construction
  bathroomsMin: number | undefined;
  floorMin: number | undefined; // prizemlje = 0; apartments only
  floorMax: number | undefined;
  notGroundFloor: boolean;
  notTopFloor: boolean;
  yearMin: number | undefined; // construction year
  yearMax: number | undefined;
  heating: string[]; // any of
  furnished: string[]; // any of
  construction: string[]; // any of: new | under_construction | old
  condition: string[]; // any of: original | renovated | needs_renovation
  registered: boolean;
  features: string[]; // all of (feature-chip keys)
  equipment: string[]; // all of

  // Sorting
  sort: SortOption;

  // Pagination
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_SORT_OPTIONS: ReadonlySet<string> = new Set([
  "newest",
  "priceAsc",
  "priceDesc",
]);

const DEFAULT_SORT: SortOption = "newest";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

// A repeated param (?hood=a&hood=b) may carry at most this many values
const MAX_LIST_VALUES = 50;

export const CONSTRUCTION_VALUES: ReadonlySet<string> = new Set(["new", "under_construction", "old"]);
export const CONDITION_VALUES: ReadonlySet<string> = new Set(["original", "renovated", "needs_renovation"]);

// ---------------------------------------------------------------------------
// Validation error
// ---------------------------------------------------------------------------

export interface QueryValidationError {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parses and validates raw query string params into a PropertyListingQuery.
 * Returns either a valid query or an array of validation errors.
 */
export function parseListingQuery(
  raw: Record<string, unknown>,
): { ok: true; query: PropertyListingQuery } | { ok: false; errors: QueryValidationError[] } {
  const errors: QueryValidationError[] = [];

  // --- Filters ---

  const transactionType = parseOptionalString(raw.transactionType, "transactionType", errors);
  const propertyTypes = parseStringList(raw.propertyType, "propertyType", errors);
  const city = parseOptionalString(raw.city, "city", errors);
  const hoods = parseStringList(raw.hood, "hood", errors);

  // A district name is only unique within its city ("Okolina" exists in several)
  if (hoods.length > 0 && city === undefined) {
    errors.push({ field: "hood", message: "hood requires city." });
  }

  const roomsMin = parseOptionalPositiveNumber(raw.roomsMin, "roomsMin", errors);
  const roomsMax = parseOptionalPositiveNumber(raw.roomsMax, "roomsMax", errors);
  const priceMin = parseOptionalNonNegativeNumber(raw.priceMin, "priceMin", errors);
  const priceMax = parseOptionalNonNegativeNumber(raw.priceMax, "priceMax", errors);
  const areaMin = parseOptionalNonNegativeNumber(raw.areaMin, "areaMin", errors);
  const areaMax = parseOptionalNonNegativeNumber(raw.areaMax, "areaMax", errors);
  const landAreaMin = parseOptionalNonNegativeNumber(raw.landAreaMin, "landAreaMin", errors);
  const landAreaMax = parseOptionalNonNegativeNumber(raw.landAreaMax, "landAreaMax", errors);

  // Range validation: min must not exceed max
  checkRange(roomsMin, roomsMax, "roomsMin", "roomsMax", errors);
  checkRange(priceMin, priceMax, "priceMin", "priceMax", errors);
  checkRange(areaMin, areaMax, "areaMin", "areaMax", errors);
  checkRange(landAreaMin, landAreaMax, "landAreaMin", "landAreaMax", errors);

  // --- "Više filtera" ---

  const newBuild = parseFlag(raw.newBuild, "newBuild", errors);
  const bathroomsMin = parseOptionalPositiveNumber(raw.bathroomsMin, "bathroomsMin", errors);
  const floorMin = parseOptionalNonNegativeNumber(raw.floorMin, "floorMin", errors);
  const floorMax = parseOptionalNonNegativeNumber(raw.floorMax, "floorMax", errors);
  const notGroundFloor = parseFlag(raw.notGroundFloor, "notGroundFloor", errors);
  const notTopFloor = parseFlag(raw.notTopFloor, "notTopFloor", errors);
  const yearMin = parseOptionalNonNegativeNumber(raw.yearMin, "yearMin", errors);
  const yearMax = parseOptionalNonNegativeNumber(raw.yearMax, "yearMax", errors);
  checkRange(floorMin, floorMax, "floorMin", "floorMax", errors);
  checkRange(yearMin, yearMax, "yearMin", "yearMax", errors);

  // Heating / furnishing keys pass unknown XML values through, so any value is accepted
  const heating = parseStringList(raw.heating, "heating", errors);
  const furnished = parseStringList(raw.furnished, "furnished", errors);
  const construction = parseKeyList(raw.construction, "construction", CONSTRUCTION_VALUES, errors);
  const condition = parseKeyList(raw.condition, "condition", CONDITION_VALUES, errors);
  const registered = parseFlag(raw.registered, "registered", errors);
  const features = parseKeyList(raw.feature, "feature", FEATURE_KEYS, errors);
  const equipment = parseKeyList(raw.equipment, "equipment", EQUIPMENT_KEYS, errors);

  // --- Sort ---

  const sort = parseSort(raw.sort, errors);

  // --- Pagination ---

  const page = parsePageParam(raw.page, "page", DEFAULT_PAGE, errors);
  const pageSize = parsePageSizeParam(raw.pageSize, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    query: {
      transactionType,
      propertyTypes,
      city,
      hoods,
      roomsMin,
      roomsMax,
      priceMin,
      priceMax,
      areaMin,
      areaMax,
      landAreaMin,
      landAreaMax,
      newBuild,
      bathroomsMin,
      floorMin,
      floorMax,
      notGroundFloor,
      notTopFloor,
      yearMin,
      yearMax,
      heating,
      furnished,
      construction,
      condition,
      registered,
      features,
      equipment,
      sort,
      page,
      pageSize,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/** A single-value param; repeating it (?city=a&city=b) is an error. */
export function parseOptionalString(
  value: unknown,
  field: string,
  errors: QueryValidationError[],
): string | undefined {
  if (isEmpty(value)) return undefined;
  if (Array.isArray(value)) {
    errors.push({ field, message: `${field} must be a single value.` });
    return undefined;
  }
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

/** A param that may repeat (?hood=a&hood=b). Blank values are dropped, duplicates merged. */
export function parseStringList(
  value: unknown,
  field: string,
  errors: QueryValidationError[],
): string[] {
  if (isEmpty(value)) return [];
  const values = (Array.isArray(value) ? value : [value])
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
  if (values.length > MAX_LIST_VALUES) {
    errors.push({ field, message: `${field} accepts at most ${MAX_LIST_VALUES} values.` });
    return [];
  }
  return [...new Set(values)];
}

/** A repeatable param whose values must come from a fixed key set. */
function parseKeyList(
  value: unknown,
  field: string,
  allowed: ReadonlySet<string>,
  errors: QueryValidationError[],
): string[] {
  const values = parseStringList(value, field, errors);
  const unknown = values.filter((v) => !allowed.has(v));
  if (unknown.length > 0) {
    errors.push({ field, message: `Unknown ${field} value(s): ${unknown.join(", ")}.` });
    return [];
  }
  return values;
}

/** A yes/no switch: "true" / "1" turn it on; "false" / "0" / absent leave it off. */
export function parseFlag(
  value: unknown,
  field: string,
  errors: QueryValidationError[],
): boolean {
  if (isEmpty(value)) return false;
  if (Array.isArray(value)) {
    errors.push({ field, message: `${field} must be a single value.` });
    return false;
  }
  const str = String(value).trim().toLowerCase();
  if (str === "true" || str === "1") return true;
  if (str === "false" || str === "0") return false;
  errors.push({ field, message: `${field} must be true or false.` });
  return false;
}

function parseNumber(
  value: unknown,
  field: string,
  errors: QueryValidationError[],
): number | undefined {
  if (isEmpty(value)) return undefined;
  if (Array.isArray(value)) {
    errors.push({ field, message: `${field} must be a single value.` });
    return undefined;
  }
  const num = Number(value);
  if (!isFinite(num)) {
    errors.push({ field, message: `${field} must be a number.` });
    return undefined;
  }
  return num;
}

function parseOptionalPositiveNumber(
  value: unknown,
  field: string,
  errors: QueryValidationError[],
): number | undefined {
  const num = parseNumber(value, field, errors);
  if (num === undefined) return undefined;
  if (num <= 0) {
    errors.push({ field, message: `${field} must be a positive number.` });
    return undefined;
  }
  return num;
}

function parseOptionalNonNegativeNumber(
  value: unknown,
  field: string,
  errors: QueryValidationError[],
): number | undefined {
  const num = parseNumber(value, field, errors);
  if (num === undefined) return undefined;
  if (num < 0) {
    errors.push({ field, message: `${field} must be a non-negative number.` });
    return undefined;
  }
  return num;
}

function checkRange(
  min: number | undefined,
  max: number | undefined,
  minField: string,
  maxField: string,
  errors: QueryValidationError[],
): void {
  if (min !== undefined && max !== undefined && min > max) {
    errors.push({ field: minField, message: `${minField} must not exceed ${maxField}.` });
  }
}

function parseSort(value: unknown, errors: QueryValidationError[]): SortOption {
  if (isEmpty(value)) return DEFAULT_SORT;
  const str = String(value).trim();
  if (!VALID_SORT_OPTIONS.has(str)) {
    errors.push({
      field: "sort",
      message: `Invalid sort value. Allowed: ${[...VALID_SORT_OPTIONS].join(", ")}.`,
    });
    return DEFAULT_SORT;
  }
  return str as SortOption;
}

function parsePageParam(
  value: unknown,
  field: string,
  defaultValue: number,
  errors: QueryValidationError[],
): number {
  if (isEmpty(value)) return defaultValue;
  const num = parseInt(String(value), 10);
  if (isNaN(num) || num < 1) {
    errors.push({ field, message: `${field} must be a positive integer.` });
    return defaultValue;
  }
  return num;
}

function parsePageSizeParam(
  value: unknown,
  errors: QueryValidationError[],
): number {
  if (isEmpty(value)) return DEFAULT_PAGE_SIZE;
  const num = parseInt(String(value), 10);
  if (isNaN(num) || num < 1) {
    errors.push({ field: "pageSize", message: "pageSize must be a positive integer." });
    return DEFAULT_PAGE_SIZE;
  }
  if (num > MAX_PAGE_SIZE) {
    errors.push({ field: "pageSize", message: `pageSize must not exceed ${MAX_PAGE_SIZE}.` });
    return DEFAULT_PAGE_SIZE;
  }
  return num;
}
