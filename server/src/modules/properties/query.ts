// ---------------------------------------------------------------------------
// Property listing query model
//
// Parses, validates, and normalizes query params for GET /api/properties.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortOption = "newest" | "priceAsc" | "priceDesc";

export interface PropertyListingQuery {
  // Filters
  transactionType: string | undefined;
  propertyType: string | undefined;
  location: string | undefined;
  rooms: number | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
  areaMin: number | undefined;
  areaMax: number | undefined;

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

  const transactionType = parseOptionalString(raw.transactionType);
  const propertyType = parseOptionalString(raw.propertyType);
  const location = parseOptionalString(raw.location);

  const rooms = parseOptionalPositiveNumber(raw.rooms, "rooms", errors);
  const priceMin = parseOptionalNonNegativeNumber(raw.priceMin, "priceMin", errors);
  const priceMax = parseOptionalNonNegativeNumber(raw.priceMax, "priceMax", errors);
  const areaMin = parseOptionalNonNegativeNumber(raw.areaMin, "areaMin", errors);
  const areaMax = parseOptionalNonNegativeNumber(raw.areaMax, "areaMax", errors);

  // Range validation: min must not exceed max
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    errors.push({ field: "priceMin", message: "priceMin must not exceed priceMax." });
  }
  if (areaMin !== undefined && areaMax !== undefined && areaMin > areaMax) {
    errors.push({ field: "areaMin", message: "areaMin must not exceed areaMax." });
  }

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
      propertyType,
      location,
      rooms,
      priceMin,
      priceMax,
      areaMin,
      areaMax,
      sort,
      page,
      pageSize,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

function parseOptionalPositiveNumber(
  value: unknown,
  field: string,
  errors: QueryValidationError[],
): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  if (!isFinite(num) || num <= 0) {
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
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  if (!isFinite(num) || num < 0) {
    errors.push({ field, message: `${field} must be a non-negative number.` });
    return undefined;
  }
  return num;
}

function parseSort(value: unknown, errors: QueryValidationError[]): SortOption {
  if (value === null || value === undefined || value === "") return DEFAULT_SORT;
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
  if (value === null || value === undefined || value === "") return defaultValue;
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
  if (value === null || value === undefined || value === "") return DEFAULT_PAGE_SIZE;
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
